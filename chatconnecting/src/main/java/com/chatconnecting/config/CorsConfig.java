package com.chatconnecting.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS Configuration for handling cross-origin requests Allows the frontend
 * (Railway) to communicate with this backend
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(
                                "http://localhost:3000", // Local development
                                "http://localhost:5173", // Local Vite dev
                                "https://chatconnect-production.up.railway.app", // Your frontend on Railway
                                "https://chatconnect-frontend.vercel.app", // If using Vercel
                                "https://chatconnect-frontend.netlify.app" // If using Netlify
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
