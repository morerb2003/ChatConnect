package com.chatconnecting.chatconnecting.chat.dto;

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
public class UserChatSummaryResponse {
    private Long userId;
    private String name;
    private String email;
    private String profileImageUrl;
    private boolean online;
    private Long unreadCount;
    private String lastMessagePreview;
    private LocalDateTime lastMessageAt;
    private Long chatRoomId;
}
