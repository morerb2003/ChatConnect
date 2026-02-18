package com.chatconnecting.chatconnecting.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {

    private Long chatRoomId;

    @NotNull(message = "Receiver is required")
    private Long receiverId;

    @NotBlank(message = "Message content is required")
    @Size(max = 2000, message = "Message must be at most 2000 characters")
    private String content;

    @Size(max = 100, message = "Client message id must be at most 100 characters")
    private String clientMessageId;
}
