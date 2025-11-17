/**
 * Utility để xác thực chữ ký HMAC_SHA256 từ PayOS webhook
 * 
 * Thuật toán:
 * 1. Sắp xếp các key trong data object theo thứ tự alphabet
 * 2. Chuyển đổi thành query string: key1=value1&key2=value2...
 * 3. Tạo HMAC_SHA256 signature: hash_hmac("sha256", data, checksum_key)
 * 4. So sánh với signature từ webhook
 * 
 * ⚠️ LƯU Ý: Checksum key không nên expose ở Frontend vì lý do bảo mật.
 * Nên sử dụng utility này chỉ khi thực sự cần thiết (ví dụ: testing, hoặc
 * khi nhận data từ PayOS returnUrl có kèm signature).
 * Trong production, nên để Backend xử lý signature verification.
 */

// Checksum key từ PayOS (nên lưu trong environment variable)
// ⚠️ WARNING: Không nên hardcode key này trong production code!
const PAYOS_CHECKSUM_KEY = import.meta.env.VITE_PAYOS_CHECKSUM_KEY || 
  'bd48a3059d80b272038d9403b3c777b671156dd9558aac3954873d69b729d265';

/**
 * Sắp xếp object theo key alphabet
 */
function sortObjDataByKey<T extends Record<string, any>>(object: T): T {
  const orderedObject = {} as T;
  Object.keys(object)
    .sort()
    .forEach((key) => {
      orderedObject[key as keyof T] = object[key];
    });
  return orderedObject;
}

/**
 * Chuyển đổi object thành query string format: key1=value1&key2=value2...
 * 
 * Xử lý:
 * - null/undefined -> empty string
 * - Array -> JSON.stringify sau khi sort từng item
 * - Object -> JSON.stringify sau khi sort
 */
function convertObjToQueryStr(object: Record<string, any>): string {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];
      
      // Sort nested object
      if (value && Array.isArray(value)) {
        value = JSON.stringify(value.map((val) => 
          typeof val === 'object' && val !== null 
            ? sortObjDataByKey(val) 
            : val
        ));
      } else if (value && typeof value === 'object' && value !== null) {
        value = JSON.stringify(sortObjDataByKey(value));
      }
      
      // Set empty string if null
      if ([null, undefined, 'undefined', 'null'].includes(value)) {
        value = '';
      }

      return `${key}=${value}`;
    })
    .join('&');
}

/**
 * Tạo HMAC_SHA256 signature sử dụng Web Crypto API
 */
async function createHmacSha256(data: string, key: string): Promise<string> {
  // Chuyển đổi key và data thành Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const dataBytes = encoder.encode(data);

  // Import key cho HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Tạo signature
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);

  // Chuyển đổi signature thành hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Xác thực chữ ký từ webhook data
 * 
 * @param webhookData Object chứa data từ webhook (phần "data" trong payload)
 * @param signature Chữ ký từ webhook (phần "signature" trong payload)
 * @param checksumKey Checksum key từ PayOS (optional, sẽ dùng default nếu không cung cấp)
 * @returns Promise<boolean> true nếu chữ ký hợp lệ, false nếu không
 */
export async function verifyPayosSignature(
  webhookData: Record<string, any>,
  signature: string,
  checksumKey?: string
): Promise<boolean> {
  if (!webhookData || !signature || signature.trim() === '') {
    console.warn('[PayosSignatureVerifier] Webhook data or signature is null/empty');
    return false;
  }

  try {
    const key = checksumKey || PAYOS_CHECKSUM_KEY;
    
    // Sắp xếp data theo key alphabet
    const sortedDataByKey = sortObjDataByKey(webhookData);
    
    // Chuyển đổi thành query string
    const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
    
    console.debug('[PayosSignatureVerifier] Data for signature:', dataQueryStr);
    
    // Tạo HMAC_SHA256 signature
    const dataToSignature = await createHmacSha256(dataQueryStr, key);
    
    console.debug('[PayosSignatureVerifier] Calculated signature:', dataToSignature);
    console.debug('[PayosSignatureVerifier] Received signature:', signature);
    
    // So sánh signature (case-insensitive)
    const isValid = dataToSignature.toLowerCase() === signature.toLowerCase();
    
    if (!isValid) {
      console.warn('[PayosSignatureVerifier] Signature verification failed.', {
        expected: dataToSignature,
        received: signature,
      });
    } else {
      console.info('[PayosSignatureVerifier] Signature verification successful');
    }
    
    return isValid;
  } catch (error) {
    console.error('[PayosSignatureVerifier] Error verifying signature:', error);
    return false;
  }
}

/**
 * Xác thực chữ ký từ webhook payload đầy đủ
 * 
 * @param payload Webhook payload từ PayOS có cấu trúc: { code, desc, success, data, signature }
 * @param checksumKey Checksum key từ PayOS (optional)
 * @returns Promise<boolean> true nếu chữ ký hợp lệ, false nếu không
 */
export async function verifyPayosWebhookPayload(
  payload: {
    code?: string;
    desc?: string;
    success?: boolean;
    data?: Record<string, any>;
    signature?: string;
  },
  checksumKey?: string
): Promise<boolean> {
  if (!payload || !payload.data || !payload.signature) {
    console.warn('[PayosSignatureVerifier] Webhook payload missing data or signature');
    return false;
  }

  return verifyPayosSignature(payload.data, payload.signature, checksumKey);
}

/**
 * Export checksum key getter (chỉ để debug/testing)
 */
export function getPayosChecksumKey(): string {
  return PAYOS_CHECKSUM_KEY;
}

