package com.chatconnecting.chatconnecting.chat.service;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.ChatRoomRepository;
import com.chatconnecting.chatconnecting.chat.dto.ChatRoomResponse;
import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.message.Message;
import com.chatconnecting.chatconnecting.message.MessageRepository;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.user.UserRepository;
import com.chatconnecting.chatconnecting.websocket.PresenceService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private static final List<MessageStatus> UNREAD_STATUSES = List.of(MessageStatus.SENT, MessageStatus.DELIVERED);

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final PresenceService presenceService;

    @Transactional(readOnly = true)
    public List<UserChatSummaryResponse> getSidebarUsers(String currentEmail) {
        User currentUser = getUserByEmail(currentEmail);
        List<User> users = userRepository.findAllByIdNot(currentUser.getId());
        List<UserChatSummaryResponse> summaries = new ArrayList<>(users.size());

        for (User user : users) {
            Optional<ChatRoom> roomOptional = findRoomBetweenUsers(currentUser.getId(), user.getId());

            Long unreadCount = 0L;
            String preview = null;
            LocalDateTime lastMessageAt = null;
            Long chatRoomId = null;

            if (roomOptional.isPresent()) {
                ChatRoom room = roomOptional.get();
                chatRoomId = room.getId();

                unreadCount = messageRepository.countByChatRoomIdAndReceiverIdAndStatusIn(
                        room.getId(),
                        currentUser.getId(),
                        UNREAD_STATUSES
                );

                Optional<Message> lastMessage = messageRepository.findTopByChatRoomIdOrderByCreatedAtDesc(room.getId());
                if (lastMessage.isPresent()) {
                    preview = shortenPreview(lastMessage.get().getContent());
                    lastMessageAt = lastMessage.get().getCreatedAt();
                }
            }

            summaries.add(UserChatSummaryResponse.builder()
                    .userId(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .profileImageUrl(user.getProfileImageUrl())
                    .online(presenceService.isUserOnline(user.getEmail()))
                    .unreadCount(unreadCount)
                    .lastMessagePreview(preview)
                    .lastMessageAt(lastMessageAt)
                    .chatRoomId(chatRoomId)
                    .build());
        }

        summaries.sort(
                Comparator.comparing(
                                UserChatSummaryResponse::getLastMessageAt,
                                Comparator.nullsLast(Comparator.reverseOrder())
                        )
                        .thenComparing(UserChatSummaryResponse::getName, String.CASE_INSENSITIVE_ORDER)
        );
        return summaries;
    }

    @Transactional
    public ChatRoomResponse getOrCreateChatRoom(String currentEmail, Long participantId) {
        User currentUser = getUserByEmail(currentEmail);
        log.info("Get/create chat room: currentUserId={}, currentUserEmail={}, receiverId={}",
                currentUser.getId(), currentUser.getEmail(), participantId);

        validateParticipantId(currentUser.getId(), participantId);
        User participant = userRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Optional<ChatRoom> existingRoom = findRoomBetweenUsers(currentUser.getId(), participant.getId());
        ChatRoom room;
        if (existingRoom.isPresent()) {
            room = existingRoom.get();
            log.info("Using existing chat room id={} for currentUserId={} and receiverId={}",
                    room.getId(), currentUser.getId(), participant.getId());
        } else {
            Long[] normalizedPair = normalizePair(currentUser.getId(), participant.getId());
            room = createRoomWithRaceProtection(currentUser, participant, normalizedPair);
            log.info("Created chat room id={} for currentUserId={} and receiverId={}",
                    room.getId(), currentUser.getId(), participant.getId());
        }

        User otherParticipant = resolveOtherParticipant(room, currentUser.getId());

        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .participantId(otherParticipant.getId())
                .participantName(otherParticipant.getName())
                .participantEmail(otherParticipant.getEmail())
                .build();
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

    private ChatRoom createRoomWithRaceProtection(User currentUser, User participant, Long[] normalizedPair) {
        ChatRoom candidate = ChatRoom.builder()
                .userOne(normalizedPair[0].equals(currentUser.getId()) ? currentUser : participant)
                .userTwo(normalizedPair[1].equals(currentUser.getId()) ? currentUser : participant)
                .build();

        try {
            return chatRoomRepository.saveAndFlush(candidate);
        } catch (DataIntegrityViolationException ex) {
            // Another concurrent request likely created the same normalized pair.
            log.debug("Detected concurrent chat room creation for pair=({},{}), refetching existing room",
                    normalizedPair[0], normalizedPair[1]);
            return findRoomBetweenUsers(currentUser.getId(), participant.getId())
                    .orElseThrow(() -> new BadRequestException("Unable to resolve chat room. Please retry."));
        }
    }

    @Transactional(readOnly = true)
    public ChatRoom getAuthorizedRoom(Long roomId, User currentUser) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        if (!room.hasParticipant(currentUser.getId())) {
            throw new ForbiddenOperationException("You do not have access to this chat room");
        }
        return room;
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
