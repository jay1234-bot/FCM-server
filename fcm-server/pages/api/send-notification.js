import admin from "firebase-admin";

// Environment Variables (Set these in Vercel Dashboard → Settings → Environment Variables)
const SERVICE_ACCOUNT_JSON_STRING = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const EXPECTED_API_KEY = process.env.MY_APP_API_KEY;

// Initialize Firebase Admin SDK (once only)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON_STRING);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("🔥 Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- Security Check ---
  const apiKey = req.headers["x-server-auth-key"];
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    console.warn("⚠️ Unauthorized attempt to access send-notification endpoint.");
    return res.status(401).json({ error: "Unauthorized: Missing or invalid API key" });
  }

  const { title, body, sender } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "Missing title or body in request" });
  }

  const notificationSender = sender || "Admin"; // default sender

  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    const tokens = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData && userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log("ℹ️ No FCM tokens found.");
      return res.status(200).json({ message: "No FCM tokens available." });
    }

    const payload = {
      notification: {
        title: `${notificationSender}: ${title}`,
        body: body,
      },
    };

    console.log(`📩 Sending notification to ${tokens.length} devices...`);
    const response = await admin.messaging().sendToDevice(tokens, payload);

    // Clean up invalid tokens
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("❌ Error sending to token:", tokens[index], error.message);
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          // TODO: Remove invalid tokens from Firestore if needed
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Notifications sent successfully (or attempted).",
      results: response.results,
    });
  } catch (error) {
    console.error("🔥 Error sending FCM message:", error);
    return res.status(500).json({ error: "Failed to send FCM message", details: error.message });
  }
}
