package com.chatconnecting.chatconnecting.message.dto;

import com.chatconnecting.chatconnecting.chat.ChatRoomType;
import com.chatconnecting.chatconnecting.message.MessageStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private Long id;
    private String clientMessageId;
    private Long chatRoomId;
    private ChatRoomType roomType;
    private String roomName;
    private Long senderId;
    private Long receiverId;
    private String content;
    private String messageType;
    private String fileUrl;
    private String fileName;
    private String fileContentType;
    private MessageStatus status;
    private String eventType;
    private LocalDateTime timestamp;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;
    private List<Long> seenBy;
    private List<MessageReactionResponse> reactions;
}
