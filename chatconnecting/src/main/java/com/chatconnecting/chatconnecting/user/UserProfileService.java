package com.chatconnecting.chatconnecting.user;

import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.user.dto.UserProfileResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final Path PROFILE_UPLOAD_DIR = Paths.get("uploads", "profile");

    private final UserRepository userRepository;

    @Transactional
    public UserProfileResponse uploadProfileImage(String userEmail, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Profile image file is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File size must be 5MB or less");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only image/jpeg and image/png files are allowed");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String extension = "image/png".equals(contentType) ? "png" : "jpg";
        String fileName = user.getId() + "_" + Instant.now().toEpochMilli() + "." + extension;
        Path uploadDir = PROFILE_UPLOAD_DIR.toAbsolutePath().normalize();
        Path targetPath = uploadDir.resolve(fileName).normalize();

        if (!targetPath.startsWith(uploadDir)) {
            throw new BadRequestException("Invalid file path");
        }

        try {
            Files.createDirectories(uploadDir);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store profile image");
        }

        user.setProfileImageUrl("/uploads/profile/" + fileName);
        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(user);
    }

    private UserProfileResponse toResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .profileImageUrl(StringUtils.hasText(user.getProfileImageUrl()) ? user.getProfileImageUrl() : null)
                .build();
    }
}
