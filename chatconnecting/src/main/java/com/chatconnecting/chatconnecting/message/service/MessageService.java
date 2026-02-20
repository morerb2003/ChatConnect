package com.chatconnecting.chatconnecting.message.service;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.message.Message;
import com.chatconnecting.chatconnecting.message.MessageRepository;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageResponse;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.dto.ReadReceiptEvent;
import com.chatconnecting.chatconnecting.message.dto.TypingEventRequest;
import com.chatconnecting.chatconnecting.message.dto.TypingEventResponse;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.websocket.PresenceService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository messageRepository;
    private final ChatService chatService;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public MessagePageResponse getChatHistory(String currentEmail, Long chatRoomId, int page, int size) {
        if (chatRoomId == null) {
            throw new BadRequestException("Chat room id is required");
        }
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        User currentUser = chatService.getUserByEmail(currentEmail);
        ChatRoom room = chatService.getAuthorizedRoom(chatRoomId, currentUser);

        Page<Message> messagePage = messageRepository.findByChatRoomIdOrderByCreatedAtDesc(
                room.getId(),
                PageRequest.of(safePage, safeSize)
        );

        List<ChatMessageResponse> messages = new ArrayList<>(
                messagePage.getContent().stream().map(this::toResponse).toList()
        );
        Collections.reverse(messages);

        return MessagePageResponse.builder()
                .messages(messages)
                .page(messagePage.getNumber())
                .size(messagePage.getSize())
                .totalElements(messagePage.getTotalElements())
                .totalPages(messagePage.getTotalPages())
                .last(messagePage.isLast())
                .build();
    }

    @Transactional
    public ChatMessageResponse sendMessage(String senderPrincipalName, ChatMessageRequest request) {
        User sender = chatService.getUserByEmail(senderPrincipalName);
        ChatRoom room = resolveRoom(sender, request);
        User receiver = room.getOtherParticipant(sender.getId());

        if (!receiver.getId().equals(request.getReceiverId())) {
            throw new BadRequestException("Receiver does not belong to this room");
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new BadRequestException("Message content cannot be empty");
        }

        LocalDateTime now = LocalDateTime.now();
        boolean receiverOnline = presenceService.isUserOnline(receiver.getEmail());
        MessageStatus status = receiverOnline ? MessageStatus.DELIVERED : MessageStatus.SENT;

        Message message = Message.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .status(status)
                .deliveredAt(receiverOnline ? now : null)
                .build();

        Message saved = messageRepository.saveAndFlush(message);
        ChatMessageResponse payload = toResponse(saved, request.getClientMessageId());
        log.debug("Persisted message id={} room={} sender={} receiver={}",
                payload.getId(),
                payload.getChatRoomId(),
                payload.getSenderId(),
                payload.getReceiverId());

        String senderDestinationUser = resolveUserDestinationKey(sender);
        String receiverDestinationUser = resolveUserDestinationKey(receiver);

        messagingTemplate.convertAndSendToUser(senderDestinationUser, "/queue/messages", payload);
        messagingTemplate.convertAndSendToUser(receiverDestinationUser, "/queue/messages", payload);
        log.debug("Broadcasted message id={} to senderDestination={} receiverDestination={}",
                payload.getId(),
                senderDestinationUser,
                receiverDestinationUser);

        return payload;
    }

    @Transactional
    public int markMessagesAsRead(String readerEmail, Long chatRoomId) {
        User reader = chatService.getUserByEmail(readerEmail);
        ChatRoom room = chatService.getAuthorizedRoom(chatRoomId, reader);
        User otherParticipant = room.getOtherParticipant(reader.getId());

        LocalDateTime readAt = LocalDateTime.now();
        int updatedCount = messageRepository.markMessagesAsRead(
                room.getId(),
                reader.getId(),
                otherParticipant.getId(),
                readAt
        );

        if (updatedCount > 0) {
            messagingTemplate.convertAndSendToUser(
                    resolveUserDestinationKey(otherParticipant),
                    "/queue/read-receipts",
                    ReadReceiptEvent.builder()
                            .chatRoomId(room.getId())
                            .readerId(reader.getId())
                            .readAt(readAt)
                            .build()
            );
        }
        return updatedCount;
    }

    @Transactional(readOnly = true)
    public void sendTypingEvent(String senderEmail, TypingEventRequest request) {
        if (request.getReceiverId() == null) {
            throw new BadRequestException("Receiver id is required");
        }

        User sender = chatService.getUserByEmail(senderEmail);
        if (sender.getId().equals(request.getReceiverId())) {
            return;
        }

        User receiver = chatService.getUserById(request.getReceiverId());
        if (request.getChatRoomId() != null) {
            ChatRoom room = chatService.getAuthorizedRoom(request.getChatRoomId(), sender);
            if (!room.getOtherParticipant(sender.getId()).getId().equals(receiver.getId())) {
                throw new BadRequestException("Invalid receiver for this room");
            }
        }

        messagingTemplate.convertAndSendToUser(
                resolveUserDestinationKey(receiver),
                "/queue/typing",
                TypingEventResponse.builder()
                        .chatRoomId(request.getChatRoomId())
                        .senderId(sender.getId())
                        .typing(request.isTyping())
                        .build()
        );
    }

    private ChatRoom resolveRoom(User sender, ChatMessageRequest request) {
        if (request.getReceiverId() == null) {
            throw new BadRequestException("Receiver id is required");
        }

        if (request.getChatRoomId() != null) {
            return chatService.getAuthorizedRoom(request.getChatRoomId(), sender);
        }
        return chatService.getOrCreateRoom(sender, request.getReceiverId());
    }

    private ChatMessageResponse toResponse(Message message) {
        return toResponse(message, null);
    }

    private ChatMessageResponse toResponse(Message message, String clientMessageId) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .clientMessageId(clientMessageId)
                .chatRoomId(message.getChatRoom().getId())
                .senderId(message.getSender().getId())
                .receiverId(message.getReceiver().getId())
                .content(message.getContent())
                .status(message.getStatus())
                .timestamp(message.getCreatedAt())
                .deliveredAt(message.getDeliveredAt())
                .readAt(message.getReadAt())
                .build();
    }

    private String resolveUserDestinationKey(User user) {
        String destinationKey = user.getUsername();
        if (destinationKey == null || destinationKey.isBlank()) {
            throw new BadRequestException("Unable to resolve user destination");
        }
        return destinationKey;
    }
}
