export const CHAT_TAB_OPENED_EVENT = 'app:chat-tab-opened';

type ChatTabPayload = {
  friendId?: string | null;
  roomId?: string | null; // pl_{playlistId} for group chat
};

export const emitChatTabOpened = (payload?: ChatTabPayload) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ChatTabPayload>(CHAT_TAB_OPENED_EVENT, { detail: payload })
  );
};



