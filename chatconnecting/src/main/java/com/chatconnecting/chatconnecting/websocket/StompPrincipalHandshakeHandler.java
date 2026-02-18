package com.chatconnecting.chatconnecting.websocket;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

public class StompPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        Object username = attributes.get("username");
        if (username instanceof String value && !value.isBlank()) {
            return () -> value;
        }
        return super.determineUser(request, wsHandler, attributes);
    }
}
