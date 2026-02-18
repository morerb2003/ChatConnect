package com.chatconnecting.chatconnecting.websocket;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {

    private final Map<String, AtomicInteger> activeSessionsByUser = new ConcurrentHashMap<>();

    public boolean connect(String username) {
        AtomicInteger counter = activeSessionsByUser.computeIfAbsent(username, key -> new AtomicInteger(0));
        return counter.incrementAndGet() == 1;
    }

    public boolean disconnect(String username) {
        AtomicInteger counter = activeSessionsByUser.get(username);
        if (counter == null) {
            return false;
        }

        int remaining = counter.decrementAndGet();
        if (remaining <= 0) {
            activeSessionsByUser.remove(username, counter);
            return true;
        }
        return false;
    }

    public boolean isUserOnline(String username) {
        return activeSessionsByUser.containsKey(username);
    }
}
