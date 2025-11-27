import type { NotificationDTO } from '@/services/firebase/notifications';

const TEMP_NOTIFICATION_EVENT = 'app:temp-notification';

export type TempNotificationPayload = NotificationDTO;

/**
 * Emit a temporary notification event
 * This is used when backend doesn't create notification (e.g., friend requests)
 * Components listening to this event will add the notification to their state
 */
export const emitTempNotification = (payload: TempNotificationPayload) => {
  if (typeof window === 'undefined') return;
  const detail: TempNotificationPayload = {
    ...payload,
    id: payload.id ?? `temp-${Date.now()}`,
  };
  window.dispatchEvent(new CustomEvent(TEMP_NOTIFICATION_EVENT, { detail }));
};

/**
 * Subscribe to temporary notification events
 */
export const subscribeTempNotification = (
  handler: (payload: TempNotificationPayload) => void
) => {
  if (typeof window === 'undefined') return () => {};
  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<TempNotificationPayload>;
    if (custom.detail) {
      handler(custom.detail);
    }
  };
  window.addEventListener(TEMP_NOTIFICATION_EVENT, wrapped as EventListener);
  return () => {
    window.removeEventListener(TEMP_NOTIFICATION_EVENT, wrapped as EventListener);
  };
};

export { TEMP_NOTIFICATION_EVENT };

