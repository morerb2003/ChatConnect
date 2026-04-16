package com.chatconnecting.chatconnecting.message;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.chatconnecting.chatconnecting.chat.ChatRoomType;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId, Pageable pageable);

    @Query("""
            select m from Message m
             where m.chatRoom.id = :chatRoomId
               and not exists (
                    select 1 from HiddenMessage hm
                     where hm.message.id = m.id
                       and hm.user.id = :viewerId
               )
             order by m.createdAt desc
            """)
    Page<Message> findVisibleByChatRoomIdOrderByCreatedAtDesc(
            @Param("chatRoomId") Long chatRoomId,
            @Param("viewerId") Long viewerId,
            Pageable pageable
    );

    Optional<Message> findTopByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId);

    @Query("""
            select distinct m from Message m
            left join fetch m.seenBy seenBy
            left join fetch m.reactions reactions
            left join fetch reactions.user reactionUser
             where m.id = :messageId
            """)
    Optional<Message> findDetailedById(@Param("messageId") Long messageId);

    long countByChatRoomIdAndReceiverIdAndStatusIn(
            Long chatRoomId,
            Long receiverId,
            Collection<MessageStatus> statuses
    );

    @Query("""
            select count(m) from Message m
             where m.chatRoom.id = :chatRoomId
               and m.sender.id <> :viewerId
               and (
                    (m.chatRoom.roomType = :directType and m.status <> com.chatconnecting.chatconnecting.message.MessageStatus.READ)
                    or
                    (m.chatRoom.roomType = :groupType and not exists (
                        select 1 from m.seenBy seenUser where seenUser.id = :viewerId
                    ))
               )
               and not exists (
                    select 1 from HiddenMessage hm
                     where hm.message.id = m.id
                       and hm.user.id = :viewerId
               )
            """)
    long countUnreadMessagesForViewer(
            @Param("chatRoomId") Long chatRoomId,
            @Param("viewerId") Long viewerId,
            @Param("directType") ChatRoomType directType,
            @Param("groupType") ChatRoomType groupType
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

    Optional<Message> findByIdAndReceiverId(Long id, Long receiverId);

    Optional<Message> findByIdAndSenderId(Long id, Long senderId);

    @Query("""
            select distinct m from Message m
            left join fetch m.seenBy seenBy
             where m.chatRoom.id = :chatRoomId
               and m.sender.id <> :viewerId
             order by m.createdAt asc
            """)
    List<Message> findRoomMessagesForViewer(@Param("chatRoomId") Long chatRoomId, @Param("viewerId") Long viewerId);

    @Query("""
            select distinct m from Message m
            left join fetch m.seenBy seenBy
            left join fetch m.reactions reactions
            left join fetch reactions.user reactionUser
             where m.chatRoom.id = :chatRoomId
               and m.sender.id <> :viewerId
               and not exists (
                    select 1 from HiddenMessage hm
                     where hm.message.id = m.id
                       and hm.user.id = :viewerId
               )
               and (
                    (m.chatRoom.roomType = :directType
                        and m.receiver.id = :viewerId
                        and m.status <> com.chatconnecting.chatconnecting.message.MessageStatus.READ)
                    or
                    (m.chatRoom.roomType = :groupType
                        and not exists (
                            select 1 from m.seenBy seenUser where seenUser.id = :viewerId
                        ))
               )
             order by m.createdAt asc
            """)
    List<Message> findUnreadMessagesForViewer(
            @Param("chatRoomId") Long chatRoomId,
            @Param("viewerId") Long viewerId,
            @Param("directType") ChatRoomType directType,
            @Param("groupType") ChatRoomType groupType
    );

    @Modifying
    @Query("""
            delete from Message m
             where m.chatRoom.id = :chatRoomId
               and m.chatRoom.roomType = :roomType
            """)
    void deleteByRoomAndType(
            @Param("chatRoomId") Long chatRoomId,
            @Param("roomType") ChatRoomType roomType
    );

    // ✅ FIXED: moved inside interface
    @Query("""
            select m from Message m
             where m.chatRoom.id = :chatRoomId
               and lower(m.content) like lower(concat('%', :query, '%'))
               and not exists (
                    select 1 from HiddenMessage hm
                     where hm.message.id = m.id
                       and hm.user.id = :viewerId
               )
             order by m.createdAt desc
            """)
    Page<Message> searchVisibleRoomMessages(
            @Param("chatRoomId") Long chatRoomId,
            @Param("viewerId") Long viewerId,
            @Param("query") String query,
            Pageable pageable
    );
}
