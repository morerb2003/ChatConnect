package com.chatconnecting.chatconnecting.notification.dto;

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
public class RegisterDeviceTokenRequest {

    private String token;
    private String deviceName;
    private String deviceType; // WEB, MOBILE, DESKTOP
}
