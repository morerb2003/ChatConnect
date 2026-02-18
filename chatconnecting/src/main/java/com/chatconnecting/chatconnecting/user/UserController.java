package com.chatconnecting.chatconnecting.user;

import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<List<UserChatSummaryResponse>> getUsersExcludingSelf(Authentication authentication) {
        return ResponseEntity.ok(chatService.getSidebarUsers(authentication.getName()));
    }
}
