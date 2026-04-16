import { api } from './api';

const NOTIFICATIONS_API_BASE = '/api/notifications';

export const notificationService = {
  /**
   * Register a device token with the backend
   */
  registerDeviceToken: async (token, deviceName, deviceType = 'WEB') => {
    try {
      const response = await api.post(`${NOTIFICATIONS_API_BASE}/device-token`, {
        token,
        deviceName,
        deviceType,
      });
      console.log('Device token registered:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to register device token:', error);
      throw error;
    }
  },

  /**
   * Deactivate a specific device token
   */
  deactivateDeviceToken: async (token) => {
    try {
      const response = await api.delete(`${NOTIFICATIONS_API_BASE}/device-token`, {
        params: { token },
      });
      console.log('Device token deactivated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to deactivate device token:', error);
      throw error;
    }
  },

  /**
   * Deactivate all device tokens (typically on logout)
   */
  deactivateAllDeviceTokens: async () => {
    try {
      const response = await api.delete(`${NOTIFICATIONS_API_BASE}/device-tokens/all`);
      console.log('All device tokens deactivated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to deactivate all device tokens:', error);
      throw error;
    }
  },

  /**
   * Get device name from browser/OS
   */
  getDeviceName: () => {
    const userAgent = navigator.userAgent;

    // Simple device detection
    if (userAgent.includes('Windows')) {
      return 'Windows Browser';
    } else if (userAgent.includes('Mac')) {
      return 'Mac Browser';
    } else if (userAgent.includes('Linux')) {
      return 'Linux Browser';
    } else if (userAgent.includes('iPhone')) {
      return 'iPhone';
    } else if (userAgent.includes('iPad')) {
      return 'iPad';
    } else if (userAgent.includes('Android')) {
      return 'Android Device';
    }

    // Extract browser name
    if (userAgent.includes('Chrome')) {
      return 'Chrome Browser';
    } else if (userAgent.includes('Safari')) {
      return 'Safari Browser';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox Browser';
    } else if (userAgent.includes('Edge')) {
      return 'Edge Browser';
    }

    return 'Unknown Device';
  },
};
