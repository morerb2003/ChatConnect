package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.user.UserRepository;
import com.chatconnecting.chatconnecting.websocket.dto.CallSignalMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CallSignalingService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void relaySignal(String authenticatedEmail, CallSignalMessage message) {
        String target = normalize(message.getTo());
        String source = normalize(authenticatedEmail);
        if (target == null || source == null) {
            throw new BadRequestException("Invalid call signaling payload");
        }
        if (source.equalsIgnoreCase(target)) {
            throw new BadRequestException("You cannot start a call with yourself");
        }
        if (!userRepository.existsByEmail(target)) {
            throw new ResourceNotFoundException("Call target user not found");
        }

        message.setFrom(source);
        message.setTo(target);
        messagingTemplate.convertAndSendToUser(target, "/queue/call", message);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
