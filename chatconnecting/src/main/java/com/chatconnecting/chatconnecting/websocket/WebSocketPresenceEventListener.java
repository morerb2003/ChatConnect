package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.user.UserRepository;
import com.chatconnecting.chatconnecting.websocket.dto.PresenceEvent;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceEventListener {

    private final PresenceService presenceService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onSessionConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) {
            return;
        }

        boolean becameOnline = presenceService.connect(principal.getName());
        if (becameOnline) {
            publishPresence(principal.getName(), true);
        }
    }

    @EventListener
    public void onSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) {
            return;
        }

        boolean becameOffline = presenceService.disconnect(principal.getName());
        if (becameOffline) {
            publishPresence(principal.getName(), false);
        }
    }

    private void publishPresence(String email, boolean online) {
        userRepository.findByEmail(email).ifPresent(user -> messagingTemplate.convertAndSend(
                "/topic/presence",
                PresenceEvent.builder()
                        .userId(user.getId())
                        .email(user.getEmail())
                        .online(online)
                        .build()
        ));
    }
}
