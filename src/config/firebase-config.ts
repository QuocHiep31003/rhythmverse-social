import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase config - Update với values từ Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJhXGzQ0QZxQxQxQxQxQxQxQxQxQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "echoverse-19d95.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://echoverse-19d95-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "echoverse-19d95",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "echoverse-19d95.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Kiểm tra config trước khi khởi tạo
const hasPlaceholder = firebaseConfig.messagingSenderId === "YOUR_SENDER_ID" || firebaseConfig.appId === "YOUR_APP_ID";
if (hasPlaceholder && import.meta.env.DEV) {
  console.warn('[Firebase Config] ⚠️ Có placeholder values trong Firebase config. Vui lòng cập nhật trong .env hoặc firebase-config.ts');
}

let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log('[Firebase Config] ✅ Firebase initialized successfully');
} catch (error) {
  console.error('[Firebase Config] ❌ Failed to initialize Firebase:', error);
  throw error;
}

export { database };

