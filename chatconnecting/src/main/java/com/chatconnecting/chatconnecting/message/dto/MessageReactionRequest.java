package com.chatconnecting.chatconnecting.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageReactionRequest {

    @NotBlank(message = "Emoji is required")
    @Size(max = 16, message = "Emoji must be at most 16 characters")
    private String emoji;
}
