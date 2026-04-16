package com.chatconnecting.chatconnecting.chat;

import com.chatconnecting.chatconnecting.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
        name = "chat_rooms",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_one_id", "user_two_id"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 16)
    @Builder.Default
    private ChatRoomType roomType = ChatRoomType.DIRECT;

    @Column(length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private User admin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_one_id", nullable = true)
    private User userOne;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_two_id", nullable = true)
    private User userTwo;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "chat_room_members",
            joinColumns = @JoinColumn(name = "chat_room_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> members = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public boolean isGroupRoom() {
        return roomType == ChatRoomType.GROUP;
    }

    public Set<User> getParticipants() {
        if (members != null && !members.isEmpty()) {
            return members;
        }

        Set<User> fallback = new LinkedHashSet<>();
        if (userOne != null) {
            fallback.add(userOne);
        }
        if (userTwo != null) {
            fallback.add(userTwo);
        }
        return fallback;
    }

    public boolean hasParticipant(Long userId) {
        if (userId == null) {
            return false;
        }
        return getParticipants().stream().anyMatch(user -> userId.equals(user.getId()));
    }

    public User getOtherParticipant(Long userId) {
        if (isGroupRoom()) {
            throw new IllegalStateException("Group rooms do not have a single other participant");
        }
        return userOne != null && userOne.getId().equals(userId) ? userTwo : userOne;
    }
}
