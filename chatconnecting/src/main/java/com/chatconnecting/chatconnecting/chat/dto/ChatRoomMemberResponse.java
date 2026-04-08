package com.chatconnecting.chatconnecting.chat.dto;

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
public class ChatRoomMemberResponse {
    private Long userId;
    private String name;
    private String email;
    private String profileImageUrl;
    private boolean online;
}
