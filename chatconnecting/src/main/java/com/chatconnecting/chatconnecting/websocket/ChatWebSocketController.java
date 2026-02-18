package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.TypingEventRequest;
import com.chatconnecting.chatconnecting.message.service.MessageService;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid @Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            throw new ForbiddenOperationException("Unauthorized websocket request");
        }
        messageService.sendMessage(principal.getName(), request);
    }

    @MessageMapping("/chat.typing")
    public void sendTyping(@Valid @Payload TypingEventRequest request, Principal principal) {
        if (principal == null) {
            throw new ForbiddenOperationException("Unauthorized websocket request");
        }
        messageService.sendTypingEvent(principal.getName(), request);
    }
}
