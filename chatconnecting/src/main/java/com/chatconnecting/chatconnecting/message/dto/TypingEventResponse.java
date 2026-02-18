package com.chatconnecting.chatconnecting.message.dto;

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
public class TypingEventResponse {
    private Long chatRoomId;
    private Long senderId;
    private boolean typing;
}
