# Tổng Quan Các Entity Liên Quan Đến Gói Premium

Tài liệu này mô tả chi tiết tất cả các entity liên quan đến hệ thống gói Premium/Subscription.

---

## 📋 Danh Sách Entity

1. **SubscriptionPlan** - Gói subscription (FREE, PREMIUM, etc.)
2. **PlanDetail** - Chi tiết gói (thời hạn, giá)
3. **PlanFeature** - Tính năng của gói
4. **PremiumSubscription** - Subscription của user
5. **PaymentOrder** - Đơn hàng thanh toán

---

## 1. SubscriptionPlan

**Table:** `subscription_plans`

**Mô tả:** Entity chính định nghĩa các gói subscription (FREE, PREMIUM, PREMIUM_YEARLY, etc.)

### Cấu Trúc:

```java
@Entity
@Table(name = "subscription_plans", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"plan_code"})
})
public class SubscriptionPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_code", nullable = false, unique = true, length = 50)
    private String planCode; // FREE, PREMIUM, BASIC, PRO, etc.

    @Column(name = "plan_name", nullable = false, length = 255)
    private String planName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    // Relationships
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlanFeature> features; // Các tính năng của gói

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlanDetail> details; // Các option (1 tháng, 3 tháng, 1 năm)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### Các Trường Quan Trọng:

- **id**: Primary key (Long)
- **planCode**: Mã gói duy nhất (FREE, PREMIUM, etc.) - UNIQUE
- **planName**: Tên gói (ví dụ: "Premium Plan")
- **description**: Mô tả gói
- **isActive**: Gói có đang active không
- **displayOrder**: Thứ tự hiển thị
- **features**: Danh sách tính năng (OneToMany với PlanFeature)
- **details**: Danh sách option (OneToMany với PlanDetail)

### Ví Dụ Dữ Liệu:

```
id: 1
planCode: "FREE"
planName: "Free Plan"
isActive: true
displayOrder: 1

