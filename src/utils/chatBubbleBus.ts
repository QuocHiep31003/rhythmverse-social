const CHAT_BUBBLE_EVENT = 'app:chatbubble';

export type ChatBubblePayload = {
  id?: string;
  from: string;
  message: string;
  avatar?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  meta?: Record<string, unknown>;
};

export const emitChatBubble = (payload: ChatBubblePayload) => {
  if (typeof window === 'undefined') return;
  const detail: ChatBubblePayload = {
    id: payload.id ?? `${Date.now()}`,
    variant: payload.variant ?? 'info',
    ...payload,
  };
  window.dispatchEvent(new CustomEvent(CHAT_BUBBLE_EVENT, { detail }));
};

export const subscribeChatBubble = (
  handler: (payload: ChatBubblePayload) => void
) => {
  if (typeof window === 'undefined') return () => {};
  const wrapped = (event: Event) => {
    const custom = event as CustomEvent<ChatBubblePayload>;
    if (custom.detail) {
      handler(custom.detail);
    }
  };
  window.addEventListener(CHAT_BUBBLE_EVENT, wrapped as EventListener);
  return () => {
    window.removeEventListener(CHAT_BUBBLE_EVENT, wrapped as EventListener);
  };
};

export { CHAT_BUBBLE_EVENT };



