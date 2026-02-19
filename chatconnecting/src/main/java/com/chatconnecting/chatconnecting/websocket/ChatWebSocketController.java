package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.common.dto.MessageResponse;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.TypingEventRequest;
import com.chatconnecting.chatconnecting.message.service.MessageService;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketController.class);

    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid @Payload ChatMessageRequest request, Principal principal) {
        if (principal == null) {
            log.warn("Rejected chat.send: missing principal");
            throw new ForbiddenOperationException("Unauthorized websocket request");
        }
        log.debug("Received chat.send from {} for receiver={} room={}",
                principal.getName(),
                request.getReceiverId(),
                request.getChatRoomId());
        messageService.sendMessage(principal.getName(), request);
    }

    @MessageMapping("/chat.typing")
    public void sendTyping(@Valid @Payload TypingEventRequest request, Principal principal) {
        if (principal == null) {
            log.warn("Rejected chat.typing: missing principal");
            throw new ForbiddenOperationException("Unauthorized websocket request");
        }
        log.debug("Received chat.typing from {} for receiver={} room={} typing={}",
                principal.getName(),
                request.getReceiverId(),
                request.getChatRoomId(),
                request.isTyping());
        messageService.sendTypingEvent(principal.getName(), request);
    }

    @MessageExceptionHandler({ForbiddenOperationException.class, BadRequestException.class, IllegalArgumentException.class})
    @SendToUser("/queue/errors")
    public MessageResponse handleKnownMessageExceptions(Exception exception) {
        log.warn("WebSocket message rejected: {}", exception.getMessage());
        return new MessageResponse(exception.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public MessageResponse handleMessageExceptions(Exception exception) {
        log.error("Unexpected websocket message error", exception);
        return new MessageResponse("Unexpected websocket server error");
    }
}