id: 2
planCode: "PREMIUM"
planName: "Premium Plan"
isActive: true
displayOrder: 2
```

---

## 2. PlanDetail

**Table:** `plan_details`

**Mô tả:** Chi tiết các option của gói (1 tháng, 3 tháng, 1 năm) với giá và thời hạn

### Cấu Trúc:

```java
@Entity
@Table(name = "plan_details")
public class PlanDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Column(name = "detail_name", nullable = false, length = 255)
    private String detailName; // "1 tháng", "3 tháng", "1 năm"

    @Column(name = "price", precision = 10, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays; // Số ngày (30, 90, 365)

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_recommended")
    @Builder.Default
    private Boolean isRecommended = false; // Gói được recommend

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### Các Trường Quan Trọng:

- **id**: Primary key (Long)
- **plan**: Gói subscription (ManyToOne với SubscriptionPlan)
- **detailName**: Tên option (ví dụ: "1 tháng", "3 tháng")
- **price**: Giá (BigDecimal)
- **currency**: Đơn vị tiền tệ (mặc định: VND)
- **durationDays**: Số ngày (30, 90, 365)
- **isActive**: Option có đang active không
- **isRecommended**: Có được recommend không
- **displayOrder**: Thứ tự hiển thị

### Ví Dụ Dữ Liệu:

```
id: 1
plan_id: 2 (PREMIUM)
detailName: "1 tháng"
price: 99000
currency: "VND"
durationDays: 30
isActive: true
isRecommended: true
displayOrder: 1

id: 2
plan_id: 2 (PREMIUM)
detailName: "3 tháng"
price: 249000
currency: "VND"
durationDays: 90
isActive: true
isRecommended: false
displayOrder: 2
```

---

## 3. PlanFeature

**Table:** `plan_features`

**Mô tả:** Các tính năng của gói và giới hạn sử dụng

### Cấu Trúc:

```java
@Entity
@Table(name = "plan_features", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"plan_id", "feature_name"})
})
public class PlanFeature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(name = "feature_name", nullable = false, length = 50)
    private FeatureName featureName; // PLAYLIST_CREATE, OFFLINE_DOWNLOAD, etc.

    @Enumerated(EnumType.STRING)
    @Column(name = "limit_type", nullable = false, length = 20)
    @Builder.Default
    private FeatureLimitType limitType = FeatureLimitType.LIMITED; // UNLIMITED, LIMITED, DISABLED

    @Column(name = "limit_value")
    private Integer limitValue; // NULL = unlimited, số = giới hạn

    @Enumerated(EnumType.STRING)
    @Column(name = "limit_period", nullable = false, length = 20)
    @Builder.Default
    private FeatureLimitPeriod limitPeriod = FeatureLimitPeriod.NONE; // NONE, DAY, WEEK, MONTH

    @Column(name = "period_value")
    @Builder.Default
    private Integer periodValue = 1; // Số period (ví dụ: 1 tháng, 2 tuần)

    @Column(name = "is_enabled")
    @Builder.Default
    private Boolean isEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### Các Trường Quan Trọng:

- **id**: Primary key (Long)
- **plan**: Gói subscription (ManyToOne với SubscriptionPlan)
- **featureName**: Tên tính năng (enum: PLAYLIST_CREATE, OFFLINE_DOWNLOAD, AI_SEARCH, etc.)
- **limitType**: Loại giới hạn:
  - `UNLIMITED`: Không giới hạn (limitValue = NULL)
  - `LIMITED`: Có giới hạn (limitValue = số)
  - `DISABLED`: Tắt tính năng
- **limitValue**: Giá trị giới hạn (NULL = unlimited)
- **limitPeriod**: Chu kỳ reset (NONE, DAY, WEEK, MONTH)
- **periodValue**: Số chu kỳ (ví dụ: 1 tháng, 2 tuần)
- **isEnabled**: Tính năng có được bật không

### Ví Dụ Dữ Liệu:

```
id: 1
plan_id: 2 (PREMIUM)
featureName: "PLAYLIST_CREATE"
limitType: "UNLIMITED"
limitValue: null
limitPeriod: "NONE"
periodValue: 1
isEnabled: true

id: 2
plan_id: 2 (PREMIUM)
featureName: "OFFLINE_DOWNLOAD"
limitType: "UNLIMITED"
limitValue: null
limitPeriod: "NONE"
periodValue: 1
isEnabled: true

id: 3
plan_id: 1 (FREE)
featureName: "PLAYLIST_CREATE"
limitType: "LIMITED"
limitValue: 5
limitPeriod: "MONTH"
periodValue: 1
isEnabled: true
```

---

## 4. PremiumSubscription

**Table:** `premium_subscriptions`

**Mô tả:** Lưu trữ subscription của user sau khi thanh toán thành công

### Cấu Trúc:

```java
@Entity
@Table(name = "premium_subscriptions")
public class PremiumSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_order_id")
    private PaymentOrder paymentOrder;

    @Column(name = "order_code")
    private Long orderCode;

    // Snapshot từ order (để giữ nguyên dữ liệu khi plan thay đổi)
    @Column(name = "plan_code", length = 100)
    private String planCode;

    @Column(name = "plan_name", length = 255)
    private String planName;

    @Column(name = "plan_detail_id")
    private Long planDetailId;

    @Column(name = "plan_detail_name", length = 255)
    private String planDetailName;

    @Column(name = "plan_price_snapshot")
    private Long planPriceSnapshot;

    @Column(name = "plan_currency_snapshot", length = 10)
    private String planCurrencySnapshot;

    @Column(name = "plan_duration_days_snapshot")
    private Integer planDurationDaysSnapshot;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "duration_days")
    private Integer durationDays;

    private Long amount;
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE; // ACTIVE, EXPIRED, CANCELLED

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "reference", length = 255)
    private String reference;

    @Lob
    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson; // JSON snapshot của features

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### Các Trường Quan Trọng:

- **id**: Primary key (UUID)
- **user**: User sở hữu subscription (ManyToOne với User)
- **paymentOrder**: Đơn hàng thanh toán (OneToOne với PaymentOrder)
- **orderCode**: Mã đơn hàng
- **planCode, planName, planDetailId, etc.**: Snapshot từ order (để giữ nguyên khi plan thay đổi)
- **status**: Trạng thái (ACTIVE, EXPIRED, CANCELLED)
- **startsAt**: Ngày bắt đầu
- **expiresAt**: Ngày hết hạn
- **featuresJson**: JSON snapshot của features (để giữ nguyên khi plan thay đổi)
- **amount, currency**: Số tiền và đơn vị tiền tệ

