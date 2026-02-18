package com.chatconnecting.chatconnecting.chat;

import com.chatconnecting.chatconnecting.chat.dto.ChatRoomResponse;
import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.common.dto.MessageResponse;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.service.MessageService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final MessageService messageService;

    @GetMapping("/users")
    public ResponseEntity<List<UserChatSummaryResponse>> getChatUsers(Authentication authentication) {
        return ResponseEntity.ok(chatService.getSidebarUsers(authentication.getName()));
    }

    @PostMapping("/rooms/{participantId}")
    public ResponseEntity<ChatRoomResponse> getOrCreateRoom(
            @PathVariable Long participantId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(chatService.getOrCreateChatRoom(authentication.getName(), participantId));
    }

    @GetMapping("/rooms/{chatRoomId}/messages")
    public ResponseEntity<MessagePageResponse> getMessages(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(messageService.getChatHistory(authentication.getName(), chatRoomId, page, size));
    }

    @PostMapping("/rooms/{chatRoomId}/read")
    public ResponseEntity<MessageResponse> markAsRead(
            @PathVariable Long chatRoomId,
            Authentication authentication
    ) {
        int updatedCount = messageService.markMessagesAsRead(authentication.getName(), chatRoomId);
        return ResponseEntity.ok(new MessageResponse(updatedCount + " messages marked as read"));
    }
}
