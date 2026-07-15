// Firebase Cloud Messaging Service Worker
// This file MUST be at the root public path: /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are injected at build time or hardcoded here for the SW context
// (Service workers cannot access import.meta.env)
// Replace with your actual Firebase config values:
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || 'your-api-key',
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || 'your-project.firebaseapp.com',
  projectId:         self.__FIREBASE_PROJECT_ID__         || 'your-project-id',
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || 'your-project.appspot.com',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__|| 'your-sender-id',
  appId:             self.__FIREBASE_APP_ID__             || 'your-app-id',
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  const { title = 'ScamChek Alert', body = '' } = payload.notification || {};

  self.registration.showNotification(title, {
    body,
    icon:  '/shield.svg',
    badge: '/shield.svg',
    data:  payload.data || {},
    actions: [{ action: 'open', title: 'View Details' }],
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
