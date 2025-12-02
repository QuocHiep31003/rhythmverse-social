# Feature Usage Limit Guide

Hướng dẫn sử dụng hệ thống giới hạn tính năng cho Free users.

## Tổng quan

Hệ thống này cho phép giới hạn số lần sử dụng các tính năng cho Free users, trong khi Premium users được unlimited access.

## Các tính năng được giới hạn

- **PLAYLIST_CREATE**: Free users được tạo **3 playlists tổng cộng** (không reset, phải upgrade Premium để tạo thêm)
- **OFFLINE_DOWNLOAD**: Free users không được dùng (0 lần - chỉ Premium)
- **AI_SEARCH**: Free users không được dùng (0 lần - chỉ Premium)
- **ADVANCED_ANALYTICS**: Free users không được dùng (0 lần - chỉ Premium)
## Cách sử dụng trong Frontend

### 1. Sử dụng Hook `useFeatureLimit`

```tsx
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";
import { useState } from "react";

function CreatePlaylistButton() {
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const { canUse, remaining, isPremium, useFeature, isLoading } = useFeatureLimit({
    featureName: FeatureName.PLAYLIST_CREATE,
    autoCheck: true,
    onLimitReached: () => setShowLimitModal(true),
  });

  const handleCreatePlaylist = async () => {
    // Kiểm tra có thể dùng không
    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    // Sử dụng feature (tự động tăng usage count)
    const success = await useFeature();
    if (!success) {
      setShowLimitModal(true);
      return;
    }

    // Tiếp tục logic tạo playlist
    // ... your create playlist logic
  };

  return (
    <>
      <button onClick={handleCreatePlaylist} disabled={isLoading}>
        Create Playlist
        {!isPremium && remaining > 0 && (
          <span className="text-xs">({remaining} left)</span>
        )}
      </button>

      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.PLAYLIST_CREATE}
        remaining={remaining}
        limit={3}
      />
    </>
  );
}
```

### 2. Sử dụng API trực tiếp

```tsx
import { featureUsageApi, FeatureName } from "@/services/api/featureUsageApi";

// Check usage
const usage = await featureUsageApi.getFeatureUsage(FeatureName.PLAYLIST_CREATE);
console.log(`Remaining: ${usage.remaining}/${usage.limit}`);

// Check if can use
const canUse = await featureUsageApi.canUseFeature(FeatureName.PLAYLIST_CREATE);

// Use feature (increment count)
const updatedUsage = await featureUsageApi.useFeature(FeatureName.PLAYLIST_CREATE);
```

### 3. Ví dụ với Download Feature

```tsx
import { useFeatureLimit } from "@/hooks/useFeatureLimit";
import { FeatureName } from "@/services/api/featureUsageApi";
import { FeatureLimitModal } from "@/components/FeatureLimitModal";

function DownloadButton({ songId }: { songId: number }) {
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const { canUse, isPremium, useFeature } = useFeatureLimit({
    featureName: FeatureName.OFFLINE_DOWNLOAD,
    onLimitReached: () => setShowLimitModal(true),
  });

  const handleDownload = async () => {
    if (!canUse) {
      setShowLimitModal(true);
      return;
    }

    const success = await useFeature();
    if (!success) {
      setShowLimitModal(true);
      return;
    }

    // Download song logic
    // ...
  };

  return (
    <>
      <button onClick={handleDownload} disabled={!canUse}>
        Download
      </button>
      <FeatureLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        featureName={FeatureName.OFFLINE_DOWNLOAD}
      />
    </>
  );
}
```

## Backend API Endpoints

### GET `/api/feature-usage/{featureName}`
Lấy thông tin usage của một feature.

**Response:**
```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "userId": 1,
    "featureName": "PLAYLIST_CREATE",
    "featureDisplayName": "Create Playlist",
    "usageCount": 2,
    "limit": 3,
    "remaining": 1,
    "usageDate": "2024-01-15",
    "isPremium": false,
    "canUse": true
  }
}
```

### GET `/api/feature-usage/check/{featureName}`
Kiểm tra user có thể sử dụng feature không.

**Response:**
```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": true
}
```

### POST `/api/feature-usage/use/{featureName}`
Sử dụng feature (tăng usage count).

**Response:**
```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "usageCount": 3,
    "remaining": 0,
    "canUse": false
  }
}
```

### GET `/api/feature-usage/premium-status`
Kiểm tra user có phải premium không.

## Logic hoạt động

1. **Free Users**: 
   - Mỗi feature có giới hạn số lần sử dụng **tổng cộng** (không reset)
   - Ví dụ: PLAYLIST_CREATE = 3 lần tổng cộng, sau khi dùng hết phải upgrade Premium
   - Usage count được đếm tổng từ tất cả các lần sử dụng trước đó
   - Khi hết lượt, `canUse = false`

2. **Premium Users**:
   - Unlimited access cho tất cả features
   - `canUse = true` và `remaining = Integer.MAX_VALUE`
   - Không cần track usage count

3. **Usage Tracking**:
   - Mỗi lần gọi `useFeature()` sẽ tạo một record mới với `usageCount = 1`
   - Tổng số usage = SUM tất cả các record (không reset theo ngày)
   - Mỗi record vẫn lưu `usageDate` để tracking lịch sử, nhưng logic đếm là tổng số

## Customization

### Thay đổi giới hạn

Sửa trong `FeatureName.java`:
```java
PLAYLIST_CREATE("Create Playlist", 5), // Thay đổi từ 3 thành 5
```

### Thêm tính năng mới

1. Thêm vào `FeatureName` enum:
```java
NEW_FEATURE("New Feature", 2), // Free: 2 lần
```

2. Thêm description và benefits trong `FeatureLimitModal.tsx`:
```tsx
const featureDescriptions: Record<FeatureName, string> = {
  // ...
  [FeatureName.NEW_FEATURE]: "Description here",
};
```

## Notes

- Usage được reset mỗi ngày (dựa trên `usageDate`)
- Premium users không bị giới hạn
- Tất cả API endpoints yêu cầu authentication
- Frontend tự động hiển thị modal khi hết lượt

