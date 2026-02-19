package com.chatconnecting.chatconnecting.message;

import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.message.dto.MessagePageResponse;
import com.chatconnecting.chatconnecting.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;

    @GetMapping("/{chatRoomId}")
    public ResponseEntity<MessagePageResponse> getMessagesByRoom(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ForbiddenOperationException("Unauthorized request");
        }
        log.debug("Loading legacy room messages endpoint for user={} room={} page={} size={}",
                authentication.getName(),
                chatRoomId,
                page,
                size);
        return ResponseEntity.ok(messageService.getChatHistory(authentication.getName(), chatRoomId, page, size));
    }
}
