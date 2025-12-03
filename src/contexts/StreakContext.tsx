import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface StreakNotification {
  id: string;
  type: 'warning' | 'expired' | 'started';
  friendId: string;
  friendName: string;
  hoursRemaining?: number;
  currentStreak?: number;
  timestamp: number;
  shown: boolean;
}

interface StreakContextType {
  notifications: StreakNotification[];
  addNotification: (notification: Omit<StreakNotification, 'id' | 'timestamp' | 'shown'>) => void;
  removeNotification: (id: string) => void;
  markAsShown: (id: string) => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Không đọc từ localStorage nữa – chỉ giữ streak notifications trong memory cho session hiện tại
  const [notifications, setNotifications] = useState<StreakNotification[]>([]);

  // Persist no-op: không ghi xuống localStorage nữa
  const persist = useCallback((_next: StreakNotification[]) => {
    // noop
  }, []);

  const addNotification = useCallback(
    (notification: Omit<StreakNotification, 'id' | 'timestamp' | 'shown'>) => {
      const id = `${notification.friendId}-${notification.type}-${Date.now()}`;
      setNotifications((prev) => {
        // Tránh tạo trùng 1 thông báo khi chỉ reload tab / re-mount
        const hasDuplicate = prev.some((n) => {
          if (n.friendId !== notification.friendId || n.type !== notification.type) return false;
          if (
            typeof notification.currentStreak === 'number' &&
            typeof n.currentStreak === 'number' &&
            notification.currentStreak === n.currentStreak
          ) {
            return true;
          }
          if (
            typeof notification.hoursRemaining === 'number' &&
            typeof n.hoursRemaining === 'number' &&
            notification.hoursRemaining === n.hoursRemaining
          ) {
            return true;
          }
          // Nếu không có thêm thông tin, coi như 1 loại/thằng bạn chỉ có 1 notification
          if (notification.currentStreak == null && notification.hoursRemaining == null) {
            return true;
          }
          return false;
        });
        if (hasDuplicate) {
          return prev;
        }

        const next = [
          ...prev,
          {
            ...notification,
            id,
            timestamp: Date.now(),
            shown: false,
          },
        ];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const markAsShown = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, shown: true } : n));
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <StreakContext.Provider value={{ notifications, addNotification, removeNotification, markAsShown }}>
      {children}
    </StreakContext.Provider>
  );
};

export const useStreakNotifications = () => {
  const context = useContext(StreakContext);
  if (!context) {
    // Fallback an toàn: tránh crash app nếu provider chưa được mount đúng
    return {
      notifications: [] as StreakNotification[],
      addNotification: () => {},
      removeNotification: () => {},
      markAsShown: () => {},
    } as StreakContextType;
  }
  return context;
};
