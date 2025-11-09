// Service để lấy tỉ giá USD/VNĐ
// Sử dụng API miễn phí từ exchangerate-api.com

const EXCHANGE_RATE_CACHE_KEY = 'usd_vnd_rate';
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 giờ

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

/**
 * Lấy tỉ giá USD/VNĐ từ cache hoặc API
 */
export const exchangeRateApi = {
  /**
   * Lấy tỉ giá USD sang VNĐ
   * Sử dụng cache để tránh gọi API quá nhiều
   */
  getUSDtoVND: async (): Promise<number> => {
    // Kiểm tra cache trước
    const cached = getCachedRate();
    if (cached) {
      return cached;
    }

    try {
      // Thử các API miễn phí
      let rate = await fetchFromExchangeRateAPI();
      
      // Nếu không lấy được, dùng tỉ giá mặc định (có thể cập nhật thủ công)
      if (!rate || rate <= 0) {
        rate = 24000; // Tỉ giá mặc định ~24,000 VNĐ/USD
      }

      // Lưu vào cache
      cacheRate(rate);
      
      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Trả về tỉ giá mặc định nếu có lỗi
      return 24000;
    }
  },

  /**
   * Tính giá VNĐ từ USD
   */
  convertUSDtoVND: async (usdAmount: number): Promise<number> => {
    const rate = await exchangeRateApi.getUSDtoVND();
    return Math.round(usdAmount * rate);
  },
};

/**
 * Lấy tỉ giá từ API exchangerate-api.com (miễn phí, không cần key)
 */
async function fetchFromExchangeRateAPI(): Promise<number | null> {
  try {
    // API 1: exchangerate-api.com (miễn phí, không cần key)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (response.ok) {
      const data = await response.json();
      const vndRate = data.rates?.VND;
      if (vndRate && vndRate > 0) {
        return vndRate;
      }
    }
  } catch (error) {
    console.error('ExchangeRate API error:', error);
  }

  // Thử API 2: fixer.io (cần key, nhưng có thể dùng free tier)
  // Hoặc có thể dùng API khác nếu cần

  return null;
}

/**
 * Lấy tỉ giá từ cache
 */
function getCachedRate(): number | null {
  try {
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (cached) {
      const data: ExchangeRateCache = JSON.parse(cached);
      const now = Date.now();
      
      // Kiểm tra xem cache còn hợp lệ không (trong vòng 1 giờ)
      if (now - data.timestamp < EXCHANGE_RATE_CACHE_DURATION) {
        return data.rate;
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }
  
  return null;
}

/**
 * Lưu tỉ giá vào cache
 */
function cacheRate(rate: number): void {
  try {
    const data: ExchangeRateCache = {
      rate,
      timestamp: Date.now(),
    };
    localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching rate:', error);
  }
}


