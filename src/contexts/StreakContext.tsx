import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
  const [notifications, setNotifications] = useState<StreakNotification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<StreakNotification, 'id' | 'timestamp' | 'shown'>) => {
      const id = `${notification.friendId}-${notification.type}-${Date.now()}`;
      setNotifications((prev) => [
        ...prev,
        {
          ...notification,
          id,
          timestamp: Date.now(),
          shown: false,
        },
      ]);

      // Auto-remove notification after 10 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 10000);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAsShown = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, shown: true } : n))
    );
  }, []);

  return (
    <StreakContext.Provider value={{ notifications, addNotification, removeNotification, markAsShown }}>
      {children}
    </StreakContext.Provider>
  );
};

export const useStreakNotifications = () => {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error('useStreakNotifications must be used within StreakProvider');
  }
  return context;
};
