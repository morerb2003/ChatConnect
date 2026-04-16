import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration - Update these with your Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp = null;
let messaging = null;

export const initializeFirebase = () => {
  try {
    if (!firebaseApp && firebaseConfig.projectId) {
      firebaseApp = initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
      return firebaseApp;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
  return firebaseApp;
};

export const getFirebaseMessaging = () => {
  if (!messaging && firebaseApp) {
    try {
      messaging = getMessaging(firebaseApp);
    } catch (error) {
      console.error('Failed to get Firebase messaging:', error);
    }
  }
  return messaging;
};

export const requestNotificationPermission = async () => {
  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported');
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported');
      return null;
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      return await getTokenFromFirebase();
    }

    // Request permission
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return await getTokenFromFirebase();
      }
    }

    console.log('Notification permission denied');
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

const getTokenFromFirebase = async () => {
  try {
    // Register service worker
    await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    // Get messaging instance
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.warn('Firebase messaging not initialized');
      return null;
    }

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('FCM Token obtained:', token);
      return token;
    }
  } catch (error) {
    console.error('Failed to get FCM token:', error);
  }
  return null;
};

export const setupMessageListener = (onMessageCallback) => {
  try {
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.warn('Firebase messaging not initialized');
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Message received:', payload);
      if (onMessageCallback) {
        onMessageCallback(payload);
      }
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
  }
};
