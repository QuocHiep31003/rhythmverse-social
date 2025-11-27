# 🎧 Listening History Excel Template

Backend imports `src/main/resources/static/templates/listening_history.xlsx` when the DataLoader runs (and the same structure is used for manual import/export through `ListeningHistoryController`).  
Each row now represents **one actual play event** with enough detail for recommendations and analytics.

## Columns (order matters)

| Col | Header                  | Type          | Required | Description                                                                 | Example               |
| --- | ----------------------- | ------------- | -------- | --------------------------------------------------------------------------- | --------------------- |
| 0   | User ID                 | Long          | ✅ Yes   | ID của user đã nghe bài hát                                                 | `1`                   |
| 1   | Song ID                 | Long          | ✅ Yes   | ID bài hát đã nghe                                                          | `42`                  |
| 2   | Listened At             | Date/DateTime | ✅ Yes   | Thời điểm phát sinh lượt nghe (ISO 8601 hoặc định dạng ngày Excel)          | `2024-11-27T09:30:00` |
| 3   | Listened Duration (sec) | Integer       | ✅ Yes   | Số giây người dùng thực sự nghe trong lượt này                              | `95`                  |
| 4   | Song Duration (sec)     | Integer       | ❌ No    | Thời lượng chuẩn của bài hát (giây). Nếu bỏ trống sẽ dùng metadata hệ thống | `210`                 |
| 5   | Play Source             | Enum          | ❌ No    | Nguồn phát (`PLAYLIST`, `SEARCH`, `RECOMMENDATION`, `QUEUE`, `MANUAL`,...)  | `PLAYLIST`            |
| 6   | Previous Song ID        | Long          | ❌ No    | Bài hát trước đó trong phiên nghe (dùng cho phân tích chuyển tiếp)          | `17`                  |
| 7   | Session ID              | String        | ❌ No    | ID phiên nghe (tùy ý, giúp gom các lượt nghe liên tiếp)                     | `session-abc-123`     |
| 8   | Device Type             | String        | ❌ No    | Mô tả thiết bị/ngữ cảnh (Mobile, Web, CarPlay, …)                           | `Mobile`              |
| 9   | Skipped                 | Boolean       | ❌ No    | `TRUE/FALSE`. Nếu bỏ trống, backend tự suy ra dựa trên thời lượng nghe      | `FALSE`               |

> Nếu `Song Duration` chưa xác định mà `Listened Duration` lớn hơn, backend sẽ tự ràng buộc để không vượt quá.

## Example Row

| User ID | Song ID | Listened At         | Listened Duration | Song Duration | Play Source | Previous Song ID | Session ID      | Device | Skipped |
| ------- | ------- | ------------------- | ----------------- | ------------- | ----------- | ---------------- | --------------- | ------ | ------- |
| 1       | 42      | 2024-11-27T09:30:00 | 95                | 210           | PLAYLIST    | 17               | session-abc-123 | Mobile | FALSE   |

## Templates & APIs

- Template file: `src/main/resources/static/templates/listening_history.xlsx`
- Import API: `POST /api/listening-history/import-excel`
- Export API: `GET /api/listening-history/export`

Nhớ rằng mỗi lượt nghe tương ứng **một dòng**. Nếu người dùng nghe lại 5 lần thì phải có 5 dòng riêng với timestamp và thông tin tương ứng.\*\*\*
