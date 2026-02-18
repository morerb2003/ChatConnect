package com.chatconnecting.chatconnecting.chat;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByUserOneIdAndUserTwoId(Long userOneId, Long userTwoId);

    @Query("""
            select c
            from ChatRoom c
            where c.id = :roomId
              and (c.userOne.id = :userId or c.userTwo.id = :userId)
            """)
    Optional<ChatRoom> findByIdAndParticipant(@Param("roomId") Long roomId, @Param("userId") Long userId);
}
