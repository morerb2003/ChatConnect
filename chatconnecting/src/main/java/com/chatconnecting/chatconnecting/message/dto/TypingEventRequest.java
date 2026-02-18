package com.chatconnecting.chatconnecting.message.dto;

import jakarta.validation.constraints.NotNull;
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

    @NotNull(message = "Receiver is required")
    private Long receiverId;

    private boolean typing;
}
