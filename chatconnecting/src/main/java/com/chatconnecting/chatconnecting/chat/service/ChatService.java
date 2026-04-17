package com.chatconnecting.chatconnecting.chat.service;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.ChatRoomRepository;
import com.chatconnecting.chatconnecting.chat.ChatRoomType;
import com.chatconnecting.chatconnecting.chat.dto.ChatRoomMemberResponse;
import com.chatconnecting.chatconnecting.chat.dto.ChatRoomResponse;
import com.chatconnecting.chatconnecting.chat.dto.CreateGroupRequest;
import com.chatconnecting.chatconnecting.chat.dto.RoomEventResponse;
import com.chatconnecting.chatconnecting.chat.dto.UpdateGroupMembersRequest;
import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.message.Message;
import com.chatconnecting.chatconnecting.message.MessageRepository;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import com.chatconnecting.chatconnecting.message.StoredMessageContent;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.user.UserRepository;
import com.chatconnecting.chatconnecting.websocket.PresenceService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@SuppressWarnings("deprecation")
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final String ROOM_EVENTS_DESTINATION = "/queue/rooms";

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<UserChatSummaryResponse> getSidebarUsers(String currentEmail) {
        User currentUser = getUserByEmail(currentEmail);
        List<UserChatSummaryResponse> summaries = new ArrayList<>();

        for (User user : userRepository.findAllByIdNot(currentUser.getId())) {
            summaries.add(buildDirectSummary(currentUser, user));
        }

        for (ChatRoom room : chatRoomRepository.findGroupRoomsForUser(currentUser.getId())) {
            summaries.add(buildGroupSummary(currentUser, room));
        }

        summaries.sort(
                Comparator.comparing(
                        UserChatSummaryResponse::getLastMessageAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                )
                        .thenComparing(summary -> String.valueOf(summary.getName()), String.CASE_INSENSITIVE_ORDER)
        );
        return summaries;
    }

    @Transactional
    public ChatRoomResponse getOrCreateChatRoom(String currentEmail, Long participantId) {
        User currentUser = getUserByEmail(currentEmail);
        log.info("Get/create direct chat room: currentUserId={}, participantId={}", currentUser.getId(), participantId);

        ChatRoom room = getOrCreateRoom(currentUser, participantId);
        return toRoomResponse(room, currentUser);
    }

    @Transactional
    public ChatRoomResponse createGroup(String currentEmail, CreateGroupRequest request) {
        User currentUser = getUserByEmail(currentEmail);
        String groupName = normalizeGroupName(request.getName());
        Set<User> members = resolveGroupMembers(currentUser, request.getMemberIds());
        log.info(
                "Creating group: creatorId={}, name={}, memberIds={}",
                currentUser.getId(),
                groupName,
                members.stream().map(User::getId).toList()
        );

        ChatRoom room = ChatRoom.builder()
                .roomType(ChatRoomType.GROUP)
                .name(groupName)
                .admin(currentUser)
                .members(members)
                .build();

        ChatRoom saved = chatRoomRepository.saveAndFlush(room);
        log.info(
                "Group created: roomId={}, adminId={}, members={}",
                saved.getId(),
                currentUser.getId(),
                saved.getParticipants().stream().map(User::getId).toList()
        );
        notifyRoomParticipants("groupCreated", saved, saved.getParticipants(), null);
        return toRoomResponse(saved, currentUser);
    }

    @Transactional
    public ChatRoomResponse addUsersToGroup(String currentEmail, Long chatRoomId, UpdateGroupMembersRequest request) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        requireGroupRoom(room);
        requireGroupAdmin(room, currentUser);

        Set<User> members = room.getMembers();
        boolean changed = false;
        for (User member : resolveUsers(request.getMemberIds())) {
            if (member.getId().equals(currentUser.getId())) {
                continue;
            }
            changed |= members.add(member);
        }

        if (!changed) {
            return toRoomResponse(room, currentUser);
        }

        ChatRoom saved = chatRoomRepository.saveAndFlush(room);
        notifyRoomParticipants("groupUpdated", saved, saved.getParticipants(), null);
        return toRoomResponse(saved, currentUser);
    }

    @Transactional
    public ChatRoomResponse removeUserFromGroup(String currentEmail, Long chatRoomId, Long memberId) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        requireGroupRoom(room);
        requireGroupAdmin(room, currentUser);

        if (memberId == null) {
            throw new BadRequestException("Member id is required");
        }
        if (room.getAdmin() != null && memberId.equals(room.getAdmin().getId())) {
            throw new BadRequestException("The group admin cannot be removed");
        }

        User removedUser = room.getMembers().stream()
                .filter(member -> memberId.equals(member.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Group member not found"));

        room.getMembers().remove(removedUser);
        ChatRoom saved = chatRoomRepository.saveAndFlush(room);

        notifyRoomParticipants("groupUpdated", saved, saved.getParticipants(), removedUser.getId());
        notifyRoomParticipants("groupRemovedForUser", saved, List.of(removedUser), removedUser.getId());
        return toRoomResponse(saved, currentUser);
    }

    @Transactional
    public ChatRoomResponse leaveGroup(String currentEmail, Long chatRoomId) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        requireGroupRoom(room);

        User admin = room.getAdmin();
        boolean isAdminLeavingGroup = admin != null && admin.getId().equals(currentUser.getId());

        room.getMembers().remove(currentUser);

        // If admin leaves, assign new admin automatically from remaining members
        if (isAdminLeavingGroup && !room.getMembers().isEmpty()) {
            User newAdmin = room.getMembers().iterator().next();
            room.setAdmin(newAdmin);
            log.info("Group admin left, assigning new admin: roomId={}, oldAdminId={}, newAdminId={}",
                    room.getId(), admin.getId(), newAdmin.getId());
        }

        ChatRoom saved = chatRoomRepository.saveAndFlush(room);

        notifyRoomParticipants("groupUpdated", saved, saved.getParticipants(), currentUser.getId());
        notifyRoomParticipants("groupLeftForUser", saved, List.of(currentUser), currentUser.getId());

        return toRoomResponse(saved, currentUser);
    }

    @Transactional
    public ChatRoomResponse deleteGroup(String currentEmail, Long chatRoomId) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        requireGroupRoom(room);
        requireGroupAdmin(room, currentUser);

        Collection<User> membersCopy = new ArrayList<>(room.getParticipants());

        // Delete messages in the group
        messageRepository.deleteByRoomAndType(room.getId(), ChatRoomType.GROUP);

        // Delete the chat room
        chatRoomRepository.delete(room);
        log.info("Group deleted: roomId={}, adminId={}", room.getId(), currentUser.getId());

        // Notify all members
        RoomEventResponse deleteEvent = RoomEventResponse.builder()
                .eventType("groupDeleted")
                .chatRoomId(room.getId())
                .affectedUserId(null)
                .room(null)
                .build();

        for (User member : membersCopy) {
            messagingTemplate.convertAndSendToUser(
                    resolveUserDestinationKey(member),
                    ROOM_EVENTS_DESTINATION,
                    deleteEvent
            );
        }

        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .roomType(ChatRoomType.GROUP)
                .build();
    }

    @Transactional
    public ChatRoomResponse assignAdmin(String currentEmail, Long chatRoomId, Long newAdminId) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        requireGroupRoom(room);
        requireGroupAdmin(room, currentUser);

        if (newAdminId == null) {
            throw new BadRequestException("New admin ID is required");
        }

        User newAdmin = room.getMembers().stream()
                .filter(member -> newAdminId.equals(member.getId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Selected user is not a group member"));

        if (newAdmin.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You are already the admin of this group");
        }

        room.setAdmin(newAdmin);
        ChatRoom saved = chatRoomRepository.saveAndFlush(room);

        log.info("Admin assigned: roomId={}, oldAdminId={}, newAdminId={}",
                room.getId(), currentUser.getId(), newAdmin.getId());

        notifyRoomParticipants("groupUpdated", saved, saved.getParticipants(), currentUser.getId());
        return toRoomResponse(saved, currentUser);
    }

    @Transactional
    public ChatRoom getOrCreateRoom(User currentUser, Long participantId) {
        validateParticipantId(currentUser.getId(), participantId);
        User participant = userRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Long[] normalizedPair = normalizePair(currentUser.getId(), participant.getId());

        return findRoomBetweenUsers(currentUser.getId(), participant.getId())
                .orElseGet(() -> createRoomWithRaceProtection(currentUser, participant, normalizedPair));
    }

    @Transactional(readOnly = true)
    public ChatRoom getAuthorizedRoom(Long roomId, User currentUser) {
        return chatRoomRepository.findByIdAndParticipant(roomId, currentUser.getId())
                .orElseThrow(() -> new ForbiddenOperationException("You do not have access to this chat room"));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    @Transactional(readOnly = true)
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public Optional<ChatRoom> findRoomBetweenUsers(Long firstUserId, Long secondUserId) {
        if (firstUserId == null || secondUserId == null) {
            return Optional.empty();
        }
        return chatRoomRepository.findRoomBetweenUsers(firstUserId, secondUserId);
    }

    @Transactional(readOnly = true)
    public ChatRoomResponse getRoomResponse(String currentEmail, Long chatRoomId) {
        User currentUser = getUserByEmail(currentEmail);
        ChatRoom room = getAuthorizedRoom(chatRoomId, currentUser);
        return toRoomResponse(room, currentUser);
    }

    @Transactional(readOnly = true)
    public ChatRoomResponse toRoomResponse(ChatRoom room, User viewer) {
        ChatRoomResponse.ChatRoomResponseBuilder builder = ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .roomType(room.getRoomType())
                .name(room.getName())
                .adminId(room.getAdmin() != null ? room.getAdmin().getId() : null);

        if (room.isGroupRoom()) {
            List<ChatRoomMemberResponse> members = room.getParticipants().stream()
                    .sorted(Comparator.comparing(User::getName, String.CASE_INSENSITIVE_ORDER))
                    .map(this::toMemberResponse)
                    .toList();
            builder.members(members);
        } else if (viewer != null) {
            User otherParticipant = resolveOtherParticipant(room, viewer.getId());
            builder.participantId(otherParticipant.getId())
                    .participantName(otherParticipant.getName())
                    .participantEmail(otherParticipant.getEmail());
        }

        return builder.build();
    }

    private UserChatSummaryResponse buildDirectSummary(User currentUser, User user) {
        Optional<ChatRoom> roomOptional = findRoomBetweenUsers(currentUser.getId(), user.getId());
        Long chatRoomId = roomOptional.map(ChatRoom::getId).orElse(null);
        Optional<Message> lastMessage = roomOptional.flatMap(room -> messageRepository.findTopByChatRoomIdOrderByCreatedAtDesc(room.getId()));

        return UserChatSummaryResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .online(presenceService.isUserOnline(user.getEmail()))
                .unreadCount(chatRoomId == null ? 0L : messageRepository.countUnreadMessagesForViewer(
                        chatRoomId,
                        currentUser.getId(),
                        ChatRoomType.DIRECT,
                        ChatRoomType.GROUP
                ))
                .lastMessagePreview(lastMessage.map(this::previewFor).orElse(null))
                .lastMessageAt(lastMessage.map(Message::getCreatedAt).orElse(null))
                .chatRoomId(chatRoomId)
                .roomType(ChatRoomType.DIRECT)
                .adminId(null)
                .memberCount(2L)
                .memberIds(List.of(currentUser.getId(), user.getId()))
                .memberNames(List.of(currentUser.getName(), user.getName()))
                .members(List.of())
                .canManageMembers(false)
                .build();
    }

    private UserChatSummaryResponse buildGroupSummary(User currentUser, ChatRoom room) {
        Optional<Message> lastMessage = messageRepository.findTopByChatRoomIdOrderByCreatedAtDesc(room.getId());
        List<User> members = room.getParticipants().stream()
                .sorted(Comparator.comparing(User::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        boolean someoneElseOnline = members.stream()
                .filter(member -> !member.getId().equals(currentUser.getId()))
                .anyMatch(member -> presenceService.isUserOnline(member.getEmail()));

        return UserChatSummaryResponse.builder()
                .userId(-room.getId())
                .name(room.getName())
                .email(null)
                .profileImageUrl(null)
                .online(someoneElseOnline)
                .unreadCount(messageRepository.countUnreadMessagesForViewer(
                        room.getId(),
                        currentUser.getId(),
                        ChatRoomType.DIRECT,
                        ChatRoomType.GROUP
                ))
                .lastMessagePreview(lastMessage.map(this::previewFor).orElse(null))
                .lastMessageAt(lastMessage.map(Message::getCreatedAt).orElse(null))
                .chatRoomId(room.getId())
                .roomType(ChatRoomType.GROUP)
                .adminId(room.getAdmin() != null ? room.getAdmin().getId() : null)
                .memberCount((long) members.size())
                .memberIds(members.stream().map(User::getId).toList())
                .memberNames(members.stream().map(User::getName).toList())
                .members(members.stream().map(this::toMemberResponse).toList())
                .canManageMembers(room.getAdmin() != null && room.getAdmin().getId().equals(currentUser.getId()))
                .build();
    }

    private ChatRoom createRoomWithRaceProtection(User currentUser, User participant, Long[] normalizedPair) {
        ChatRoom candidate = ChatRoom.builder()
                .roomType(ChatRoomType.DIRECT)
                .userOne(normalizedPair[0].equals(currentUser.getId()) ? currentUser : participant)
                .userTwo(normalizedPair[1].equals(currentUser.getId()) ? currentUser : participant)
                .build();

        try {
            return chatRoomRepository.saveAndFlush(candidate);
        } catch (DataIntegrityViolationException ex) {
            log.debug(
                    "Detected concurrent chat room creation for pair=({},{}), refetching existing room",
                    normalizedPair[0],
                    normalizedPair[1]
            );
            return findRoomBetweenUsers(currentUser.getId(), participant.getId())
                    .orElseThrow(() -> new BadRequestException("Unable to resolve chat room. Please retry."));
        }
    }

    private void notifyRoomParticipants(String eventType, ChatRoom room, Collection<User> recipients, Long affectedUserId) {
        for (User recipient : recipients) {
            messagingTemplate.convertAndSendToUser(
                    resolveUserDestinationKey(recipient),
                    ROOM_EVENTS_DESTINATION,
                    RoomEventResponse.builder()
                            .eventType(eventType)
                            .chatRoomId(room.getId())
                            .affectedUserId(affectedUserId)
                            .room(toRoomResponse(room, recipient))
                            .build()
            );
        }
    }

    private String previewFor(Message message) {
        String preview = StoredMessageContent.parse(message.getContent()).preview();
        return shortenPreview(preview);
    }

    private ChatRoomMemberResponse toMemberResponse(User member) {
        return ChatRoomMemberResponse.builder()
                .userId(member.getId())
                .name(member.getName())
                .email(member.getEmail())
                .profileImageUrl(member.getProfileImageUrl())
                .online(presenceService.isUserOnline(member.getEmail()))
                .build();
    }

    private Set<User> resolveGroupMembers(User currentUser, List<Long> memberIds) {
        Set<User> members = new LinkedHashSet<>();
        members.add(currentUser);
        for (User member : resolveUsers(memberIds)) {
            if (!member.getId().equals(currentUser.getId())) {
                members.add(member);
            }
        }
        if (members.size() < 2) {
            throw new BadRequestException("Select at least one other group member");
        }
        return members;
    }

    private List<User> resolveUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            throw new BadRequestException("Select at least one member");
        }

        List<User> resolved = new ArrayList<>();
        Set<Long> uniqueIds = new LinkedHashSet<>(userIds);
        for (Long userId : uniqueIds) {
            if (userId == null) {
                continue;
            }
            resolved.add(getUserById(userId));
        }
        if (resolved.isEmpty()) {
            throw new BadRequestException("Select at least one valid member");
        }
        return resolved;
    }

    private void validateParticipantId(Long currentUserId, Long participantId) {
        if (participantId == null) {
            throw new BadRequestException("Participant id is required");
        }
        if (currentUserId.equals(participantId)) {
            throw new BadRequestException("You cannot create a room with yourself");
        }
    }

    private User resolveOtherParticipant(ChatRoom room, Long currentUserId) {
        if (room == null || room.getUserOne() == null || room.getUserTwo() == null) {
            throw new BadRequestException("Chat room data is incomplete");
        }
        if (!room.hasParticipant(currentUserId)) {
            throw new ForbiddenOperationException("You do not have access to this chat room");
        }
        return room.getOtherParticipant(currentUserId);
    }

    private void requireGroupRoom(ChatRoom room) {
        if (!room.isGroupRoom()) {
            throw new BadRequestException("This operation is available only for group chats");
        }
    }

    private void requireGroupAdmin(ChatRoom room, User user) {
        if (room.getAdmin() == null || !room.getAdmin().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("Only the group admin can manage members");
        }
    }

    private String normalizeGroupName(String rawName) {
        String groupName = StringUtils.trimWhitespace(rawName);
        if (!StringUtils.hasText(groupName)) {
            throw new BadRequestException("Group name is required");
        }
        return groupName;
    }

    private String resolveUserDestinationKey(User user) {
        String destinationKey = user.getUsername();
        if (!StringUtils.hasText(destinationKey)) {
            throw new BadRequestException("Unable to resolve user destination");
        }
        return destinationKey;
    }

    private String shortenPreview(String content) {
        if (content == null) {
            return null;
        }
        String trimmed = content.trim();
        if (trimmed.length() <= 60) {
            return trimmed;
        }
        return trimmed.substring(0, 60) + "...";
    }

    private Long[] normalizePair(Long firstUserId, Long secondUserId) {
        long min = Math.min(firstUserId, secondUserId);
        long max = Math.max(firstUserId, secondUserId);
        return new Long[]{min, max};
    }
}
