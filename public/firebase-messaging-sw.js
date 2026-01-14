importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

console.log('[firebase-messaging-sw.js] Service Worker loaded v1.4 (Fixed)');

const logChannel = new BroadcastChannel('sw-logs');
function swLog(msg, data = null) {
    console.log(`[SW LOG] ${msg}`, data || '');
    logChannel.postMessage({ type: 'LOG', message: msg, data: data });
}

self.addEventListener('install', (event) => {
    swLog('Installing v1.4...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    swLog('Activating v1.4...');
    event.waitUntil(self.clients.claim());
});

// Initialize the Firebase app in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyAwEBxNqpMyHxZARoKi8WoEiAxWxagwwQs",
    authDomain: "shamed-push.firebaseapp.com",
    projectId: "shamed-push",
    storageBucket: "shamed-push.firebasestorage.app",
    messagingSenderId: "647009380094",
    appId: "1:647009380094:web:1921a0f77b98dad9fda7af"
});

const messaging = firebase.messaging();

// Add raw push listener for deep debugging
self.addEventListener('push', function (event) {
    swLog('RAW PUSH RECEIVED! (Event types cannot be cloned)');

    let payload = {};
    let title = "Shamieda System";
    let body = "New Notification";
    let url = "/";

    if (event.data) {
        try {
            const json = event.data.json();
            payload = json;
            // Support both data structure and notification structure
            title = json.notification?.title || json.data?.title || title;
            body = json.notification?.body || json.data?.body || body;
            url = json.data?.url || "/";
            swLog('Parsed Push Data:', { title, body, url });
        } catch (e) {
            swLog('Failed to parse push data, using default.');
        }
    }

    const options = {
        body: body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'shamieda-noti',
        renotify: true,
        data: { url: url }
    };

    // FORCE DISPLAY NOTIFICATION
    // This ensures it shows up even if the tab is considered "focused" by Firebase
    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => swLog('System Notification Forced Display OK'))
            .catch(err => swLog('System Notification Error:', err))
    );
});

// Listen for messages from the main page
self.addEventListener('message', (event) => {
    swLog('Message received from page:', event.data);
    if (event.data && event.data.type === 'TEST_NOTIFICATION') {
        const title = "Test SW Noti";
        const options = {
            body: "Ini adalah test dari Service Worker terus!",
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'sw-test'
        };
        event.waitUntil(
            self.registration.showNotification(title, options)
                .then(() => swLog('Test notification shown!'))
                .catch(err => swLog('Failed to show test notification:', err))
        );
    }
});

messaging.onBackgroundMessage((payload) => {
    swLog('Received background message ', payload);

    // Fallback if notification object is missing
    const title = payload.notification?.title || payload.data?.title || "Shamieda System";
    const body = payload.notification?.body || payload.data?.body || "Anda ada pesanan baru!";

    const notificationOptions = {
        body: body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'shamieda-noti',
        renotify: true,
        data: {
            url: payload.data?.url || '/'
        }
    };

    return self.registration.showNotification(title, notificationOptions)
        .catch(err => swLog('showNotification error:', err));
});

self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification click received.');
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