### Ví Dụ Dữ Liệu:

```
id: 550e8400-e29b-41d4-a716-446655440000
user_id: 1
payment_order_id: 123e4567-e89b-12d3-a456-426614174000
order_code: 123456789
plan_code: "PREMIUM"
plan_name: "Premium Plan"
plan_detail_id: 1
plan_detail_name: "1 tháng"
plan_price_snapshot: 99000
plan_currency_snapshot: "VND"
plan_duration_days_snapshot: 30
status: "ACTIVE"
starts_at: 2025-01-01 09:00:00
expires_at: 2025-01-31 09:00:00
features_json: "[{\"featureName\":\"PLAYLIST_CREATE\",\"limitType\":\"UNLIMITED\",...}]"
```

---

## 5. PaymentOrder

**Table:** `payment_orders`

**Mô tả:** Lưu trữ đơn hàng thanh toán qua PayOS

### Cấu Trúc:

```java
@Entity
@Table(name = "payment_orders")
public class PaymentOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_code", nullable = false, unique = true)
    private Long orderCode; // Mã đơn hàng PayOS

    @Column(nullable = false)
    private Long amount;

    @Column(length = 500)
    private String description;

    // Snapshot từ plan (để giữ nguyên khi plan thay đổi)
    @Column(name = "plan_code", length = 100)
    private String planCode;

    @Column(name = "plan_name", length = 255)
    private String planName;

    @Column(name = "plan_detail_id")
    private Long planDetailId;

    @Column(name = "plan_detail_name", length = 255)
    private String planDetailName;

    @Column(name = "plan_duration_days_snapshot")
    private Integer planDurationDaysSnapshot;

    @Column(name = "plan_price_snapshot")
    private Long planPriceSnapshot;

    @Column(name = "plan_currency_snapshot", length = 10)
    private String planCurrencySnapshot;

    @Lob
    @Column(name = "plan_feature_snapshot", columnDefinition = "TEXT")
    private String planFeatureSnapshot; // JSON snapshot của features

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.FAILED; // SUCCESS, FAILED

    private String currency;

    // PayOS response fields
    @Column(name = "payment_link_id")
    private String paymentLinkId;

    @Column(name = "checkout_url", length = 1000)
    private String checkoutUrl;

    @Column(name = "qr_code", length = 2000)
    private String qrCode;

    @Column(name = "expired_at")
    private Long expiredAt;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "account_name")
    private String accountName;

    private String bin;

    @Column(name = "return_url", length = 500)
    private String returnUrl;

    @Column(name = "cancel_url", length = 500)
    private String cancelUrl;

    // Buyer info
    private String buyerName;
    private String buyerEmail;
    private String buyerPhone;
    private String buyerAddress;

    // PayOS transaction info
    private String reference;
    @Column(name = "transaction_date_time")
    private String transactionDateTime;

    @Column(name = "payos_code")
    private String payosCode; // "00" = success

    @Column(name = "payos_desc", length = 500)
    private String payosDesc;

    @Column(name = "counter_account_bank_id")
    private String counterAccountBankId;

    @Column(name = "counter_account_bank_name")
    private String counterAccountBankName;

    @Column(name = "counter_account_name")
    private String counterAccountName;

    @Column(name = "counter_account_number")
    private String counterAccountNumber;

    @Column(name = "virtual_account_name")
    private String virtualAccountName;

    @Column(name = "virtual_account_number")
    private String virtualAccountNumber;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "failed_at")
    private Instant failedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### Các Trường Quan Trọng:

- **id**: Primary key (UUID)
- **orderCode**: Mã đơn hàng PayOS (Long, UNIQUE)
- **amount**: Số tiền
- **status**: Trạng thái thanh toán (SUCCESS, FAILED)
- **planCode, planName, etc.**: Snapshot từ plan (để giữ nguyên khi plan thay đổi)
- **planFeatureSnapshot**: JSON snapshot của features
- **checkoutUrl**: URL thanh toán PayOS
- **payosCode**: Mã response từ PayOS ("00" = success)
- **paidAt**: Thời điểm thanh toán thành công
- **failedAt**: Thời điểm thanh toán thất bại
- **failureReason**: Lý do thất bại
- **user**: User thực hiện thanh toán (ManyToOne với User)

### Ví Dụ Dữ Liệu:

```
id: 123e4567-e89b-12d3-a456-426614174000
order_code: 123456789
amount: 99000
description: "Premium Plan - 1 tháng"
plan_code: "PREMIUM"
plan_name: "Premium Plan"
plan_detail_id: 1
plan_detail_name: "1 tháng"
plan_duration_days_snapshot: 30
plan_price_snapshot: 99000
plan_currency_snapshot: "VND"
status: "SUCCESS"
currency: "VND"
checkout_url: "https://pay.payos.vn/web/..."
payos_code: "00"
payos_desc: "Thanh toán thành công"
paid_at: 2025-01-01 09:14:00
user_id: 1
```

---

## 🔗 Mối Quan Hệ Giữa Các Entity

```
SubscriptionPlan (1) ──< (N) PlanDetail
SubscriptionPlan (1) ──< (N) PlanFeature

