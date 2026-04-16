import { useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';

/**
 * NotificationSetup Component
 * Initializes Firebase Cloud Messaging and handles push notifications
 * This component should be rendered once in the app hierarchy
 */
export const NotificationSetup = () => {
  const { initialize, cleanup } = useNotification();

  useEffect(() => {
    // Initialize notifications when component mounts
    initialize();

    // Cleanup on unmount (logout case)
    return () => {
      cleanup();
    };
  }, [initialize, cleanup]);

  // This component doesn't render anything, it's just for side effects
  return null;
};

export default NotificationSetup;
