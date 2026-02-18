package com.chatconnecting.chatconnecting.message.dto;

import com.chatconnecting.chatconnecting.message.MessageStatus;
import java.time.LocalDateTime;
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
    private Long senderId;
    private Long receiverId;
    private String content;
    private MessageStatus status;
    private LocalDateTime timestamp;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;
}
