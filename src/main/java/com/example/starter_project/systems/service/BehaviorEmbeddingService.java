package com.example.starter_project.systems.service;

import com.example.starter_project.systems.entity.ListeningHistory;
import com.example.starter_project.systems.entity.Song;
import com.example.starter_project.systems.enums.SongStatus;
import com.example.starter_project.systems.repository.ListeningHistoryRepository;
import com.example.starter_project.systems.repository.SongRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.DoubleSummaryStatistics;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Kết hợp vector hành vi dựa trên lịch sử nghe để tăng độ chính xác recommend.
 * Scheduler sẽ gọi service này, nhưng hiện tại job đang disable cho môi trường test.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BehaviorEmbeddingService {

    private static final int DEFAULT_LOOKBACK_DAYS = 30;
    private static final int MAX_SEQUENCE_GAP_MINUTES = 60;
    private static final double BEHAVIOR_WEIGHT = 0.35;

    private final ListeningHistoryRepository listeningHistoryRepository;
    private final SongRepository songRepository;
    private final EmbeddingService embeddingService;

    /**
     * Recompute behavior embeddings từ lịch sử nghe gần đây.
     */
    @Transactional
    public BehaviorEmbeddingReport recomputeBehaviorEmbeddings() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(DEFAULT_LOOKBACK_DAYS);
        List<ListeningHistory> recentHistories = listeningHistoryRepository.findByListenedAtAfter(cutoff);
        if (recentHistories.isEmpty()) {
            log.info("[BehaviorEmbeddingService] Không có listening history mới kể từ {}", cutoff);
            return new BehaviorEmbeddingReport(0, 0, cutoff);
        }

        Map<Long, List<ListeningHistory>> historiesByUser = recentHistories.stream()
                .filter(h -> h.getUserId() != null && h.getSongId() != null)
                .collect(Collectors.groupingBy(ListeningHistory::getUserId));

        Map<Long, Map<Long, Double>> adjacencyMatrix = buildAdjacencyMatrix(historiesByUser);

        List<Song> songs = songRepository.findAll();
        Map<Long, double[]> contentVectors = songs.stream()
                .filter(s -> s.getVector() != null && !s.getVector().isBlank())
                .collect(Collectors.toMap(Song::getId, s -> embeddingService.parseVector(s.getVector())));

        List<Song> toUpdate = new ArrayList<>();
        int updated = 0;

        for (Song song : songs) {
            if (song.getStatus() != SongStatus.ACTIVE) {
                continue;
            }

            double[] contentVector = contentVectors.get(song.getId());
            if (contentVector == null || contentVector.length == 0) {
                continue;
            }

            Map<Long, Double> neighbors = adjacencyMatrix.get(song.getId());
            if (neighbors == null || neighbors.isEmpty()) {
                continue;
            }

            double[] behaviorVector = aggregateBehaviorVector(neighbors, contentVectors, contentVector.length);
            if (behaviorVector == null) {
                continue;
            }

            double[] mergedVector = mergeVectors(contentVector, behaviorVector);
            song.setBehaviorEmbedding(embeddingService.vectorToJson(behaviorVector));
            song.setVector(embeddingService.vectorToJson(mergedVector));
            toUpdate.add(song);
            updated++;
        }

        if (!toUpdate.isEmpty()) {
            songRepository.saveAll(toUpdate);
        }

        log.info("[BehaviorEmbeddingService] Behavior embedding cập nhật cho {} / {} bài hát (lookback {} ngày)",
                updated, songs.size(), DEFAULT_LOOKBACK_DAYS);

        return new BehaviorEmbeddingReport(songs.size(), updated, cutoff);
    }

    private Map<Long, Map<Long, Double>> buildAdjacencyMatrix(Map<Long, List<ListeningHistory>> historiesByUser) {
        Map<Long, Map<Long, Double>> adjacency = new HashMap<>();

        historiesByUser.values().forEach(histories -> {
            histories.sort(Comparator.comparing(ListeningHistory::getListenedAt, Comparator.nullsLast(Comparator.naturalOrder())));

            for (int i = 0; i < histories.size() - 1; i++) {
                ListeningHistory current = histories.get(i);
                ListeningHistory next = histories.get(i + 1);

                if (current.getSongId() == null || next.getSongId() == null) {
                    continue;
                }
                if (Objects.equals(current.getSongId(), next.getSongId())) {
                    continue;
                }
                if (current.getListenedAt() == null || next.getListenedAt() == null) {
                    continue;
                }

                long minutes = Math.abs(ChronoUnit.MINUTES.between(current.getListenedAt(), next.getListenedAt()));
                if (minutes > MAX_SEQUENCE_GAP_MINUTES) {
                    continue;
                }

                double weight = 1.0 / Math.max(1.0, minutes + 1.0);
                addEdge(adjacency, current.getSongId(), next.getSongId(), weight);
                addEdge(adjacency, next.getSongId(), current.getSongId(), weight * 0.75);
            }
        });

        return adjacency;
    }

    private void addEdge(Map<Long, Map<Long, Double>> adjacency, Long source, Long target, double weight) {
        adjacency.computeIfAbsent(source, k -> new HashMap<>())
                .merge(target, weight, Double::sum);
    }

    private double[] aggregateBehaviorVector(Map<Long, Double> neighbors,
            Map<Long, double[]> contentVectors,
            int vectorLength) {
        DoubleSummaryStatistics stats = neighbors.values().stream()
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .summaryStatistics();

        double totalWeight = stats.getSum();
        if (totalWeight <= 0.0) {
            return null;
        }

        double[] aggregate = new double[vectorLength];
        neighbors.forEach((neighborId, weight) -> {
            double[] neighborVector = contentVectors.get(neighborId);
            if (neighborVector == null || neighborVector.length != vectorLength) {
                return;
            }
            double normalizedWeight = weight / totalWeight;
            for (int i = 0; i < vectorLength; i++) {
                aggregate[i] += neighborVector[i] * normalizedWeight;
            }
        });

        return aggregate;
    }

    private double[] mergeVectors(double[] contentVector, double[] behaviorVector) {
        if (behaviorVector == null || behaviorVector.length == 0) {
            return contentVector.clone();
        }
        double[] merged = new double[contentVector.length];
        double contentWeight = 1.0 - BEHAVIOR_WEIGHT;
        for (int i = 0; i < merged.length; i++) {
            double content = i < contentVector.length ? contentVector[i] : 0.0;
            double behavior = i < behaviorVector.length ? behaviorVector[i] : 0.0;
            merged[i] = contentWeight * content + BEHAVIOR_WEIGHT * behavior;
        }
        return merged;
    }

    @Getter
    @AllArgsConstructor
    public static class BehaviorEmbeddingReport {
        private final int totalSongs;
        private final int updatedSongs;
        private final LocalDateTime cutoff;
    }
}
package com.example.starter_project.systems.service;

