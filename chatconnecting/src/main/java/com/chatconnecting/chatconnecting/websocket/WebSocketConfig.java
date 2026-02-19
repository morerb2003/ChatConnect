package com.chatconnecting.chatconnecting.websocket;

import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    @Value("${app.ws.allowed-origins:http://localhost:5173}")
    private String wsAllowedOrigins;

    private final JwtChannelInterceptor jwtChannelInterceptor;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        log.info("Registering STOMP endpoint /ws with allowed origins={}", wsAllowedOrigins);
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(parseOrigins(wsAllowedOrigins))
                .setHandshakeHandler(stompPrincipalHandshakeHandler())
                .addInterceptors(jwtHandshakeInterceptor)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        log.info("Configuring message broker: appPrefix=/app, simpleBroker=[/topic,/queue], userPrefix=/user");
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        log.info("Registering inbound channel interceptor for JWT CONNECT validation");
        registration.interceptors(jwtChannelInterceptor);
    }

    @Bean
    public StompPrincipalHandshakeHandler stompPrincipalHandshakeHandler() {
        return new StompPrincipalHandshakeHandler();
    }

    private String[] parseOrigins(String rawOrigins) {
        return Arrays.stream(rawOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }
}
