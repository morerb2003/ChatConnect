package com.chatconnecting.chatconnecting.websocket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CallSignalMessage {

    @NotNull(message = "Call signal type is required")
    private CallSignalType type;

    private String from;

    @NotBlank(message = "Target username is required")
    private String to;

    @Builder.Default
    private Map<String, Object> data = Map.of();
}
