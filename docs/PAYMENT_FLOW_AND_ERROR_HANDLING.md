# Luồng Mua Gói Premium và Xử Lý Lỗi

## Tổng Quan

Tài liệu này mô tả chi tiết luồng từ đầu đến cuối khi người dùng mua gói Premium, bao gồm tất cả các bước xử lý và cách hệ thống bắt lỗi ở mỗi giai đoạn.

---

## 📋 Luồng Chính (Happy Path)

### **Bước 1: Người dùng chọn gói Premium**
**File:** `src/pages/Premium.tsx`

- Người dùng vào trang `/premium`
- Component `Premium` load danh sách gói từ API:
  ```typescript
  const plans = await subscriptionPlanApi.getActivePlans()
  ```
- Hiển thị các gói: FREE, PREMIUM, PREMIUM_YEARLY, và các gói khác
- Người dùng click "Upgrade to Premium" → Mở dialog chọn plan detail

**Xử lý lỗi:**
- Nếu không load được plans: `setSubscriptionPlans([])` và hiển thị empty state
- Nếu không lấy được user profile: Log warning nhưng vẫn hiển thị trang

---

### **Bước 2: Chọn Plan Detail và tạo Order**
**File:** `src/pages/Premium.tsx` → `handleUpgrade()`

```typescript
const handleUpgrade = async (planDetail: PlanDetailDTO, plan: SubscriptionPlanDTO) => {
  setIsUpgrading(true);
  setIsDetailDialogOpen(false);
  
  // Validation
  if (!planDetail || !planDetail.price || planDetail.price <= 0) {
    throw new Error("Invalid plan detail. Please try again.");
  }
  if (!planDetail.id) {
    throw new Error("Missing plan option ID. Please contact support.");
  }
  if (!plan.planCode) {
    throw new Error("Missing plan code. Please contact support.");
  }
  
  // Tạo order
  const result = await paymentApi.createOrder({
    amount: amountVND,
    description,
    planCode: plan.planCode.toUpperCase(),
    planDetailId: planDetail.id,
  });
  
  // Redirect đến PayOS
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

**Xử lý lỗi:**
- Validation errors: Hiển thị toast với message cụ thể
- API errors: Catch và hiển thị error message từ server
- Missing checkoutUrl: Throw error "Failed to receive payment link from server"
- Tất cả errors đều được catch và hiển thị toast, `setIsUpgrading(false)` để unlock UI

---

### **Bước 3: Frontend gọi API tạo Order**
**File:** `src/services/api/paymentApi.ts` → `createOrder()`

```typescript
const response = await fetchWithAuth(`${API_BASE_URL}/payments/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const errorText = await response.text();
  let errorMessage = 'Unable to create order';
  try {
    const errorData = JSON.parse(errorText);
    errorMessage = errorData.desc || errorData.message || errorData.error || errorMessage;
    // Nếu có errors object, thêm chi tiết
    if (errorData.errors) {
      const errorDetails = Object.entries(errorData.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      errorMessage += ` (${errorDetails})`;
    }
  } catch {
    errorMessage = errorText || errorMessage;
  }
  throw new Error(errorMessage);
}
```

**Xử lý lỗi:**
- HTTP errors: Parse error response và extract message
- Validation errors từ backend: Hiển thị chi tiết từ `errors` object
- Network errors: Throw error để component catch
- Lưu `orderCode` vào `sessionStorage` nếu thành công

---

### **Bước 4: Backend tạo Order trong Database**
**File:** `echoverse/src/main/java/.../PaymentOrderService.java` → `createOrder()`

```java
@Transactional
public PayosGatewayResponse<PaymentOrderDTO> createOrder(CreatePayosOrderRequest request) {
    // Validation
    if (request == null) {
        throw new IllegalArgumentException("Request cannot be null");
    }
    if (request.getAmount() == null || request.getAmount() < 0) {
        throw new IllegalArgumentException("Amount must be non-negative");
    }
    if (!StringUtils.hasText(request.getDescription())) {
        throw new IllegalArgumentException("Description cannot be empty");
    }
    if (!StringUtils.hasText(request.getPlanCode())) {
        throw new IllegalArgumentException("planCode is required");
    }
    if (request.getPlanDetailId() == null) {
        throw new IllegalArgumentException("planDetailId is required");
    }
    
    // Tạo orderCode
    Long orderCode = generateOrderCode();
    
    // Lấy user từ SecurityContext
    User currentUser = SecurityUtils.getCurrentUser();
    
    // Resolve plan selection
    PlanSelection planSelection = resolvePlanSelection(request);
    
    // Tạo PaymentOrder entity
    PaymentOrder order = new PaymentOrder();
    order.setOrderCode(orderCode);
    order.setAmount(planSelection.amount());
    order.setStatus(PaymentStatus.FAILED); // Mặc định FAILED cho đến khi thanh toán thành công
    // ... set các fields khác
    
    paymentOrderRepository.save(order);
}
```

**Xử lý lỗi:**
- **Validation errors:** Throw `IllegalArgumentException` với message cụ thể
- **Plan not found:** `resolvePlanSelection()` throw `IllegalArgumentException("Plan not found with code: ...")`
- **PlanDetail not found:** Throw `IllegalArgumentException("Plan option not found for plan: ...")`
- **PlanDetail inactive:** Throw `IllegalStateException("Selected plan option is inactive...")`
- **Amount mismatch:** Throw `IllegalArgumentException("Giá gói đã thay đổi, vui lòng tải lại trang và thử lại.")`
- Tất cả errors được Spring `@ExceptionHandler` catch và trả về HTTP 400 với error message

---

### **Bước 5: Backend gọi PayOS API**
**File:** `echoverse/src/main/java/.../PayosPaymentService.java` → `createPaymentLink()`

```java
public PayosPaymentLinkResponse createPaymentLink(PayosCreatePaymentLinkRequest request) {
    try {
        CreatePaymentLinkResponse response = payOS.paymentRequests().create(builder.build());
        return PayosPaymentLinkResponse.builder()
            .checkoutUrl(response.getCheckoutUrl())
            // ... map các fields
            .build();
    } catch (Exception ex) {
        log.error("Failed to create PayOS payment link for order {}", request.getOrderCode(), ex);
        throw new IllegalStateException("Không thể tạo liên kết thanh toán PayOS: " + ex.getMessage(), ex);
    }
}
```

**Xử lý lỗi:**
- **PayOS API errors:** Catch exception, log error, throw `IllegalStateException`
- **Trong PaymentOrderService:** Nếu PayOS fail, cập nhật order status = FAILED, set `failureReason`, save vào DB, rồi throw exception
- Exception được propagate lên controller → trả về HTTP 500 cho frontend

---

### **Bước 6: Backend trả checkoutUrl về Frontend**
**File:** `echoverse/src/main/java/.../PaymentOrderService.java`

```java
// Cập nhật order với thông tin từ PayOS
updateOrderWithPayosResponse(order, payosResponse);
paymentOrderRepository.save(order);

// Trả về response
PaymentOrderDTO data = toDto(order);
return PayosGatewayResponse.<PaymentOrderDTO>builder()
    .code("00")
    .desc("success")
    .success(true)
    .data(data)
    .signature(null)
    .build();
```

**Response structure:**
```json
{
  "success": true,
  "code": "00",
  "desc": "success",
  "data": {
    "orderCode": 123456789,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "amount": 99000,
    "status": "FAILED" // Chưa thanh toán nên vẫn FAILED
  }
}
```

---

### **Bước 7: Frontend redirect đến PayOS**
**File:** `src/pages/Premium.tsx`

```typescript
if (result?.checkoutUrl) {
  window.location.href = result.checkoutUrl;
} else {
  throw new Error("Failed to receive payment link from server");
}
```

- User được redirect đến trang thanh toán PayOS
- User thực hiện thanh toán trên PayOS

---

### **Bước 8: PayOS gửi Webhook về Backend**
**File:** `echoverse/src/main/java/.../PayosWebhookController.java` → `handleWebhook()`

```java
@PostMapping("/webhook")
public ResponseEntity<Void> handleWebhook(@RequestBody(required = false) Map<String, Object> payload) {
    // Handle null payload
    if (payload == null) {
        log.error("Webhook received null payload");
        return ResponseEntity.ok().build(); // Luôn trả 200 OK cho PayOS
    }
    
    // Extract data and signature
    Object dataObj = payload.get("data");
    Object signatureObj = payload.get("signature");
    
    if (dataObj == null || signatureObj == null) {
        log.error("Webhook payload missing 'data' or 'signature' field");
        return ResponseEntity.ok().build(); // Luôn trả 200 OK
    }
    
    // Verify signature
    boolean isValid = signatureVerifier.verifySignature(webhookData, signature);
    if (!isValid) {
        log.error("Signature verification failed");
        return ResponseEntity.ok().build(); // Luôn trả 200 OK
    }
    
    // Parse webhook data
    WebhookData data = payOS.webhooks().verify(payload);
    
    // Process webhook
    try {
        paymentOrderService.handleWebhook(data);
    } catch (Exception serviceEx) {
        log.error("Error processing webhook", serviceEx);
        // Vẫn trả 200 OK để PayOS không retry
    }
    
    return ResponseEntity.ok().build();
}
```

**Xử lý lỗi:**
- **Null payload:** Log error, trả 200 OK (PayOS cần 200 để không retry)
- **Missing fields:** Log error, trả 200 OK
- **Invalid signature:** Log error, trả 200 OK (không process webhook)
- **SDK verify fail:** Log error, trả 200 OK
- **Service layer errors:** Log error, trả 200 OK (lỗi đã được log để debug)
- **Global exception handler:** Catch tất cả exceptions, log đầy đủ, trả 200 OK

**Lưu ý quan trọng:** Backend LUÔN trả 200 OK cho PayOS dù có lỗi, để PayOS không retry webhook. Lỗi được log đầy đủ để debug.

---

### **Bước 9: Backend xử lý Webhook và kích hoạt Premium**
**File:** `echoverse/src/main/java/.../PaymentOrderService.java` → `handleWebhook()`

```java
@Transactional
public void handleWebhook(WebhookData webhookData) {
    Long orderCode = webhookData.getOrderCode();
    PaymentOrder order = paymentOrderRepository.findByOrderCode(orderCode)
        .orElseGet(() -> {
            // Tạo placeholder nếu order không tồn tại
            PaymentOrder placeholder = new PaymentOrder();
            placeholder.setOrderCode(orderCode);
            placeholder.setStatus(PaymentStatus.FAILED);
            return paymentOrderRepository.save(placeholder);
        });
    
    // Cập nhật thông tin từ webhook
    order.setPayosCode(webhookData.getCode());
    order.setPayosDesc(webhookData.getDesc());
    // ... set các fields khác
    
    // Xác định trạng thái
    if ("00".equalsIgnoreCase(webhookData.getCode())) {
        // Kiểm tra amount match
        Long webhookAmount = webhookData.getAmount();
        Long orderAmount = order.getAmount();
        
        if (webhookAmount != null && orderAmount != null && webhookAmount.equals(orderAmount)) {
            order.setStatus(PaymentStatus.SUCCESS);
            order.setPaidAt(Instant.now());
            
            // Kích hoạt premium cho user
            activatePremiumForUser(order);
        } else {
            order.setStatus(PaymentStatus.FAILED);
            order.setFailureReason("Amount mismatch: order amount=" + orderAmount + ", webhook amount=" + webhookAmount);
        }
    } else {
        order.setStatus(PaymentStatus.FAILED);
        order.setFailureReason(webhookData.getDesc());
    }
    
    paymentOrderRepository.save(order);
}
```

**Xử lý lỗi:**
- **Order not found:** Tạo placeholder order với status FAILED
- **Amount mismatch:** Set status FAILED, set `failureReason` với chi tiết
- **PayOS code != "00":** Set status FAILED, set `failureReason` từ `webhookData.getDesc()`
- **Transaction errors:** Spring `@Transactional` sẽ rollback nếu có exception

---

### **Bước 10: Kích hoạt Premium cho User**
**File:** `echoverse/src/main/java/.../PaymentOrderService.java` → `activatePremiumForUser()`

```java
private void activatePremiumForUser(PaymentOrder order) {
    User user = order.getUser();
    
    // Fallback: Tìm user theo email nếu không có trong order
    if (user == null && StringUtils.hasText(order.getBuyerEmail())) {
        user = userRepository.findByEmail(order.getBuyerEmail()).orElse(null);
    }
    
    if (user == null) {
        log.warn("Cannot activate premium: user not found for order {}", order.getOrderCode());
        return; // Không throw exception, chỉ log warning
    }
    
    // Tính toán thời gian hết hạn
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime startsAt = now;
    boolean hasActivePremium = user.getIsPremium() && user.getPremiumExpiresAt() != null && user.getPremiumExpiresAt().isAfter(now);
    
    if (hasActivePremium) {
        startsAt = user.getPremiumExpiresAt(); // Gia hạn từ ngày hết hạn hiện tại
    }
    
    LocalDateTime expiresAt = startsAt.plusDays(durationSnapshot);
    
    // Cập nhật user
    user.setIsPremium(true);
    user.setPremiumExpiresAt(expiresAt);
    userRepository.save(user);
    
    // Mark các subscription cũ là EXPIRED
    premiumSubscriptionRepository.markExpiredSubscriptions(user.getId(), ...);
    
    // Tạo PremiumSubscription record
    PremiumSubscription subscription = PremiumSubscription.builder()
        .user(user)
        .paymentOrder(order)
        .status(SubscriptionStatus.ACTIVE)
        .startsAt(startsAt)
        .expiresAt(expiresAt)
        // ... set các fields
        .build();
    
    premiumSubscriptionRepository.save(subscription);
}
```

**Xử lý lỗi:**
- **User not found:** Log warning, return (không throw exception)
- **Database errors:** Spring `@Transactional` sẽ rollback nếu có exception

**Logic gia hạn Premium:**
- **Nếu user đang có premium active (chưa hết hạn):**
  - Gia hạn từ ngày hết hạn hiện tại (`startsAt = user.getPremiumExpiresAt()`)
  - Ví dụ: User còn 1 ngày (hết hạn 01/02/2026), mua gói 30 ngày → Hết hạn mới: 03/03/2026
  - Log chi tiết: số ngày còn lại, ngày hết hạn hiện tại
  
- **Nếu user không có premium active hoặc đã hết hạn:**
  - Bắt đầu từ thời điểm hiện tại (`startsAt = now`)
  - Ví dụ: User hết hạn hoặc chưa có premium, mua gói 30 ngày → Hết hạn: 30 ngày từ bây giờ
  - Log chi tiết: trạng thái premium hiện tại

**Ví dụ cụ thể:**
```
Tình huống 1: User còn 1 ngày premium
- Premium hiện tại: Hết hạn 01/02/2026, 09:14 AM
- Mua gói: 30 ngày
- Kết quả: Premium mới hết hạn 03/03/2026, 09:14 AM (30 ngày từ 01/02/2026)

Tình huống 2: User đã hết hạn premium
- Premium hiện tại: Đã hết hạn 01/01/2026
- Mua gói: 30 ngày
- Kết quả: Premium mới hết hạn 31/01/2026, 09:14 AM (30 ngày từ bây giờ)
```

---

### **Bước 11: PayOS redirect về Frontend**
Sau khi thanh toán, PayOS redirect user về:
- **Success:** `/payment/success?orderCode=123456789`
- **Cancel:** `/payment/cancel`

---

### **Bước 12: Frontend xử lý Payment Success**
**File:** `src/pages/PaymentSuccess.tsx`

```typescript
useEffect(() => {
  const urlOrderCode = searchParams.get('orderCode');
  const sessionOrderCode = sessionStorage.getItem('payos_order_code');
  
  const code = urlOrderCode ? parseInt(urlOrderCode) : sessionOrderCode ? parseInt(sessionOrderCode) : null;
  
  if (!code) {
    setLoading(false);
    toast({
      title: 'Error',
      description: 'Order code not found',
      variant: 'destructive',
    });
    return;
  }
  
  setOrderCode(code);
  sessionStorage.removeItem('payos_order_code');
  fetchOrderDetail(code);
}, []);

const fetchOrderDetail = useCallback(async (code: number) => {
  try {
    setLoading(true);
    const detail = await paymentApi.getOrderDetail(code);
    setOrderDetail(detail);
    setFeatureSnapshot(parsePlanFeatureSnapshot(detail.planFeatureSnapshot));
  } catch (error) {
    toast({
      title: 'Unable to load order',
      description: error instanceof Error ? error.message : 'Something went wrong',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
}, [toast]);
```

**Xử lý lỗi:**
- **Missing orderCode:** Hiển thị toast error
- **API errors:** Catch và hiển thị error message
- **Invalid JSON:** `parsePlanFeatureSnapshot()` return empty array nếu parse fail

---

### **Bước 13: Frontend xử lý Payment Cancel**
**File:** `src/pages/PaymentCancel.tsx`

```typescript
// Xóa orderCode khỏi sessionStorage khi vào trang này
if (typeof window !== 'undefined') {
  sessionStorage.removeItem('payos_order_code');
}
```

- Hiển thị message "Payment Cancelled"
- Cung cấp button để quay lại trang Premium

---

## 🔍 Chi Tiết Xử Lý Lỗi Theo Từng Layer

### **1. Frontend Layer (React/TypeScript)**

#### **Validation Errors**
- **Location:** `src/pages/Premium.tsx` → `handleUpgrade()`
- **Checks:**
  - `planDetail` không null
  - `planDetail.price > 0`
  - `planDetail.id` tồn tại
  - `plan.planCode` tồn tại
- **Error Handling:** Throw Error với message cụ thể, catch và hiển thị toast

#### **API Errors**
- **Location:** `src/services/api/paymentApi.ts`
- **Error Types:**
  - HTTP errors (4xx, 5xx)
  - Network errors
  - JSON parse errors
  - Missing required fields trong response
- **Error Handling:**
  - Parse error response từ server
  - Extract error message từ `desc`, `message`, hoặc `error` field
  - Nếu có `errors` object, format thành readable string
  - Throw Error để component catch

#### **State Management Errors**
- **Location:** Các React components
- **Error Handling:**
  - Try-catch trong async functions
  - Set loading states để prevent duplicate requests
  - Reset UI state khi có lỗi

---

### **2. Backend API Layer (Spring Boot)**

#### **Validation Errors**
- **Location:** `PaymentOrderService.createOrder()`
- **Checks:**
  - Request không null
  - Amount >= 0
  - Description không empty
  - PlanCode không empty
  - PlanDetailId không null
- **Error Handling:** Throw `IllegalArgumentException`, Spring trả HTTP 400

#### **Business Logic Errors**
- **Location:** `PaymentOrderService.resolvePlanSelection()`
- **Error Types:**
  - Plan not found
  - PlanDetail not found
  - PlanDetail inactive
  - Amount mismatch
- **Error Handling:** Throw exceptions với message cụ thể, Spring trả HTTP 400/500

#### **External API Errors (PayOS)**
- **Location:** `PayosPaymentService.createPaymentLink()`
- **Error Handling:**
  - Catch PayOS SDK exceptions
  - Log error đầy đủ
  - Throw `IllegalStateException` với message
  - PaymentOrderService catch và cập nhật order status = FAILED

#### **Database Errors**
- **Location:** Tất cả service methods với `@Transactional`
- **Error Handling:**
  - Spring `@Transactional` tự động rollback nếu có exception
  - Log errors để debug
  - Propagate exception lên controller

---

### **3. Webhook Layer**

#### **Webhook Validation Errors**
- **Location:** `PayosWebhookController.handleWebhook()`
- **Checks:**
  - Payload không null
  - Có `data` và `signature` fields
  - Signature hợp lệ (HMAC_SHA256)
  - PayOS SDK verify thành công
- **Error Handling:**
  - Log error đầy đủ
  - **LUÔN trả 200 OK** cho PayOS (để PayOS không retry)
  - Không process webhook nếu validation fail

#### **Webhook Processing Errors**
- **Location:** `PaymentOrderService.handleWebhook()`
- **Error Types:**
  - Order not found (tạo placeholder)
  - Amount mismatch
  - PayOS code != "00"
  - User not found (khi activate premium)
- **Error Handling:**
  - Log warnings/errors
  - Set order status = FAILED nếu có lỗi
  - Set `failureReason` với chi tiết
  - **LUÔN trả 200 OK** cho PayOS

#### **Premium Activation Errors**
- **Location:** `PaymentOrderService.activatePremiumForUser()`
- **Error Types:**
  - User not found
  - Database errors
- **Error Handling:**
  - Log warning nếu user not found (không throw exception)
  - Spring `@Transactional` rollback nếu có database exception

---

## 🛡️ Error Recovery Strategies

### **1. Retry Logic**
- **Frontend:** Không có auto-retry, user phải click lại
- **Backend:** Không có retry cho webhook (PayOS sẽ tự retry nếu webhook trả non-200)

### **2. Fallback Mechanisms**
- **User lookup:** Nếu không có user trong SecurityContext, tìm theo email
- **Order creation:** Nếu order không tồn tại khi nhận webhook, tạo placeholder
- **Plan resolution:** Fallback plan nếu không parse được từ description

### **3. Data Consistency**
- **Transaction management:** Tất cả operations quan trọng đều trong `@Transactional`
- **Status tracking:** Order status được cập nhật ở mọi bước
- **Failure reasons:** Lưu `failureReason` để debug

### **4. Monitoring & Logging**
- **Log levels:**
  - `INFO`: Normal flow steps
  - `WARN`: Recoverable errors (user not found, etc.)
  - `ERROR`: Critical errors (PayOS API fail, database errors)
- **Log content:**
  - Order codes
  - User IDs/emails
  - Error messages và stack traces
  - Webhook payloads (debug mode)

---

## 📊 Error Scenarios và Cách Xử Lý

### **Scenario 1: User cancel payment trên PayOS**
- **Flow:** User click cancel → PayOS redirect về `/payment/cancel`
- **Handling:** Frontend hiển thị cancel page, xóa orderCode khỏi sessionStorage
- **Order status:** Vẫn là FAILED (chưa thanh toán)

### **Scenario 2: PayOS webhook không đến**
- **Flow:** User thanh toán thành công nhưng webhook không đến backend
- **Handling:** 
  - Order status vẫn là FAILED
  - User có thể check order status trên frontend
  - Admin có thể manually trigger webhook hoặc activate premium

### **Scenario 3: Amount mismatch trong webhook**
- **Flow:** PayOS trả về amount khác với amount trong order
- **Handling:**
  - Order status = FAILED
  - `failureReason` = "Amount mismatch: order amount=X, webhook amount=Y"
  - Premium không được activate
  - Admin cần investigate

### **Scenario 4: User not found khi activate premium**
- **Flow:** Webhook thành công nhưng không tìm thấy user
- **Handling:**
  - Log warning
  - Order status = SUCCESS (vì PayOS đã thanh toán)
  - Premium không được activate
  - Admin cần manually activate premium cho user

### **Scenario 5: Database error khi save order**
- **Flow:** Exception xảy ra trong `@Transactional` method
- **Handling:**
  - Spring rollback transaction
  - Exception được propagate lên controller
  - Controller trả HTTP 500
  - Frontend hiển thị error message

### **Scenario 6: PayOS API timeout**
- **Flow:** PayOS API không response trong thời gian cho phép
- **Handling:**
  - PayosPaymentService throw exception
  - PaymentOrderService catch, set order status = FAILED, save
  - Throw exception lên controller
  - Frontend hiển thị error message

---

## 🔐 Security Considerations

### **1. Signature Verification**
- **Webhook:** PayOS webhook phải có signature hợp lệ (HMAC_SHA256)
- **Failure handling:** Reject webhook nếu signature không hợp lệ, nhưng vẫn trả 200 OK

### **2. User Authorization**
- **Order access:** User chỉ có thể xem orders của chính mình
- **Admin access:** Admin có thể xem tất cả orders

### **3. Amount Validation**
- **Double-check:** Backend validate amount từ frontend với amount trong database
- **Webhook verification:** Verify amount từ webhook với amount trong order

---

## 📝 Best Practices

1. **Luôn log errors đầy đủ** với context (orderCode, userId, etc.)
2. **Luôn trả 200 OK cho PayOS webhook** dù có lỗi (để PayOS không retry)
3. **Validate input ở mọi layer** (frontend, backend API, webhook)
4. **Use transactions** cho operations quan trọng
5. **Store failure reasons** để debug sau
6. **Provide clear error messages** cho end users
7. **Handle edge cases** (user not found, order not found, etc.)

---

## 🧪 Testing Error Scenarios

### **Frontend Testing**
- Test validation errors trong `handleUpgrade()`
- Test API errors (network, 4xx, 5xx)
- Test missing orderCode trên success page

### **Backend Testing**
- Test validation errors trong `createOrder()`
- Test PayOS API failures
- Test webhook với invalid signature
- Test amount mismatch scenarios
- Test user not found scenarios

### **Integration Testing**
- Test full flow từ frontend → backend → PayOS → webhook
- Test error recovery
- Test data consistency

---

## 📚 Related Files

### **Frontend**
- `src/pages/Premium.tsx` - Premium page và order creation
- `src/pages/PaymentSuccess.tsx` - Success page
- `src/pages/PaymentCancel.tsx` - Cancel page
- `src/services/api/paymentApi.ts` - Payment API client

### **Backend**
- `PaymentOrderController.java` - Payment API endpoints
- `PaymentOrderService.java` - Business logic
- `PayosPaymentService.java` - PayOS integration
- `PayosWebhookController.java` - Webhook handler

---

## 🎯 Summary

Luồng mua gói Premium được thiết kế với nhiều lớp validation và error handling:

1. **Frontend:** Validate input, handle API errors, hiển thị user-friendly messages
2. **Backend API:** Validate requests, handle business logic errors, integrate với PayOS
3. **Webhook:** Verify signatures, process payments, activate premium
4. **Error Recovery:** Log errors, store failure reasons, provide fallback mechanisms

Tất cả errors đều được log đầy đủ để debug, và hệ thống được thiết kế để graceful degradation khi có lỗi xảy ra.