User (1) ──< (N) PaymentOrder
PaymentOrder (1) ──< (1) PremiumSubscription
User (1) ──< (N) PremiumSubscription

User (1) ──< (N) SubscriptionPlan (updated_by)
User (1) ──< (N) PlanDetail (updated_by)
```

### Mô Tả Mối Quan Hệ:

1. **SubscriptionPlan ↔ PlanDetail**: OneToMany
   - Một gói có nhiều option (1 tháng, 3 tháng, 1 năm)

2. **SubscriptionPlan ↔ PlanFeature**: OneToMany
   - Một gói có nhiều tính năng

3. **User ↔ PaymentOrder**: OneToMany
   - Một user có thể có nhiều đơn hàng

4. **PaymentOrder ↔ PremiumSubscription**: OneToOne
   - Một đơn hàng thành công tạo một subscription

5. **User ↔ PremiumSubscription**: OneToMany
   - Một user có thể có nhiều subscription (lịch sử)

---

## 📊 Luồng Dữ Liệu

### 1. Tạo Gói (Admin):
```
SubscriptionPlan (PREMIUM)
  ├── PlanDetail (1 tháng, 99000 VND, 30 ngày)
  ├── PlanDetail (3 tháng, 249000 VND, 90 ngày)
  ├── PlanFeature (PLAYLIST_CREATE, UNLIMITED)
  └── PlanFeature (OFFLINE_DOWNLOAD, UNLIMITED)
```

### 2. User Mua Gói:
```
User → PaymentOrder (tạo order)
  → PayOS (thanh toán)
  → Webhook (xác nhận thanh toán)
  → PremiumSubscription (kích hoạt premium)
  → User.isPremium = true
  → User.premiumExpiresAt = expiresAt
```

### 3. Snapshot Pattern:
- Khi tạo order, lưu snapshot của plan (planCode, planName, price, features)
- Khi tạo subscription, lưu snapshot từ order
- Đảm bảo dữ liệu không thay đổi khi plan được update

---

## 🎯 Best Practices

1. **Snapshot Pattern**: Luôn lưu snapshot khi tạo order/subscription để giữ nguyên dữ liệu khi plan thay đổi

2. **Status Management**: 
   - PaymentOrder.status: SUCCESS/FAILED
   - PremiumSubscription.status: ACTIVE/EXPIRED/CANCELLED

3. **Cascade Operations**: 
   - SubscriptionPlan → PlanDetail, PlanFeature (CASCADE ALL, orphanRemoval)

4. **Lazy Loading**: Tất cả relationships đều dùng LAZY để tối ưu performance

5. **Unique Constraints**: 
   - SubscriptionPlan.planCode (UNIQUE)
   - PlanFeature (plan_id, feature_name) (UNIQUE)
   - PaymentOrder.orderCode (UNIQUE)

---

## 📝 Notes

- Tất cả entity đều có `createdAt` và `updatedAt` (tự động)
- Sử dụng UUID cho PaymentOrder và PremiumSubscription
- Sử dụng Long ID cho SubscriptionPlan, PlanDetail, PlanFeature
- Features được lưu dưới dạng JSON trong PremiumSubscription và PaymentOrder

