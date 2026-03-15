package com.chatconnecting.chatconnecting.message;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HiddenMessageRepository extends JpaRepository<HiddenMessage, Long> {
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
}

