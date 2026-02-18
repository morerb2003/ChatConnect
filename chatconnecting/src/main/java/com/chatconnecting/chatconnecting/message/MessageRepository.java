package com.chatconnecting.chatconnecting.message;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId, Pageable pageable);

    Optional<Message> findTopByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId);

    long countByChatRoomIdAndReceiverIdAndStatusIn(
            Long chatRoomId,
            Long receiverId,
            Collection<MessageStatus> statuses
    );

    @Modifying
    @Query("""
            update Message m
               set m.status = com.chatconnecting.chatconnecting.message.MessageStatus.READ,
                   m.readAt = :readAt
             where m.chatRoom.id = :chatRoomId
               and m.receiver.id = :readerId
               and m.sender.id = :senderId
               and m.status <> com.chatconnecting.chatconnecting.message.MessageStatus.READ
            """)
    int markMessagesAsRead(
            @Param("chatRoomId") Long chatRoomId,
            @Param("readerId") Long readerId,
            @Param("senderId") Long senderId,
            @Param("readAt") LocalDateTime readAt
    );

    @Modifying
    @Query("""
            update Message m
               set m.status = com.chatconnecting.chatconnecting.message.MessageStatus.DELIVERED,
                   m.deliveredAt = :deliveredAt
             where m.chatRoom.id = :chatRoomId
               and m.receiver.id = :receiverId
               and m.status = com.chatconnecting.chatconnecting.message.MessageStatus.SENT
            """)
    int markRoomMessagesAsDelivered(
            @Param("chatRoomId") Long chatRoomId,
            @Param("receiverId") Long receiverId,
            @Param("deliveredAt") LocalDateTime deliveredAt
    );
}
