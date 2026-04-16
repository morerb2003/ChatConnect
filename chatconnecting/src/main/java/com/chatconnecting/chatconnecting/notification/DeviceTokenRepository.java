package com.chatconnecting.chatconnecting.notification;

import com.chatconnecting.chatconnecting.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    List<DeviceToken> findByUserAndIsActiveTrue(User user);

    Optional<DeviceToken> findByUserAndToken(User user, String token);

    List<DeviceToken> findByUserIdAndIsActiveTrue(Long userId);

    @Modifying
    @Query("UPDATE DeviceToken dt SET dt.isActive = false WHERE dt.user.id = :userId AND dt.token = :token")
    int deactivateToken(@Param("userId") Long userId, @Param("token") String token);

    @Modifying
    @Query("UPDATE DeviceToken dt SET dt.isActive = false WHERE dt.user.id = :userId")
    int deactivateAllTokens(@Param("userId") Long userId);

    @Query("SELECT dt FROM DeviceToken dt WHERE dt.user.id = :userId AND dt.isActive = true")
    List<DeviceToken> findActiveTokensByUserId(@Param("userId") Long userId);
}
