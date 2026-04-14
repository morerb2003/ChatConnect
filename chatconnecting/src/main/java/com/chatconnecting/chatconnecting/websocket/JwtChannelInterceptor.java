package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.ChatRoomRepository;
import com.chatconnecting.chatconnecting.security.JwtService;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.user.UserRepository;
import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtChannelInterceptor.class);
    private static final Pattern GROUP_MESSAGE_TOPIC_PATTERN = Pattern.compile("^/topic/group/(\\d+)$");
    private static final Pattern GROUP_CALL_TOPIC_PATTERN = Pattern.compile("^/topic/group-call/(\\d+)$");

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
            return message;
        }

        if (!StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String rawToken = resolveAuthorizationHeader(accessor);
        String token = sanitizeToken(rawToken);
        if (token == null) {
            log.warn("Rejecting STOMP CONNECT: missing Authorization header (sessionId={})", accessor.getSessionId());
            throw new BadCredentialsException("Missing JWT token");
        }

        try {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.validateToken(token, userDetails)) {
                throw new BadCredentialsException("Invalid JWT token");
            }

            String principalName = userDetails.getUsername();
            if (principalName == null || principalName.isBlank()) {
                throw new BadCredentialsException("Invalid JWT principal");
            }

            Principal principal = () -> principalName;
            accessor.setUser(principal);
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put("username", principalName);
            }
            log.debug("Accepted STOMP CONNECT for principal={} (sessionId={})", principalName, accessor.getSessionId());
        } catch (BadCredentialsException ex) {
            log.warn("Rejecting STOMP CONNECT: {} (sessionId={})", ex.getMessage(), accessor.getSessionId());
            throw ex;
        } catch (Exception ex) {
            log.warn("Rejecting STOMP CONNECT due to JWT parsing/validation failure (sessionId={})", accessor.getSessionId(), ex);
            throw new BadCredentialsException("Invalid JWT token");
        }

        return message;
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            return;
        }

        Matcher groupMessageMatcher = GROUP_MESSAGE_TOPIC_PATTERN.matcher(destination);
        if (groupMessageMatcher.matches()) {
            authorizeGroupTopicSubscription(accessor, destination, groupMessageMatcher, "group message");
            return;
        }

        Matcher groupCallMatcher = GROUP_CALL_TOPIC_PATTERN.matcher(destination);
        if (groupCallMatcher.matches()) {
            authorizeGroupTopicSubscription(accessor, destination, groupCallMatcher, "group call");
        }
    }

    private void authorizeGroupTopicSubscription(
            StompHeaderAccessor accessor,
            String destination,
            Matcher matcher,
            String topicType
    ) {
        String principalName = resolvePrincipalName(accessor);
        if (principalName == null || principalName.isBlank()) {
            log.warn("Rejecting {} topic SUBSCRIBE: missing principal (destination={}, sessionId={})",
                    topicType, destination, accessor.getSessionId());
            throw new BadCredentialsException("Unauthorized subscription");
        }

        Long roomId;
        try {
            roomId = Long.valueOf(matcher.group(1));
        } catch (NumberFormatException ex) {
            log.warn("Rejecting {} topic SUBSCRIBE: invalid room id (destination={}, sessionId={})",
                    topicType, destination, accessor.getSessionId());
            throw new BadCredentialsException("Invalid destination");
        }

        User user = userRepository.findByEmail(principalName)
                .orElseThrow(() -> new BadCredentialsException("Authenticated user not found"));

        ChatRoom room = chatRoomRepository.findByIdAndParticipant(roomId, user.getId())
                .orElseThrow(() -> {
                    log.warn("Rejecting {} topic SUBSCRIBE: user {} has no access to room {}",
                            topicType, principalName, roomId);
                    return new BadCredentialsException("You do not have access to this group");
                });

        if (!room.isGroupRoom()) {
            log.warn("Rejecting {} topic SUBSCRIBE: destination {} points to non-group room {}",
                    topicType, destination, roomId);
            throw new BadCredentialsException("Invalid group destination");
        }

        log.debug("Accepted {} topic SUBSCRIBE: user={}, roomId={}, sessionId={}",
                topicType, principalName, roomId, accessor.getSessionId());
    }

    private String resolvePrincipalName(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        if (accessor.getSessionAttributes() == null) {
            return null;
        }
        Object username = accessor.getSessionAttributes().get("username");
        return username instanceof String value && !value.isBlank() ? value : null;
    }

    private String resolveAuthorizationHeader(StompHeaderAccessor accessor) {
        String rawToken = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (rawToken == null || rawToken.isBlank()) {
            rawToken = accessor.getFirstNativeHeader("authorization");
        }
        return rawToken;
    }

    private String sanitizeToken(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.startsWith("Bearer ") ? raw.substring(7) : raw;
    }
}
