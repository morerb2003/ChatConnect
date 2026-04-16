package com.chatconnecting.chatconnecting;

import java.net.InetAddress;
import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class ChatconnectingApplication {

    private static final Logger logger = LoggerFactory.getLogger(ChatconnectingApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ChatconnectingApplication.class);
        Environment env = app.run(args).getEnvironment();

        String protocol = "http";
        String serverPort = env.getProperty("server.port", "8080");
        String contextPath = env.getProperty("server.servlet.context-path", "");
        String hostAddress = "localhost";

        try {
            hostAddress = InetAddress.getLocalHost().getHostAddress();
        } catch (Exception ignored) {
        }

        logger.info("=============================================================");
        logger.info("Application '{}' is running! Access URLs:", env.getProperty("spring.application.name"));
        logger.info("  Local:     {}://localhost:{}{}", protocol, serverPort, contextPath);
        logger.info("  Network:   {}://{}:{}{}", protocol, hostAddress, serverPort, contextPath);
        logger.info("  Profiles:  {}", Arrays.toString(env.getActiveProfiles()));
        logger.info("=============================================================");

        String mysqlUrl = env.getProperty("spring.datasource.url", "Not configured");
        logger.info("Database URL: {}", mysqlUrl);
        logger.info("Database User: {}", env.getProperty("spring.datasource.username", "Not configured"));
        logger.info("Application started successfully!");
    }

}
