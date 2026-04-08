package com.chatconnecting.chatconnecting.chat.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGroupMembersRequest {
    @NotEmpty(message = "Select at least one member")
    private List<Long> memberIds;
}
