package com.chatconnecting.chatconnecting.chat.dto;

import com.chatconnecting.chatconnecting.chat.ChatRoomType;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {
    private Long chatRoomId;
    private ChatRoomType roomType;
    private String name;
    private Long adminId;
    private Long participantId;
    private String participantName;
    private String participantEmail;
    private List<ChatRoomMemberResponse> members;
}
