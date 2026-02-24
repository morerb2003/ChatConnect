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
public class ReadMessageRequest {

    @NotNull(message = "Message id is required")
    private Long messageId;

    private Long senderId;
    private Long receiverId;
}
