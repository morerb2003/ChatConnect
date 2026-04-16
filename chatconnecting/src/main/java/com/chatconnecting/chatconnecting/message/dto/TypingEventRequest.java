package com.chatconnecting.chatconnecting.message.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TypingEventRequest {

    private Long chatRoomId;

    private Long receiverId;

    private boolean typing;
}
