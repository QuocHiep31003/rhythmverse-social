import { useEffect, useState } from "react";

interface UseCountUpOptions {
  duration?: number; // Thời gian animation (ms)
  startOnMount?: boolean; // Tự động bắt đầu khi mount
}

/**
 * Hook để tạo hiệu ứng số tăng dần từ 0 đến giá trị target
 */
export function useCountUp(
  targetValue: number | undefined | null,
  options: UseCountUpOptions = {}
) {
  const { duration = 1500, startOnMount = true } = options;
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (targetValue === undefined || targetValue === null) {
      setCount(0);
      setIsAnimating(false);
      return;
    }

    // Reset và bắt đầu animation mới khi targetValue thay đổi
    setIsAnimating(true);
    setCount(0);

    const startTime = Date.now();
    const startValue = 0;
    const endValue = targetValue;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        setIsAnimating(false);
      }
    };

    const rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [targetValue, duration]);

  const start = () => {
    setIsAnimating(true);
  };

  return { count, isAnimating, start };
}

