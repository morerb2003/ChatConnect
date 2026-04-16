package com.chatconnecting.chatconnecting.config;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatSchemaCompatibilityInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ChatSchemaCompatibilityInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        try {
            List<String> nonNullableColumns = jdbcTemplate.queryForList(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = database()
                      and table_name = 'chat_rooms'
                      and column_name in ('user_one_id', 'user_two_id')
                      and is_nullable = 'NO'
                    """,
                    String.class
            );

            if (nonNullableColumns.isEmpty()) {
                return;
            }

            log.info("Updating legacy chat_rooms schema to allow nullable direct-user columns: {}", nonNullableColumns);
            jdbcTemplate.execute("""
                    alter table chat_rooms
                        modify column user_one_id bigint null,
                        modify column user_two_id bigint null
                    """);
        } catch (Exception ex) {
            log.warn("Unable to apply chat room schema compatibility update: {}", ex.getMessage());
        }
    }
}
