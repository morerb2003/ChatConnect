package com.chatconnecting.chatconnecting.message;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;

public final class StoredMessageContent {

    public static final String META_PREFIX = "__CHATCONNECT_META__:";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private StoredMessageContent() {
    }

    public static ParsedContent parse(String content) {
        String raw = content == null ? "" : content;
        if (!raw.startsWith(META_PREFIX)) {
            return new ParsedContent(raw, null, false, null, false, null);
        }

        try {
            JsonNode root = OBJECT_MAPPER.readTree(raw.substring(META_PREFIX.length()));
            return new ParsedContent(
                    readText(root.path("text")),
                    readReply(root.path("replyTo")),
                    root.path("forwarded").asBoolean(false),
                    readAttachment(root.path("attachment")),
                    root.path("deletedForEveryone").asBoolean(false),
                    readNullableText(root.path("editedAt"))
            );
        } catch (Exception ignored) {
            return new ParsedContent(raw, null, false, null, false, null);
        }
    }

    public static String buildDeletedPayload() {
        return META_PREFIX + "{\"v\":1,\"text\":\"\",\"deletedForEveryone\":true}";
    }

    public static String asForwarded(String originalContent) {
        ParsedContent parsed = parse(originalContent);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("v", 1);
        payload.put("text", parsed.text());
        if (parsed.replyTo() != null) {
            Map<String, Object> reply = new LinkedHashMap<>();
            reply.put("id", parsed.replyTo().id());
            reply.put("senderName", parsed.replyTo().senderName());
            reply.put("text", parsed.replyTo().text());
            payload.put("replyTo", reply);
        }
        payload.put("forwarded", true);
        if (parsed.attachment() != null) {
            Map<String, Object> attachment = new LinkedHashMap<>();
            attachment.put("url", parsed.attachment().url());
            attachment.put("name", parsed.attachment().name());
            attachment.put("size", parsed.attachment().size());
            attachment.put("contentType", parsed.attachment().contentType());
            attachment.put("kind", parsed.attachment().kind());
            payload.put("attachment", attachment);
        }
        payload.put("deletedForEveryone", parsed.deletedForEveryone());
        if (parsed.editedAt() != null && !parsed.editedAt().isBlank()) {
            payload.put("editedAt", parsed.editedAt());
        }

        try {
            return META_PREFIX + OBJECT_MAPPER.writeValueAsString(payload);
        } catch (Exception ignored) {
            return originalContent == null ? "" : originalContent;
        }
    }

    public record ParsedContent(
            String text,
            ReplyPreview replyTo,
            boolean forwarded,
            Attachment attachment,
            boolean deletedForEveryone,
            String editedAt
    ) {
        public String preview() {
            if (deletedForEveryone) {
                return "Message deleted";
            }
            if (text != null && !text.isBlank()) {
                return text;
            }
            if (attachment != null && attachment.name() != null && !attachment.name().isBlank()) {
                return attachment.kind() + ": " + attachment.name();
            }
            return "";
        }

        public String messageType() {
            if (attachment == null) {
                return "text";
            }
            String kind = attachment.kind() == null ? "" : attachment.kind().toUpperCase();
            return switch (kind) {
                case "IMAGE" -> "image";
                case "VIDEO" -> "video";
                default -> "file";
            };
        }
    }

    public record ReplyPreview(Long id, String senderName, String text) {
    }

    public record Attachment(String url, String name, Long size, String contentType, String kind) {
    }

    private static ReplyPreview readReply(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        Long id = node.path("id").isNumber() ? node.path("id").asLong() : null;
        return new ReplyPreview(id, readNullableText(node.path("senderName")), readNullableText(node.path("text")));
    }

    private static Attachment readAttachment(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        Long size = node.path("size").isNumber() ? node.path("size").asLong() : null;
        return new Attachment(
                readNullableText(node.path("url")),
                readNullableText(node.path("name")),
                size,
                readNullableText(node.path("contentType")),
                readNullableText(node.path("kind"))
        );
    }

    private static String readText(JsonNode node) {
        String value = readNullableText(node);
        return value == null ? "" : value;
    }

    private static String readNullableText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String value = node.asText();
        return value == null ? null : value;
    }
}
