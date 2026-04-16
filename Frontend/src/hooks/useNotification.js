import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  initializeFirebase,
  requestNotificationPermission,
  setupMessageListener,
} from '../services/firebaseService';
import { notificationService } from '../services/notificationService';

export const useNotification = () => {
  const { user, isAuthenticated } = useAuth();
  const tokenRegistered = useRef(false);
  const unsubscribeRef = useRef(null);

  // Initialize Firebase and request notification permission
  const initializeNotifications = useCallback(async () => {
    if (!isAuthenticated || tokenRegistered.current) {
      return;
    }

    try {
      // Initialize Firebase
      initializeFirebase();

      // Request notification permission and get token
      const token = await requestNotificationPermission();

      if (token) {
        // Register token with backend
        const deviceName = notificationService.getDeviceName();
        await notificationService.registerDeviceToken(token, deviceName, 'WEB');
        tokenRegistered.current = true;

        console.log('Notifications initialized successfully');
      } else {
        console.log('User denied notification permission');
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }, [isAuthenticated]);

  // Setup message listener for foreground notifications
  const setupListener = useCallback(() => {
    setupMessageListener((payload) => {
      console.log('Foreground message:', payload);

      // Create a custom notification even when app is in foreground
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = payload.notification?.title || 'ChatConnect';
        const options = {
          body: payload.notification?.body || 'New message',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'notification',
          data: payload.data || {},
        };

        new Notification(title, options);
      }
    });
  }, []);

  // Initialize notifications on mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      initializeNotifications();
      setupListener();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isAuthenticated, initializeNotifications, setupListener]);

  // Cleanup on logout
  const cleanup = useCallback(async () => {
    try {
      await notificationService.deactivateAllDeviceTokens();
      tokenRegistered.current = false;
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    }
  }, []);

  return {
    initialize: initializeNotifications,
    cleanup,
    isSetup: tokenRegistered.current,
  };
};
