package com.chatconnecting.chatconnecting.notification.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.FileInputStream;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:}")
    private String firebaseConfigPath;

    @Bean
    public FirebaseApp initializeFirebase() {
        try {
            // Try to initialize from the config file
            if (firebaseConfigPath != null && !firebaseConfigPath.isEmpty()) {
                FileInputStream serviceAccount = new FileInputStream(firebaseConfigPath);
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                if (FirebaseApp.getApps().isEmpty()) {
                    FirebaseApp.initializeApp(options);
                    log.info("Firebase app initialized successfully");
                }
                return FirebaseApp.getInstance();
            } else {
                log.warn("Firebase config path not provided. Push notifications will be disabled.");
                // Allow the app to start without Firebase
                return null;
            }
        } catch (IOException e) {
            log.warn("Failed to initialize Firebase: {}. Push notifications will be disabled.", e.getMessage());
            return null;
        }
    }
}
