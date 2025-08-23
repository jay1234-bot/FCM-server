// /api/send-notification.js
const admin = require('firebase-admin');

// IMPORTANT: Set these as Environment Variables in your Vercel project settings
const SERVICE_ACCOUNT_JSON_STRING = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const EXPECTED_API_KEY = process.env.MY_APP_API_KEY; // For securing your endpoint

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON_STRING);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
        // If SDK fails to initialize, subsequent calls will fail.
        // It's crucial this part works. Check your service account JSON.
    }
} else {
    console.log('Firebase Admin SDK already initialized.');
}


module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- Security Check ---
    const apiKey = req.headers['x-server-auth-key'];
    if (!apiKey || apiKey !== EXPECTED_API_KEY) {
        console.warn('Unauthorized attempt to access send-notification endpoint.');
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
    }
    // --- End Security Check ---

    const { title, body, sender } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: 'Missing title or body in request' });
    }

    const notificationSender = sender || "Admin"; // Default sender if not provided

    try {
        if (!admin.apps.length) {
            // This case should ideally not be hit if initialization logic above is sound
            console.error('Firebase Admin SDK not initialized when trying to send message.');
            return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });
        }

        const db = admin.firestore();
        const usersSnapshot = await db.collection('users').get(); // Assuming tokens are in /users/{userId}/fcmToken

        const tokens = [];
        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData && userData.fcmToken) { // Check if userData exists before accessing fcmToken
                tokens.push(userData.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log('No FCM tokens found.');
            return res.status(200).json({ message: 'No FCM tokens to send notifications to.' });
        }

        const payload = {
            notification: {
                title: `${notificationSender}: ${title}`,
                body: body,
            }
            // You can add more options like icon, sound, click_action etc.
        };

        console.log(`Attempting to send notification to ${tokens.length} tokens.`);
        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Successfully sent message:', JSON.stringify(response, null, 2));

        // Optional: Clean up invalid tokens based on the response
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to token:', tokens[index], error.message);
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    // Consider removing invalid tokens from Firestore here
                    // This requires finding the user document by token, which can be complex.
                }
            }
        });

        return res.status(200).json({ success: true, message: 'Notifications sent successfully (or attempted).', results: response.results });

    } catch (error) {
        console.error('Error sending FCM message:', error);
        return res.status(500).json({ error: 'Failed to send FCM message', details: error.message });
    }
};

