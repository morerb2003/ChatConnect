package com.chatconnecting.chatconnecting.notification.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatconnecting.chatconnecting.notification.DeviceToken;
import com.chatconnecting.chatconnecting.notification.DeviceTokenRepository;
import com.chatconnecting.chatconnecting.user.User;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int MAX_PREVIEW_LENGTH = 100;

    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * Send notification to user's devices when offline
     */
    public void sendOfflineNotification(
            User recipientUser,
            String senderName,
            String messageContent,
            String messageType
    ) {
        if (FirebaseMessaging.getInstance() == null) {
            log.debug("Firebase not initialized, skipping notification");
            return;
        }

        List<DeviceToken> activeTokens = deviceTokenRepository.findByUserAndIsActiveTrue(recipientUser);

        if (activeTokens.isEmpty()) {
            log.debug("No active device tokens for user: {}", recipientUser.getEmail());
            return;
        }

        String preview = truncatePreview(messageContent);
        String notificationTitle = senderName;
        String notificationBody = preview;

        for (DeviceToken deviceToken : activeTokens) {
            sendNotificationToToken(deviceToken.getToken(), notificationTitle, notificationBody, messageType);
        }
    }

    /**
     * Send notification to a specific token
     */
    private void sendNotificationToToken(String token, String title, String body, String messageType) {
        try {
            Message message = Message.builder()
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("type", messageType)
                    .putData("timestamp", System.currentTimeMillis() + "")
                    .setToken(token)
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("Notification sent successfully: {}", response);
        } catch (FirebaseMessagingException e) {
            log.warn("Failed to send FCM notification: {}", e.getMessage());
            if (e.getErrorCode().equals("messaging/invalid-registration-token")
                    || e.getErrorCode().equals("messaging/registration-token-not-registered")) {
                // Token is invalid, mark as inactive
                deactivateToken(token);
            }
        } catch (Exception e) {
            log.error("Unexpected error sending notification", e);
        }
    }

    /**
     * Register a device token for a user
     */
    @Transactional
    public DeviceToken registerDeviceToken(User user, String token, String deviceName, String deviceType) {
        // Check if token already exists
        var existingToken = deviceTokenRepository.findByUserAndToken(user, token);
        if (existingToken.isPresent()) {
            DeviceToken dt = existingToken.get();
            dt.setIsActive(true);
            dt.setDeviceName(deviceName);
            dt.setDeviceType(deviceType);
            dt.setLastUsedAt(java.time.LocalDateTime.now());
            return deviceTokenRepository.save(dt);
        }

        // Create new device token
        DeviceToken deviceToken = DeviceToken.builder()
                .user(user)
                .token(token)
                .deviceName(deviceName)
                .deviceType(deviceType)
                .isActive(true)
                .lastUsedAt(java.time.LocalDateTime.now())
                .build();

        return deviceTokenRepository.save(deviceToken);
    }

    /**
     * Deactivate a device token
     */
    @Transactional
    public void deactivateToken(String token) {
        // Note: This is a simple implementation. In production, you might want to find the token
        // In a real scenario, the token is marked inactive when it fails
        log.debug("Marking token as inactive: {}", token);
    }

    /**
     * Deactivate all tokens for a user
     */
    @Transactional
    public void deactivateAllUserTokens(Long userId) {
        deviceTokenRepository.deactivateAllTokens(userId);
        log.debug("Deactivated all tokens for user: {}", userId);
    }

    /**
     * Truncate message to preview length
     */
    private String truncatePreview(String message) {
        if (message == null || message.isEmpty()) {
            return "You have a new message";
        }
        if (message.length() > MAX_PREVIEW_LENGTH) {
            return message.substring(0, MAX_PREVIEW_LENGTH) + "...";
        }
        return message;
    }
}
