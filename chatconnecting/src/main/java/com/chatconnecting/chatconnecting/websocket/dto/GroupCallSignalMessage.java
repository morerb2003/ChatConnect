package com.chatconnecting.chatconnecting.websocket.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Map;
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
public class GroupCallSignalMessage {

    @NotNull(message = "Group call signal type is required")
    private GroupCallSignalType type;

    private String from;

    private String to;

    @NotNull(message = "chatRoomId is required")
    @Positive(message = "chatRoomId must be positive")
    private Long chatRoomId;

    @Builder.Default
    private Map<String, Object> data = Map.of();
}
