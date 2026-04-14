package com.chatconnecting.chatconnecting.websocket;

import com.chatconnecting.chatconnecting.chat.ChatRoom;
import com.chatconnecting.chatconnecting.chat.ChatRoomRepository;
import com.chatconnecting.chatconnecting.exception.BadRequestException;
import com.chatconnecting.chatconnecting.exception.ForbiddenOperationException;
import com.chatconnecting.chatconnecting.exception.ResourceNotFoundException;
import com.chatconnecting.chatconnecting.user.User;
import com.chatconnecting.chatconnecting.user.UserRepository;
import com.chatconnecting.chatconnecting.websocket.dto.CallSignalMessage;
import com.chatconnecting.chatconnecting.websocket.dto.GroupCallSignalMessage;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CallSignalingService {

    private static final Logger log = LoggerFactory.getLogger(CallSignalingService.class);

    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void relayDirectSignal(String authenticatedEmail, CallSignalMessage message) {
        String target = normalize(message.getTo());
        String source = normalize(authenticatedEmail);
        if (target == null || source == null) {
            throw new BadRequestException("Invalid call signaling payload");
        }
        if (source.equalsIgnoreCase(target)) {
            throw new BadRequestException("You cannot start a call with yourself");
        }
        if (!userRepository.existsByEmail(target)) {
            throw new ResourceNotFoundException("Call target user not found");
        }

        message.setFrom(source);
        message.setTo(target);
        log.debug("Relaying direct call signal type={} from={} to={}", message.getType(), source, target);
        messagingTemplate.convertAndSendToUser(target, "/queue/call", message);
    }

    public void relayGroupSignal(String authenticatedEmail, GroupCallSignalMessage message) {
        String source = normalize(authenticatedEmail);
        if (source == null || message == null || message.getChatRoomId() == null) {
            throw new BadRequestException("Invalid group call signaling payload");
        }

        User sender = userRepository.findByEmail(source)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));

        ChatRoom room = chatRoomRepository.findByIdAndParticipant(message.getChatRoomId(), sender.getId())
                .orElseThrow(() -> new ForbiddenOperationException("You are not a member of this group"));

        if (!room.isGroupRoom()) {
            throw new BadRequestException("Group call signaling is allowed only for group rooms");
        }

        String target = normalize(message.getTo());
        if (target != null) {
            boolean targetExistsInRoom = room.getParticipants().stream()
                    .anyMatch(member -> target.equalsIgnoreCase(member.getEmail()));
            if (!targetExistsInRoom) {
                throw new BadRequestException("Target user is not a member of this group");
            }
        }

        if (message.getData() == null) {
            message.setData(Map.of());
        }
        message.setFrom(source);
        message.setTo(target);

        String destination = "/topic/group-call/" + room.getId();
        log.info("Sending group call signal: type={}, roomId={}, from={}, to={}",
                message.getType(), room.getId(), source, target);
        messagingTemplate.convertAndSend(destination, message);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
