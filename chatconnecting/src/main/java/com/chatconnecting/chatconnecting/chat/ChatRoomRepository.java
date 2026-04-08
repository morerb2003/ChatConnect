package com.chatconnecting.chatconnecting.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByUserOneIdAndUserTwoId(Long userOneId, Long userTwoId);

    @Query("""
            SELECT r FROM ChatRoom r
            WHERE
                r.roomType = com.chatconnecting.chatconnecting.chat.ChatRoomType.DIRECT
                AND
                (
                (r.userOne.id = :firstUserId AND r.userTwo.id = :secondUserId)
                OR
                (r.userOne.id = :secondUserId AND r.userTwo.id = :firstUserId)
                )
            """)
    Optional<ChatRoom> findRoomBetweenUsers(
            @Param("firstUserId") Long firstUserId,
            @Param("secondUserId") Long secondUserId
    );

    @Query("""
            select distinct c
            from ChatRoom c
            left join fetch c.members members
            left join fetch c.admin
            where c.roomType = com.chatconnecting.chatconnecting.chat.ChatRoomType.GROUP
              and exists (
                    select 1
                    from c.members groupMembers
                    where groupMembers.id = :userId
              )
            order by c.updatedAt desc
            """)
    List<ChatRoom> findGroupRoomsForUser(@Param("userId") Long userId);

    @Query("""
            select c
            from ChatRoom c
            left join fetch c.userOne userOne
            left join fetch c.userTwo userTwo
            left join fetch c.members members
            left join fetch c.admin
            where c.id = :roomId
              and (
                    userOne.id = :userId
                    or userTwo.id = :userId
                    or exists (
                        select 1
                        from c.members members
                        where members.id = :userId
                    )
              )
            """)
    Optional<ChatRoom> findByIdAndParticipant(@Param("roomId") Long roomId, @Param("userId") Long userId);
}
