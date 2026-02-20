package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.security.JwtService;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtChannelInterceptor.class);

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
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

            UsernamePasswordAuthenticationToken authentication =
                    UsernamePasswordAuthenticationToken.authenticated(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
            accessor.setUser(authentication);
            log.debug("Accepted STOMP CONNECT for user={} (sessionId={})", username, accessor.getSessionId());
        } catch (BadCredentialsException ex) {
            log.warn("Rejecting STOMP CONNECT: {} (sessionId={})", ex.getMessage(), accessor.getSessionId());
            throw ex;
        } catch (Exception ex) {
            log.warn("Rejecting STOMP CONNECT due to JWT parsing/validation failure (sessionId={})", accessor.getSessionId(), ex);
            throw new BadCredentialsException("Invalid JWT token");
        }

        return message;
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
