package com.chatconnecting.chatconnecting.chat.dto;

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
public class RoomEventResponse {
    private String eventType;
    private Long chatRoomId;
    private Long affectedUserId;
    private ChatRoomResponse room;
}
