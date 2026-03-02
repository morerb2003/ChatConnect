package com.chatconnecting.chatconnecting.message.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ForwardMessageRequest {

    @NotEmpty(message = "At least one target user is required")
    private List<@NotNull(message = "Target user id is required") Long> targetUserIds;
}

