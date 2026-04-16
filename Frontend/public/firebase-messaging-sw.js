/* Service Worker for handling Firebase Cloud Messaging push notifications */

// Firebase initialization inside the service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Handle push notifications when they arrive
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.notification?.body || 'New message',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'notification',
      requireInteraction: false,
      data: data.data || {},
    };

    if (data.notification?.title) {
      options.title = data.notification.title;
    }

    event.waitUntil(
      self.registration.showNotification(
        data.notification?.title || 'ChatConnect',
        options
      )
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

// Background message handler for when app is in background
if (typeof firebase !== 'undefined') {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
