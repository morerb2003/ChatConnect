package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.common.dto.MessageResponse;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.websocket.dto.CallSignalMessage;
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
public class CallWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(CallWebSocketController.class);

    private final CallSignalingService callSignalingService;

    @MessageMapping("/call.offer")
    public void offer(@Valid @Payload CallSignalMessage message, Principal principal) {
        relay(message, principal);
    }

    @MessageMapping("/call.answer")
    public void answer(@Valid @Payload CallSignalMessage message, Principal principal) {
        relay(message, principal);
    }

    @MessageMapping("/call.ice")
    public void ice(@Valid @Payload CallSignalMessage message, Principal principal) {
        relay(message, principal);
    }

    @MessageMapping("/call.end")
    public void end(@Valid @Payload CallSignalMessage message, Principal principal) {
        relay(message, principal);
    }

    private void relay(CallSignalMessage message, Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new ForbiddenOperationException("Unauthorized websocket request");
        }
        log.debug("Call signal type={} from={} to={}", message.getType(), principal.getName(), message.getTo());
        callSignalingService.relaySignal(principal.getName(), message);
    }

    @MessageExceptionHandler({ForbiddenOperationException.class, BadRequestException.class, IllegalArgumentException.class})
    @SendToUser("/queue/errors")
    public MessageResponse handleKnownMessageExceptions(Exception exception) {
        return new MessageResponse(exception.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/errors")
    public MessageResponse handleMessageExceptions(Exception exception) {
        log.error("Unexpected call websocket error", exception);
        return new MessageResponse("Unexpected call signaling error");
    }
}
