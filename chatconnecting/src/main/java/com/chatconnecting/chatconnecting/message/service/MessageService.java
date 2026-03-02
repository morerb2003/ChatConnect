package com.chatconnecting.chatconnecting.message.service;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.message.HiddenMessage;
import com.chatconnecting.chatconnecting.message.HiddenMessageRepository;
import com.chatconnecting.chatconnecting.message.Message;
import com.chatconnecting.chatconnecting.message.MessageRepository;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import com.chatconnecting.chatconnecting.message.dto.AttachmentUploadResponse;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageResponse;
import com.chatconnecting.chatconnecting.message.dto.DeliveryAckRequest;
import com.chatconnecting.chatconnecting.message.dto.ForwardMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.dto.ReadMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.ReadReceiptEvent;
import com.chatconnecting.chatconnecting.message.dto.TypingEventRequest;
import com.chatconnecting.chatconnecting.message.dto.TypingEventResponse;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.websocket.PresenceService;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 20L * 1024L * 1024L;
    private static final long EDIT_WINDOW_MINUTES = 15L;
    private static final long DELETE_FOR_EVERYONE_WINDOW_MINUTES = 60L;
    private static final String META_PREFIX = "__CHATCONNECT_META__:";
    private static final Path CHAT_UPLOAD_DIR = Paths.get("uploads", "chat");
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "video/quicktime"
    );
    private static final Map<String, String> EXTENSION_BY_TYPE = Map.of(
            "application/pdf", "pdf",
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif",
            "video/mp4", "mp4",
            "video/webm", "webm",
            "video/quicktime", "mov"
    );

    private final MessageRepository messageRepository;
    private final HiddenMessageRepository hiddenMessageRepository;
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

        Page<Message> messagePage = messageRepository.findVisibleByChatRoomIdOrderByCreatedAtDesc(
                room.getId(),
                currentUser.getId(),
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

        Message message = Message.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .status(MessageStatus.SENT)
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
    public ChatMessageResponse markMessageAsDelivered(String receiverEmail, DeliveryAckRequest request) {
        User receiver = chatService.getUserByEmail(receiverEmail);
        Message message = messageRepository.findByIdAndReceiverId(request.getMessageId(), receiver.getId())
                .orElseThrow(() -> new BadRequestException("Message not found"));

        if (message.getStatus() == MessageStatus.SENT) {
            message.setStatus(MessageStatus.DELIVERED);
            message.setDeliveredAt(LocalDateTime.now());
            message = messageRepository.saveAndFlush(message);
        }

        ChatMessageResponse payload = toResponse(message, null);
        messagingTemplate.convertAndSendToUser(
                resolveUserDestinationKey(message.getSender()),
                "/queue/status",
                payload
        );
        return payload;
    }

    @Transactional
    public ChatMessageResponse markMessageAsRead(String readerEmail, ReadMessageRequest request) {
        User reader = chatService.getUserByEmail(readerEmail);
        Message message = messageRepository.findByIdAndReceiverId(request.getMessageId(), reader.getId())
                .orElseThrow(() -> new BadRequestException("Message not found"));

        if (message.getStatus() != MessageStatus.READ) {
            LocalDateTime now = LocalDateTime.now();
            if (message.getStatus() == MessageStatus.SENT) {
                message.setDeliveredAt(now);
            }
            message.setStatus(MessageStatus.READ);
            message.setReadAt(now);
            message = messageRepository.saveAndFlush(message);
        }

        ChatMessageResponse payload = toResponse(message, null);
        messagingTemplate.convertAndSendToUser(
                resolveUserDestinationKey(message.getSender()),
                "/queue/status",
                payload
        );
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

    @Transactional
    public ChatMessageResponse updateMessage(String senderEmail, Long messageId, String content) {
        User sender = chatService.getUserByEmail(senderEmail);
        Message message = messageRepository.findByIdAndSenderId(messageId, sender.getId())
                .orElseThrow(() -> new BadRequestException("Message not found"));
        validateEditWindow(message);

        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("Message content cannot be empty");
        }

        message.setContent(trimmed);
        Message saved = messageRepository.saveAndFlush(message);
        ChatMessageResponse payload = toResponse(saved, null);
        payload.setEventType("messageUpdated");
        broadcastMessage(payload);
        return payload;
    }

    @Transactional
    public ChatMessageResponse deleteMessageForEveryone(String senderEmail, Long messageId) {
        User sender = chatService.getUserByEmail(senderEmail);
        Message message = messageRepository.findByIdAndSenderId(messageId, sender.getId())
                .orElseThrow(() -> new BadRequestException("Message not found"));
        validateDeleteWindow(message);

        message.setContent("__CHATCONNECT_META__:{\"v\":1,\"text\":\"\",\"deletedForEveryone\":true}");
        Message saved = messageRepository.saveAndFlush(message);
        ChatMessageResponse payload = toResponse(saved, null);
        payload.setEventType("messageDeleted");
        broadcastMessage(payload);
        return payload;
    }

    @Transactional
    public void hideMessageForUser(String requesterEmail, Long messageId) {
        User requester = chatService.getUserByEmail(requesterEmail);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BadRequestException("Message not found"));
        chatService.getAuthorizedRoom(message.getChatRoom().getId(), requester);

        if (hiddenMessageRepository.existsByMessageIdAndUserId(messageId, requester.getId())) {
            return;
        }

        hiddenMessageRepository.save(HiddenMessage.builder()
                .message(message)
                .user(requester)
                .build());
    }

    @Transactional(readOnly = true)
    public MessagePageResponse searchMessages(String requesterEmail, Long chatRoomId, String query, int page, int size) {
        if (!StringUtils.hasText(query)) {
            return MessagePageResponse.builder()
                    .messages(List.of())
                    .page(0)
                    .size(0)
                    .totalElements(0)
                    .totalPages(0)
                    .last(true)
                    .build();
        }

        User requester = chatService.getUserByEmail(requesterEmail);
        ChatRoom room = chatService.getAuthorizedRoom(chatRoomId, requester);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Message> messagePage = messageRepository.searchVisibleRoomMessages(room.getId(), requester.getId(), query.trim(), pageable);
        List<ChatMessageResponse> messages = new ArrayList<>(messagePage.getContent().stream().map(this::toResponse).toList());
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
    public List<ChatMessageResponse> forwardMessage(String senderEmail, Long sourceMessageId, ForwardMessageRequest request) {
        User sender = chatService.getUserByEmail(senderEmail);
        Message sourceMessage = messageRepository.findById(sourceMessageId)
                .orElseThrow(() -> new BadRequestException("Message not found"));
        chatService.getAuthorizedRoom(sourceMessage.getChatRoom().getId(), sender);

        Set<Long> uniqueTargets = new LinkedHashSet<>(request.getTargetUserIds());
        uniqueTargets.remove(sender.getId());
        if (uniqueTargets.isEmpty()) {
            throw new BadRequestException("Select at least one other user to forward");
        }

        String forwardedContent = toForwardedContent(sourceMessage.getContent());
        List<ChatMessageResponse> forwardedMessages = new ArrayList<>();

        for (Long targetUserId : uniqueTargets) {
            ChatRoom room = chatService.getOrCreateRoom(sender, targetUserId);
            User receiver = room.getOtherParticipant(sender.getId());

            Message created = messageRepository.saveAndFlush(Message.builder()
                    .chatRoom(room)
                    .sender(sender)
                    .receiver(receiver)
                    .content(forwardedContent)
                    .status(MessageStatus.SENT)
                    .build());

            ChatMessageResponse payload = toResponse(created, null);
            payload.setEventType("messageForwarded");
            forwardedMessages.add(payload);
            broadcastMessage(payload);
        }

        return forwardedMessages;
    }

    @Transactional
    public AttachmentUploadResponse uploadAttachment(String userEmail, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Attachment file is required");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new BadRequestException("File size must be 20MB or less");
        }

        String contentType = StringUtils.trimWhitespace(file.getContentType());
        if (!StringUtils.hasText(contentType) || !ALLOWED_ATTACHMENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only PDF, image, and video files are allowed");
        }

        User user = chatService.getUserByEmail(userEmail);
        String extension = EXTENSION_BY_TYPE.getOrDefault(contentType, "bin");
        String fileName = user.getId() + "_" + System.currentTimeMillis() + "_" + UUID.randomUUID() + "." + extension;
        Path uploadDir = CHAT_UPLOAD_DIR.toAbsolutePath().normalize();
        Path targetPath = uploadDir.resolve(fileName).normalize();
        if (!targetPath.startsWith(uploadDir)) {
            throw new BadRequestException("Invalid attachment path");
        }

        try {
            Files.createDirectories(uploadDir);
            try (InputStream stream = file.getInputStream()) {
                Files.copy(stream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store attachment");
        }

        return AttachmentUploadResponse.builder()
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : fileName)
                .url("/uploads/chat/" + fileName)
                .contentType(contentType)
                .size(file.getSize())
                .kind(resolveAttachmentKind(contentType))
                .build();
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
                .eventType("message")
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

    private String resolveAttachmentKind(String contentType) {
        if (contentType.startsWith("image/")) return "IMAGE";
        if (contentType.startsWith("video/")) return "VIDEO";
        if ("application/pdf".equals(contentType)) return "PDF";
        return "FILE";
    }

    private void validateEditWindow(Message message) {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(EDIT_WINDOW_MINUTES);
        if (message.getCreatedAt().isBefore(cutoff)) {
            throw new ForbiddenOperationException("Messages can be edited only within 15 minutes");
        }
    }

    private void validateDeleteWindow(Message message) {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(DELETE_FOR_EVERYONE_WINDOW_MINUTES);
        if (message.getCreatedAt().isBefore(cutoff)) {
            throw new ForbiddenOperationException("Delete for everyone is allowed only within 1 hour");
        }
    }

    private String toForwardedContent(String originalContent) {
        String source = originalContent == null ? "" : originalContent;
        if (source.startsWith(META_PREFIX)) {
            String payload = source.substring(META_PREFIX.length());
            if (payload.contains("\"forwarded\":")) {
                payload = payload.replaceAll("\"forwarded\"\\s*:\\s*(true|false)", "\"forwarded\":true");
                return META_PREFIX + payload;
            }
            if (payload.endsWith("}")) {
                return META_PREFIX + payload.substring(0, payload.length() - 1) + ",\"forwarded\":true}";
            }
            return source;
        }

        return META_PREFIX + "{\"v\":1,\"text\":\"" + escapeJson(source) + "\",\"forwarded\":true}";
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    private void broadcastMessage(ChatMessageResponse payload) {
        User sender = chatService.getUserById(payload.getSenderId());
        User receiver = chatService.getUserById(payload.getReceiverId());
        messagingTemplate.convertAndSendToUser(resolveUserDestinationKey(sender), "/queue/messages", payload);
        messagingTemplate.convertAndSendToUser(resolveUserDestinationKey(receiver), "/queue/messages", payload);
    }
}
