package com.chatconnecting.chatconnecting.message.service;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.ChatRoomType;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.message.HiddenMessage;
import com.chatconnecting.chatconnecting.message.HiddenMessageRepository;
import com.chatconnecting.chatconnecting.message.Message;
import com.chatconnecting.chatconnecting.message.MessageReaction;
import com.chatconnecting.chatconnecting.message.MessageReactionRepository;
import com.chatconnecting.chatconnecting.message.MessageRepository;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import com.chatconnecting.chatconnecting.message.StoredMessageContent;
import com.chatconnecting.chatconnecting.message.dto.AttachmentUploadResponse;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageResponse;
import com.chatconnecting.chatconnecting.message.dto.DeliveryAckRequest;
import com.chatconnecting.chatconnecting.message.dto.ForwardMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.MessageReactionRequest;
import com.chatconnecting.chatconnecting.message.dto.MessageReactionResponse;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.dto.ReadMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.ReadReceiptEvent;
import com.chatconnecting.chatconnecting.message.dto.TypingEventRequest;
import com.chatconnecting.chatconnecting.message.dto.TypingEventResponse;
import com.chatconnecting.chatconnecting.notification.service.NotificationService;
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
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
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
@SuppressWarnings("deprecation")
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);
    private static final String MESSAGE_DESTINATION = "/queue/messages";
    private static final String STATUS_DESTINATION = "/queue/status";
    private static final String TYPING_DESTINATION = "/queue/typing";
    private static final String READ_RECEIPTS_DESTINATION = "/queue/read-receipts";
    private static final String GROUP_TOPIC_DESTINATION_PREFIX = "/topic/group/";
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 20L * 1024L * 1024L;
    private static final long EDIT_WINDOW_MINUTES = 15L;
    private static final long DELETE_FOR_EVERYONE_WINDOW_MINUTES = 60L;
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
    private final MessageReactionRepository messageReactionRepository;
    private final HiddenMessageRepository hiddenMessageRepository;
    private final ChatService chatService;
    private final PresenceService presenceService;
    private final NotificationService notificationService;
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
        if (room.isGroupRoom()) {
            if (request.getChatRoomId() == null) {
                throw new BadRequestException("chatRoomId is required for group messages");
            }
            if (!room.hasParticipant(sender.getId())) {
                throw new ForbiddenOperationException("You are not a member of this group");
            }
            if (request.getReceiverId() != null) {
                log.debug(
                        "Ignoring receiverId for group message: senderId={}, roomId={}, receiverId={}",
                        sender.getId(),
                        room.getId(),
                        request.getReceiverId()
                );
            }
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new BadRequestException("Message content cannot be empty");
        }

        User receiver = null;
        if (!room.isGroupRoom()) {
            receiver = room.getOtherParticipant(sender.getId());
            if (request.getReceiverId() != null && !receiver.getId().equals(request.getReceiverId())) {
                throw new BadRequestException("Receiver does not belong to this room");
            }
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
        payload.setEventType(room.isGroupRoom() ? "groupMessage" : "message");
        log.debug("Message sent: id={}, chatRoomId={}, roomType={}, senderId={}, receiverId={}",
                payload.getId(),
                payload.getChatRoomId(),
                payload.getRoomType(),
                payload.getSenderId(),
                payload.getReceiverId());

        if (room.isGroupRoom()) {
            broadcastGroupMessage(room, sender, payload);
        } else {
            broadcastToRoom(room, MESSAGE_DESTINATION, payload);
            // Send push notification if receiver is offline
            if (receiver != null && !presenceService.isUserOnline(receiver.getEmail())) {
                notificationService.sendOfflineNotification(
                        receiver,
                        sender.getName(),
                        content,
                        "newMessage"
                );
            }
        }
        return payload;
    }

    @Transactional
    public ChatMessageResponse markMessageAsDelivered(String receiverEmail, DeliveryAckRequest request) {
        User receiver = chatService.getUserByEmail(receiverEmail);
        Message message = findAuthorizedMessage(request.getMessageId(), receiver);
        if (message.getSender().getId().equals(receiver.getId())) {
            return toResponse(message, null);
        }

        if (!message.getChatRoom().isGroupRoom()) {
            if (message.getReceiver() == null || !receiver.getId().equals(message.getReceiver().getId())) {
                throw new BadRequestException("Message not found");
            }
        }

        if (message.getStatus() == MessageStatus.SENT) {
            message.setStatus(MessageStatus.DELIVERED);
            message.setDeliveredAt(LocalDateTime.now());
            message = messageRepository.saveAndFlush(message);
        }

        ChatMessageResponse payload = toResponse(message, null);
        payload.setEventType("messageDelivered");
        broadcastToRoom(message.getChatRoom(), STATUS_DESTINATION, payload);
        return payload;
    }

    @Transactional
    public ChatMessageResponse markMessageAsRead(String readerEmail, ReadMessageRequest request) {
        User reader = chatService.getUserByEmail(readerEmail);
        Message message = findAuthorizedMessage(request.getMessageId(), reader);
        if (message.getSender().getId().equals(reader.getId())) {
            return toResponse(message, null);
        }

        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;
        if (message.getStatus() == MessageStatus.SENT) {
            message.setDeliveredAt(now);
            message.setStatus(MessageStatus.DELIVERED);
            changed = true;
        }
        if (!message.getSeenBy().stream().anyMatch(user -> user.getId().equals(reader.getId()))) {
            message.getSeenBy().add(reader);
            changed = true;
        }
        if (message.getStatus() != MessageStatus.READ || message.getReadAt() == null) {
            message.setStatus(MessageStatus.READ);
            message.setReadAt(now);
            changed = true;
        }
        if (changed) {
            message = messageRepository.saveAndFlush(message);
        }

        ChatMessageResponse payload = toResponse(message, null);
        payload.setEventType("messageSeen");
        broadcastToRoom(message.getChatRoom(), STATUS_DESTINATION, payload);
        broadcastReadReceipt(message.getChatRoom(), reader, now, List.of(message.getId()));
        return payload;
    }

    @Transactional
    public int markMessagesAsRead(String readerEmail, Long chatRoomId) {
        User reader = chatService.getUserByEmail(readerEmail);
        ChatRoom room = chatService.getAuthorizedRoom(chatRoomId, reader);
        List<Message> unreadMessages = messageRepository.findUnreadMessagesForViewer(
                room.getId(),
                reader.getId(),
                ChatRoomType.DIRECT,
                ChatRoomType.GROUP
        );

        if (unreadMessages.isEmpty()) {
            return 0;
        }

        LocalDateTime readAt = LocalDateTime.now();
        for (Message message : unreadMessages) {
            if (message.getStatus() == MessageStatus.SENT) {
                message.setDeliveredAt(readAt);
            }
            message.setStatus(MessageStatus.READ);
            message.setReadAt(readAt);
            if (!message.getSeenBy().stream().anyMatch(user -> user.getId().equals(reader.getId()))) {
                message.getSeenBy().add(reader);
            }
        }

        List<Message> savedMessages = messageRepository.saveAllAndFlush(unreadMessages);
        List<Long> messageIds = savedMessages.stream().map(Message::getId).toList();

        for (Message message : savedMessages) {
            ChatMessageResponse payload = toResponse(message, null);
            payload.setEventType("messageSeen");
            broadcastToRoom(room, STATUS_DESTINATION, payload);
        }
        broadcastReadReceipt(room, reader, readAt, messageIds);
        return savedMessages.size();
    }

    @Transactional(readOnly = true)
    public void sendTypingEvent(String senderEmail, TypingEventRequest request) {
        User sender = chatService.getUserByEmail(senderEmail);
        List<User> recipients;

        if (request.getChatRoomId() != null) {
            ChatRoom room = chatService.getAuthorizedRoom(request.getChatRoomId(), sender);
            recipients = room.getParticipants().stream()
                    .filter(user -> !user.getId().equals(sender.getId()))
                    .toList();

            if (!room.isGroupRoom() && request.getReceiverId() != null) {
                User receiver = room.getOtherParticipant(sender.getId());
                if (!receiver.getId().equals(request.getReceiverId())) {
                    throw new BadRequestException("Invalid receiver for this room");
                }
            }
        } else {
            if (request.getReceiverId() == null) {
                throw new BadRequestException("Receiver id is required");
            }
            if (sender.getId().equals(request.getReceiverId())) {
                return;
            }
            recipients = List.of(chatService.getUserById(request.getReceiverId()));
        }

        TypingEventResponse payload = TypingEventResponse.builder()
                .chatRoomId(request.getChatRoomId())
                .senderId(sender.getId())
                .typing(request.isTyping())
                .build();

        for (User recipient : recipients) {
            messagingTemplate.convertAndSendToUser(resolveUserDestinationKey(recipient), TYPING_DESTINATION, payload);
        }
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
        broadcastToRoom(saved.getChatRoom(), MESSAGE_DESTINATION, payload);
        return payload;
    }

    @Transactional
    public ChatMessageResponse deleteMessageForEveryone(String senderEmail, Long messageId) {
        User sender = chatService.getUserByEmail(senderEmail);
        Message message = messageRepository.findByIdAndSenderId(messageId, sender.getId())
                .orElseThrow(() -> new BadRequestException("Message not found"));
        validateDeleteWindow(message);

        message.setContent(StoredMessageContent.buildDeletedPayload());
        Message saved = messageRepository.saveAndFlush(message);
        ChatMessageResponse payload = toResponse(saved, null);
        payload.setEventType("messageDeleted");
        broadcastToRoom(saved.getChatRoom(), MESSAGE_DESTINATION, payload);
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
            broadcastToRoom(room, MESSAGE_DESTINATION, payload);
        }

        return forwardedMessages;
    }

    @Transactional
    public ChatMessageResponse addReaction(String requesterEmail, Long messageId, MessageReactionRequest request) {
        User requester = chatService.getUserByEmail(requesterEmail);
        Message message = findAuthorizedMessage(messageId, requester);
        String emoji = normalizeEmoji(request.getEmoji());

        if (messageReactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, requester.getId(), emoji).isEmpty()) {
            messageReactionRepository.saveAndFlush(MessageReaction.builder()
                    .message(message)
                    .user(requester)
                    .emoji(emoji)
                    .build());
        }

        Message updatedMessage = messageRepository.findDetailedById(messageId)
                .orElseThrow(() -> new BadRequestException("Message not found"));
        ChatMessageResponse payload = toResponse(updatedMessage, null);
        payload.setEventType("messageReactionUpdated");
        broadcastToRoom(updatedMessage.getChatRoom(), MESSAGE_DESTINATION, payload);
        return payload;
    }

    @Transactional
    public ChatMessageResponse removeReaction(String requesterEmail, Long messageId, String emoji) {
        User requester = chatService.getUserByEmail(requesterEmail);
        Message message = findAuthorizedMessage(messageId, requester);
        String normalizedEmoji = normalizeEmoji(emoji);

        MessageReaction reaction = messageReactionRepository.findByMessageIdAndUserIdAndEmoji(
                messageId,
                requester.getId(),
                normalizedEmoji
        )
                .orElseThrow(() -> new ResourceNotFoundException("Reaction not found"));
        messageReactionRepository.delete(reaction);
        messageReactionRepository.flush();

        Message updatedMessage = messageRepository.findDetailedById(messageId)
                .orElseThrow(() -> new BadRequestException("Message not found"));
        ChatMessageResponse payload = toResponse(updatedMessage, null);
        payload.setEventType("messageReactionUpdated");
        broadcastToRoom(updatedMessage.getChatRoom(), MESSAGE_DESTINATION, payload);
        return payload;
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
        if (request.getChatRoomId() != null) {
            return chatService.getAuthorizedRoom(request.getChatRoomId(), sender);
        }
        if (request.getReceiverId() == null) {
            throw new BadRequestException("Receiver id is required");
        }
        return chatService.getOrCreateRoom(sender, request.getReceiverId());
    }

    private ChatMessageResponse toResponse(Message message) {
        return toResponse(message, null);
    }

    private ChatMessageResponse toResponse(Message message, String clientMessageId) {
        StoredMessageContent.ParsedContent parsed = StoredMessageContent.parse(message.getContent());
        return ChatMessageResponse.builder()
                .id(message.getId())
                .clientMessageId(clientMessageId)
                .chatRoomId(message.getChatRoom().getId())
                .roomType(message.getChatRoom().getRoomType())
                .roomName(message.getChatRoom().isGroupRoom() ? message.getChatRoom().getName() : null)
                .senderId(message.getSender().getId())
                .receiverId(message.getReceiver() != null ? message.getReceiver().getId() : null)
                .content(message.getContent())
                .messageType(parsed.messageType())
                .fileUrl(parsed.attachment() != null ? parsed.attachment().url() : null)
                .fileName(parsed.attachment() != null ? parsed.attachment().name() : null)
                .fileContentType(parsed.attachment() != null ? parsed.attachment().contentType() : null)
                .status(message.getStatus())
                .eventType("message")
                .timestamp(message.getCreatedAt())
                .deliveredAt(message.getDeliveredAt())
                .readAt(message.getReadAt())
                .seenBy(message.getSeenBy().stream().map(User::getId).sorted().toList())
                .reactions(message.getReactions().stream()
                        .sorted(Comparator.comparing(MessageReaction::getEmoji).thenComparing(reaction -> reaction.getUser().getId()))
                        .map(reaction -> MessageReactionResponse.builder()
                        .userId(reaction.getUser().getId())
                        .emoji(reaction.getEmoji())
                        .build())
                        .toList())
                .build();
    }

    private Message findAuthorizedMessage(Long messageId, User requester) {
        Message message = messageRepository.findDetailedById(messageId)
                .orElseThrow(() -> new BadRequestException("Message not found"));
        chatService.getAuthorizedRoom(message.getChatRoom().getId(), requester);
        return message;
    }

    private String resolveUserDestinationKey(User user) {
        String destinationKey = user.getUsername();
        if (destinationKey == null || destinationKey.isBlank()) {
            throw new BadRequestException("Unable to resolve user destination");
        }
        return destinationKey;
    }

    private String resolveAttachmentKind(String contentType) {
        if (contentType.startsWith("image/")) {
            return "IMAGE";
        }
        if (contentType.startsWith("video/")) {
            return "VIDEO";
        }
        if ("application/pdf".equals(contentType)) {
            return "PDF";
        }
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
        return StoredMessageContent.asForwarded(originalContent);
    }

    private String normalizeEmoji(String emoji) {
        String normalized = StringUtils.trimWhitespace(emoji);
        if (!StringUtils.hasText(normalized)) {
            throw new BadRequestException("Emoji is required");
        }
        return normalized;
    }

    private void broadcastReadReceipt(ChatRoom room, User reader, LocalDateTime readAt, List<Long> messageIds) {
        ReadReceiptEvent event = ReadReceiptEvent.builder()
                .chatRoomId(room.getId())
                .readerId(reader.getId())
                .readAt(readAt)
                .messageIds(messageIds)
                .build();
        broadcastToRoom(room, READ_RECEIPTS_DESTINATION, event);
    }

    private void broadcastGroupMessage(ChatRoom room, User sender, ChatMessageResponse payload) {
        String topicDestination = GROUP_TOPIC_DESTINATION_PREFIX + room.getId();
        log.debug("Sending group message to: {}", room.getId());
        messagingTemplate.convertAndSend(topicDestination, payload);
        log.debug(
                "Broadcasted group message: chatRoomId={}, senderId={}, topic={}, members={}",
                room.getId(),
                sender.getId(),
                topicDestination,
                room.getParticipants().stream().map(User::getId).toList()
        );
    }

    private void broadcastToRoom(ChatRoom room, String destination, Object payload) {
        for (User participant : room.getParticipants()) {
            messagingTemplate.convertAndSendToUser(resolveUserDestinationKey(participant), destination, payload);
        }
    }
}
