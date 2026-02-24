package com.chatconnecting.chatconnecting.user;

import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.user.dto.UserProfileResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final ChatService chatService;
    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<List<UserChatSummaryResponse>> getUsersExcludingSelf(Authentication authentication) {
        return ResponseEntity.ok(chatService.getSidebarUsers(authentication.getName()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUserProfile(Authentication authentication) {
        return ResponseEntity.ok(userProfileService.getCurrentUserProfile(requireAuthEmail(authentication)));
    }

    @PostMapping("/upload-profile")
    public ResponseEntity<UserProfileResponse> uploadProfile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return ResponseEntity.ok(userProfileService.uploadProfileImage(requireAuthEmail(authentication), file));
    }

    private String requireAuthEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ForbiddenOperationException("Unauthorized request");
        }
        return authentication.getName();
    }
}
