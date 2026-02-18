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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

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
        ChatRoom room = getOrCreateRoom(currentUser, participantId);
        User participant = room.getOtherParticipant(currentUser.getId());

        return ChatRoomResponse.builder()
                .chatRoomId(room.getId())
                .participantId(participant.getId())
                .participantName(participant.getName())
                .participantEmail(participant.getEmail())
                .build();
    }

    @Transactional
    public ChatRoom getOrCreateRoom(User currentUser, Long participantId) {
        if (participantId == null) {
            throw new BadRequestException("Participant id is required");
        }
        if (currentUser.getId().equals(participantId)) {
            throw new BadRequestException("You cannot create a room with yourself");
        }

        User participant = getUserById(participantId);
        Long[] normalizedPair = normalizePair(currentUser.getId(), participantId);

        return chatRoomRepository.findByUserOneIdAndUserTwoId(normalizedPair[0], normalizedPair[1])
                .orElseGet(() -> chatRoomRepository.save(ChatRoom.builder()
                        .userOne(normalizedPair[0].equals(currentUser.getId()) ? currentUser : participant)
                        .userTwo(normalizedPair[1].equals(currentUser.getId()) ? currentUser : participant)
                        .build()));
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
        Long[] pair = normalizePair(firstUserId, secondUserId);
        return chatRoomRepository.findByUserOneIdAndUserTwoId(pair[0], pair[1]);
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