import com.example.starter_project.systems.entity.ListeningHistory;
import com.example.starter_project.systems.entity.Song;
import com.example.starter_project.systems.entity.SongStatus;
import com.example.starter_project.systems.repository.ListeningHistoryRepository;
import com.example.starter_project.systems.repository.SongRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.DoubleSummaryStatistics;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Tính toán behavior embedding dựa trên lịch sử nghe của người dùng.
 * Dữ liệu được tổng hợp offline (scheduled job) để tránh ảnh hưởng hiệu năng truy vấn runtime.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BehaviorEmbeddingService {

    private static final int DEFAULT_LOOKBACK_DAYS = 30;
    private static final int MAX_SEQUENCE_GAP_MINUTES = 60;
    private static final double BEHAVIOR_WEIGHT = 0.35;

    private final ListeningHistoryRepository listeningHistoryRepository;
    private final SongRepository songRepository;
    private final EmbeddingService embeddingService;

    /**
     * Recompute behavior embeddings từ lịch sử nghe gần đây.
     * Có thể gọi thủ công (ví dụ từ scheduler hoặc từ endpoint quản trị).
     */
    @Transactional
    public BehaviorEmbeddingReport recomputeBehaviorEmbeddings() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(DEFAULT_LOOKBACK_DAYS);
        List<ListeningHistory> recentHistories = listeningHistoryRepository.findByListenedAtAfter(cutoff);
        if (recentHistories.isEmpty()) {
            log.info("[BehaviorEmbeddingService] Không có listening history mới kể từ {}", cutoff);
            return new BehaviorEmbeddingReport(0, 0, cutoff);
        }

        Map<Long, List<ListeningHistory>> historiesByUser = recentHistories.stream()
                .filter(h -> h.getUserId() != null && h.getSongId() != null)
                .collect(Collectors.groupingBy(ListeningHistory::getUserId));

        Map<Long, Map<Long, Double>> adjacency = buildAdjacencyMatrix(historiesByUser);

        List<Song> songs = songRepository.findAll();
        Map<Long, double[]> contentVectors = songs.stream()
                .filter(s -> s.getVector() != null && !s.getVector().isBlank())
                .collect(Collectors.toMap(
                        Song::getId,
                        s -> embeddingService.parseVector(s.getVector())));

        int updated = 0;
        List<Song> toUpdate = new ArrayList<>();

        for (Song song : songs) {
            if (song.getStatus() != SongStatus.ACTIVE) {
                continue;
            }
            double[] contentVector = contentVectors.get(song.getId());
            if (contentVector == null || contentVector.length == 0) {
                continue;
            }

            Map<Long, Double> neighbors = adjacency.get(song.getId());
            if (neighbors == null || neighbors.isEmpty()) {
                continue;
            }

            double[] behaviorVector = aggregateBehaviorVector(neighbors, contentVectors, contentVector.length);
            if (behaviorVector == null) {
                continue;
            }

            double[] finalVector = mergeVectors(contentVector, behaviorVector);
            song.setBehaviorEmbedding(embeddingService.vectorToJson(behaviorVector));
            song.setVector(embeddingService.vectorToJson(finalVector));
            toUpdate.add(song);
            updated++;
        }

        if (!toUpdate.isEmpty()) {
            songRepository.saveAll(toUpdate);
        }

        log.info("[BehaviorEmbeddingService] Behavior embedding cập nhật cho {} / {} bài hát (lookback {} ngày)",
                updated, songs.size(), DEFAULT_LOOKBACK_DAYS);

        return new BehaviorEmbeddingReport(songs.size(), updated, cutoff);
    }

    private Map<Long, Map<Long, Double>> buildAdjacencyMatrix(Map<Long, List<ListeningHistory>> historiesByUser) {
        Map<Long, Map<Long, Double>> adjacency = new HashMap<>();
        historiesByUser.values().forEach(histories -> {
            histories.sort(Comparator.comparing(ListeningHistory::getListenedAt, Comparator.nullsLast(Comparator.naturalOrder())));
            for (int i = 0; i < histories.size() - 1; i++) {
                ListeningHistory current = histories.get(i);
                ListeningHistory next = histories.get(i + 1);
                if (current.getSongId() == null || next.getSongId() == null) {
                    continue;
                }
                if (Objects.equals(current.getSongId(), next.getSongId())) {
                    continue;
                }
                if (current.getListenedAt() == null || next.getListenedAt() == null) {
                    continue;
                }
                long minutes = Math.abs(ChronoUnit.MINUTES.between(current.getListenedAt(), next.getListenedAt()));
                if (minutes > MAX_SEQUENCE_GAP_MINUTES) {
                    continue;
                }
                double weight = 1.0 / Math.max(1.0, minutes + 1.0);
                addEdge(adjacency, current.getSongId(), next.getSongId(), weight);
                addEdge(adjacency, next.getSongId(), current.getSongId(), weight * 0.75); // chiều ngược trọng số nhỏ hơn
            }
        });
        return adjacency;
    }

    private void addEdge(Map<Long, Map<Long, Double>> adjacency, Long source, Long target, double weight) {
        adjacency.computeIfAbsent(source, k -> new HashMap<>())
                .merge(target, weight, Double::sum);
    }

    private double[] aggregateBehaviorVector(Map<Long, Double> neighbors,
            Map<Long, double[]> contentVectors,
            int vectorLength) {
        DoubleSummaryStatistics stats = neighbors.values().stream()
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .summaryStatistics();
        double totalWeight = stats.getSum();
        if (totalWeight <= 0.0) {
            return null;
        }

        double[] aggregate = new double[vectorLength];
        neighbors.forEach((neighborId, weight) -> {
            double[] neighborVector = contentVectors.get(neighborId);
            if (neighborVector == null || neighborVector.length != vectorLength) {
                return;
            }
            double normalizedWeight = weight / totalWeight;
            for (int i = 0; i < vectorLength; i++) {
                aggregate[i] += neighborVector[i] * normalizedWeight;
            }
        });

        return aggregate;
    }

    private double[] mergeVectors(double[] contentVector, double[] behaviorVector) {
        if (behaviorVector == null || behaviorVector.length == 0) {
            return contentVector.clone();
        }
        double[] merged = new double[contentVector.length];
        double contentWeight = 1.0 - BEHAVIOR_WEIGHT;
        for (int i = 0; i < contentVector.length; i++) {
            double contentValue = i < contentVector.length ? contentVector[i] : 0.0;
            double behaviorValue = i < behaviorVector.length ? behaviorVector[i] : 0.0;
            merged[i] = contentWeight * contentValue + BEHAVIOR_WEIGHT * behaviorValue;
        }
        return merged;
    }

    @Getter
    @AllArgsConstructor
    public static class BehaviorEmbeddingReport {
        private final int totalSongs;
        private final int updatedSongs;
        private final LocalDateTime cutoff;
    }
}

