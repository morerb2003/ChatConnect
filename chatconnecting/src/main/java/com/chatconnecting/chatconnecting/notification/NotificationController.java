package com.chatconnecting.chatconnecting.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chatconnecting.chatconnecting.common.dto.MessageResponse;
import com.chatconnecting.chatconnecting.notification.dto.RegisterDeviceTokenRequest;
import com.chatconnecting.chatconnecting.notification.service.NotificationService;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.user.UserRepository;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Register a device token for push notifications
     */
    @PostMapping("/device-token")
    public ResponseEntity<MessageResponse> registerDeviceToken(
            @Valid @RequestBody RegisterDeviceTokenRequest request,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        notificationService.registerDeviceToken(
                user,
                request.getToken(),
                request.getDeviceName(),
                request.getDeviceType()
        );

        log.info("Device token registered for user: {}", userEmail);
        return ResponseEntity.ok(new MessageResponse("Device token registered successfully"));
    }

    /**
     * Deactivate a specific device token
     */
    @DeleteMapping("/device-token")
    public ResponseEntity<MessageResponse> deactivateDeviceToken(
            @RequestParam String token,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        notificationService.deactivateToken(token);

        log.info("Device token deactivated for user: {}", userEmail);
        return ResponseEntity.ok(new MessageResponse("Device token deactivated successfully"));
    }

    /**
     * Deactivate all device tokens (logout)
     */
    @DeleteMapping("/device-tokens/all")
    public ResponseEntity<MessageResponse> deactivateAllDeviceTokens(
            Authentication authentication
    ) {
        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        notificationService.deactivateAllUserTokens(user.getId());

        log.info("All device tokens deactivated for user: {}", userEmail);
        return ResponseEntity.ok(new MessageResponse("All device tokens deactivated successfully"));
    }
}
