package com.chatconnecting.chatconnecting.chat;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.chatconnecting.chatconnecting.chat.dto.AssignAdminRequest;
import com.chatconnecting.chatconnecting.chat.dto.ChatRoomResponse;
import com.chatconnecting.chatconnecting.chat.dto.CreateGroupRequest;
import com.chatconnecting.chatconnecting.chat.dto.UpdateGroupMembersRequest;
import com.chatconnecting.chatconnecting.chat.dto.UserChatSummaryResponse;
import com.chatconnecting.chatconnecting.chat.service.ChatService;
import com.chatconnecting.chatconnecting.common.dto.MessageResponse;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.message.dto.AttachmentUploadResponse;
import com.chatconnecting.chatconnecting.message.dto.ChatMessageResponse;
import com.chatconnecting.chatconnecting.message.dto.ForwardMessageRequest;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.dto.MessageReactionRequest;
import com.chatconnecting.chatconnecting.message.dto.MessageUpdateRequest;
import com.chatconnecting.chatconnecting.message.service.MessageService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatService chatService;
    private final MessageService messageService;

    @GetMapping("/users")
    public ResponseEntity<List<UserChatSummaryResponse>> getChatUsers(Authentication authentication) {
        String email = requireAuthEmail(authentication);
        log.debug("Loading chat sidebar users for {}", email);
        return ResponseEntity.ok(chatService.getSidebarUsers(email));
    }

    @PostMapping("/rooms/{userId}")
    public ResponseEntity<ChatRoomResponse> getOrCreateRoom(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        log.info("Chat room request: currentUser={}, receiverUserId={}", email, userId);
        return ResponseEntity.ok(chatService.getOrCreateChatRoom(email, userId));
    }

    @PostMapping("/groups")
    public ResponseEntity<ChatRoomResponse> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.createGroup(email, request));
    }

    @PostMapping("/groups/{chatRoomId}/members")
    public ResponseEntity<ChatRoomResponse> addGroupMembers(
            @PathVariable Long chatRoomId,
            @Valid @RequestBody UpdateGroupMembersRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.addUsersToGroup(email, chatRoomId, request));
    }

    @DeleteMapping("/groups/{chatRoomId}/members/{memberId}")
    public ResponseEntity<ChatRoomResponse> removeGroupMember(
            @PathVariable Long chatRoomId,
            @PathVariable Long memberId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.removeUserFromGroup(email, chatRoomId, memberId));
    }

    @PostMapping("/groups/{chatRoomId}/leave")
    public ResponseEntity<ChatRoomResponse> leaveGroup(
            @PathVariable Long chatRoomId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.leaveGroup(email, chatRoomId));
    }

    @DeleteMapping("/groups/{chatRoomId}")
    public ResponseEntity<ChatRoomResponse> deleteGroup(
            @PathVariable Long chatRoomId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.deleteGroup(email, chatRoomId));
    }

    @PostMapping("/groups/{chatRoomId}/admin")
    public ResponseEntity<ChatRoomResponse> assignAdmin(
            @PathVariable Long chatRoomId,
            @Valid @RequestBody AssignAdminRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(chatService.assignAdmin(email, chatRoomId, request.getAdminId()));
    }

    @GetMapping("/rooms/{chatRoomId}/messages")
    public ResponseEntity<MessagePageResponse> getMessages(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        log.debug("Loading room messages: requester={}, roomId={}, page={}, size={}", email, chatRoomId, page, size);
        return ResponseEntity.ok(messageService.getChatHistory(email, chatRoomId, page, size));
    }

    @PostMapping("/rooms/{chatRoomId}/read")
    public ResponseEntity<MessageResponse> markAsRead(
            @PathVariable Long chatRoomId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        int updatedCount = messageService.markMessagesAsRead(email, chatRoomId);
        log.debug("Marked messages as read: requester={}, roomId={}, updatedCount={}", email, chatRoomId, updatedCount);
        return ResponseEntity.ok(new MessageResponse(updatedCount + " messages marked as read"));
    }

    @PatchMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessageResponse> updateMessage(
            @PathVariable Long messageId,
            @Valid @RequestBody MessageUpdateRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.updateMessage(email, messageId, request.getContent()));
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ChatMessageResponse> deleteMessageForEveryone(
            @PathVariable Long messageId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.deleteMessageForEveryone(email, messageId));
    }

    @DeleteMapping("/messages/{messageId}/me")
    public ResponseEntity<MessageResponse> deleteMessageForMe(
            @PathVariable Long messageId,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        messageService.hideMessageForUser(email, messageId);
        return ResponseEntity.ok(new MessageResponse("Message hidden"));
    }

    @PostMapping("/messages/{messageId}/forward")
    public ResponseEntity<List<ChatMessageResponse>> forwardMessage(
            @PathVariable Long messageId,
            @Valid @RequestBody ForwardMessageRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.forwardMessage(email, messageId, request));
    }

    @GetMapping("/rooms/{chatRoomId}/search")
    public ResponseEntity<MessagePageResponse> searchMessages(
            @PathVariable Long chatRoomId,
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.searchMessages(email, chatRoomId, query, page, size));
    }

    @PostMapping("/messages/{messageId}/reactions")
    public ResponseEntity<ChatMessageResponse> addReaction(
            @PathVariable Long messageId,
            @Valid @RequestBody MessageReactionRequest request,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.addReaction(email, messageId, request));
    }

    @DeleteMapping("/messages/{messageId}/reactions")
    public ResponseEntity<ChatMessageResponse> removeReaction(
            @PathVariable Long messageId,
            @RequestParam String emoji,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.removeReaction(email, messageId, emoji));
    }

    @PostMapping("/attachments")
    public ResponseEntity<AttachmentUploadResponse> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        String email = requireAuthEmail(authentication);
        return ResponseEntity.ok(messageService.uploadAttachment(email, file));
    }

    private String requireAuthEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ForbiddenOperationException("Unauthorized request");
        }
        return authentication.getName();
    }
}
