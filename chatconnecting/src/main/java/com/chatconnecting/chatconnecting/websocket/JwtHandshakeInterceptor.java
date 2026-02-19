package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.security.JwtService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtHandshakeInterceptor.class);

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String token = resolveToken(request);
        if (token == null) {
            // SockJS/WebSocket handshake usually cannot send Authorization headers.
            // JWT validation is enforced on STOMP CONNECT in JwtChannelInterceptor.
            return true;
        }

        try {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.validateToken(token, userDetails)) {
                log.warn("Rejecting websocket handshake due to invalid JWT (uri={})", request.getURI());
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            attributes.put("username", username);
            return true;
        } catch (Exception ex) {
            log.warn("Rejecting websocket handshake due to JWT parsing/validation error (uri={})", request.getURI(), ex);
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        if (exception != null) {
            log.warn("Websocket handshake failed (uri={})", request.getURI(), exception);
        }
    }

    private String resolveToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        return sanitizeToken(authHeader);
    }

    private String sanitizeToken(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.startsWith("Bearer ") ? raw.substring(7) : raw;
    }
}
