package com.example.starter_project.systems.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ListeningHistoryImportResponse {
    private int received;
    private int created;
    private int updated;
    private int skipped;
    private boolean incrementPlayCount;
    private LocalDateTime processedAt;
}
package com.example.starter_project.systems.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ListeningHistoryImportResponse {
    private int received;
    private int created;
    private int updated;
    private int skipped;
    private boolean incrementPlayCount;
    private LocalDateTime processedAt;
}

