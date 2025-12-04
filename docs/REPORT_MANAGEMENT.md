# Report Management Specification

This document describes the moderation report workflow for EchoVerse, including
the data model (`reports` table), status lifecycle, and notification behavior.

## 1. Report Table (`reports`)

| Column           | Type / Example                          | Notes                                                                 |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `id`             | `uuid`                                  | Primary key.                                                          |
| `reporter_id`    | `uuid`                                  | User who submitted the report.                                        |
| `target_type`    | `enum` (`playlist`, `song`, `album`, `artist`, `user`, `message`, `comment`) | Determines which entity the report is about. Extendable if new content types are added. |
| `target_id`      | `uuid / string`                         | ID of the entity being reported.                                      |
| `reason_code`    | `enum` (`spam`, `hate`, `sexual`, `copyright`, `other`) | Standardized list of violation codes.                                 |
| `description`    | `text`                                  | Optional free-form description supplied by the reporter.              |
| `status`         | `enum` (`pending`, `in_review`, `resolved`, `rejected`) | Moderation status.                                                    |
| `handled_by`     | `uuid`                                  | Moderator/Admin who resolved the report. `NULL` when `pending`.       |
| `handled_at`     | `timestamptz`                           | Timestamp when the report was resolved.                               |
| `resolution_note`| `text`                                  | Internal note for moderation log (not shown to users).                |
| `created_at`     | `timestamptz`                           | Report creation timestamp.                                            |
| `updated_at`     | `timestamptz`                           | Auto-updated timestamp.                                               |
| `metadata`       | `jsonb`                                 | Optional structured data (snapshot of playlist data, chat preview, etc.). |

## 2. Workflow Overview

### 2.1 User → System

1. User taps `Report` on any supported entity (playlist, song, album, artist, user profile, chat message, etc.).
2. FE collects:
   - `target_type`, `target_id`
   - `reason_code`
   - Optional `description`
3. FE POSTs to `/reports` API.
4. BE inserts a new row with `status = pending`.
5. FE shows a generic toast:  
   `Cảm ơn bạn đã báo cáo. Report ID #xxxx đã được ghi nhận.`

> Users **do not** have a “My reports” list; they only see a confirmation toast.

### 2.2 Moderator/Admin → System

1. Moderators open the **Moderation Console**:
   - View `pending` reports.
   - Filter by type, reason, time, number of duplicates, etc.
2. When handling a report:
   - They inspect the associated entity (playlist metadata, chat snippet, etc.).
   - Update `status` to `in_review` to avoid collisions.
3. After deciding:
   - Update `status` to `resolved` or `rejected`.
   - Fill `handled_by`, `handled_at`, `resolution_note`.
   - Take any necessary action on the target entity (hide playlist, ban user, etc.).

### 2.3 User Notification After Resolution

Once a report transitions to `resolved` (handled by moderator/admin):

1. BE emits a lightweight notification to the original reporter:
   - Message template:  
     `Cảm ơn bạn! Report #{{reportId}} đã được xử lý vào {{handledAt}}.`
2. No further detail is exposed (no list/history UI).  
   Reporter simply receives this one-time notification/toast/email depending on platform.

## 3. Status Lifecycle

```
pending → in_review → resolved
                 ↘
                  rejected
```

- `pending`: just submitted, waiting for moderator.
- `in_review`: moderator is actively checking.
- `resolved`: violation confirmed and action taken.
- `rejected`: report considered invalid (spam, no violation, etc.).

## 4. Admin Console Requirements

- List view with filters:
  - Status, type, reason, date range, reporter ID.
- Detail view:
  - Snapshot of reported content (metadata, cover, partial chat log).
  - Actions: `Resolve`, `Reject`, `Escalate`, `Ban target user`, etc.
- Audit trail:
  - Each state change logged with moderator ID and timestamp.
- Optional metrics:
  - Number of reports per type, trending entities being reported.

## 5. Security & Privacy Notes

- Only Moderators/Admins can read report details.
- Reporters are not allowed to see other users’ reports or review results beyond the generic “report handled” notification.
- `metadata` field should avoid storing PII. Use it only for context required to evaluate the violation.

---

This specification ensures EchoVerse has a consistent, auditable moderation process while keeping the user-facing experience simple (single confirmation toast and resolution notification).

