package com.chatconnecting.chatconnecting.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentUploadResponse {
    private String fileName;
    private String url;
    private String contentType;
    private long size;
    private String kind;
}

