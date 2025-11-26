package com.example.starter_project.systems.scheduler;

import com.example.starter_project.systems.service.BehaviorEmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Scheduler tính behavior embedding. Hiện đang disable cho môi trường test.
 * Khi muốn chạy định kỳ, chỉ cần bỏ comment @Scheduled và gọi service bên trong.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BehaviorEmbeddingScheduler {

    private final BehaviorEmbeddingService behaviorEmbeddingService;

    /**
     * Uncomment @Scheduled khi cần bật cron job.
     */
    // @Scheduled(cron = "0 30 3 * * *", zone = "Asia/Ho_Chi_Minh")
    public void recomputeBehaviorEmbeddingsJob() {
        log.info("[BehaviorEmbeddingScheduler] Scheduler đang disable trong môi trường test. "
                + "Bỏ comment @Scheduled để kích hoạt job.");
        log.debug("[BehaviorEmbeddingScheduler] BehaviorEmbeddingService bean: {}",
                behaviorEmbeddingService.getClass().getSimpleName());
        // BehaviorEmbeddingService.BehaviorEmbeddingReport report = behaviorEmbeddingService.recomputeBehaviorEmbeddings();
        // log.info("[BehaviorEmbeddingScheduler] Behavior embedding job completed: updated {} / {} (cutoff {})",
        //         report.getUpdatedSongs(), report.getTotalSongs(), report.getCutoff());
    }

    /**
     * Cho phép admin gọi thủ công khi cần kiểm tra thuật toán (ví dụ qua shell).
     */
    public BehaviorEmbeddingService.BehaviorEmbeddingReport triggerOnceForDebug() {
        return behaviorEmbeddingService.recomputeBehaviorEmbeddings();
    }
}

