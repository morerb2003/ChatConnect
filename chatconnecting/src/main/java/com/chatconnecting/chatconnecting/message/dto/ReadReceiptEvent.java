package com.chatconnecting.chatconnecting.message.dto;

import java.time.LocalDateTime;
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
public class ReadReceiptEvent {
    private Long chatRoomId;
    private Long readerId;
    private LocalDateTime readAt;
}
