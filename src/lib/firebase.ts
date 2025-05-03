// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Validate essential configuration
if (!firebaseConfig.projectId) {
  throw new Error("Firebase projectId is not set. Please check your NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable.");
}
if (!firebaseConfig.databaseURL) {
    // While Firebase might sometimes infer this, explicitly requiring it is safer
    // and aligns with the error message the user encountered.
  throw new Error("Firebase databaseURL is not set. Please check your NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable.");
}
if (!firebaseConfig.apiKey) {
  console.warn("Firebase apiKey is not set. This might be required for some Firebase services.");
  // Depending on auth needs, you might throw an error here too.
  // throw new Error("Firebase apiKey is not set. Please check your NEXT_PUBLIC_FIREBASE_API_KEY environment variable.");
}


// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // Re-throw or handle initialization error appropriately
    throw new Error(`Firebase initialization failed. Ensure your environment variables are correctly set and match your Firebase project configuration. Original error: ${error}`);
  }
} else {
  app = getApp();
}

// Get Database instance safely
let database;
try {
    database = getDatabase(app);
} catch(error) {
    console.error("Failed to get Firebase Database instance:", error);
    // This might happen if the databaseURL was invalid or rules prevent access, even if initialization seemed okay.
    throw new Error(`Failed to get Firebase Database instance. Check databaseURL and Firebase rules. Original error: ${error}`);
}


export { database, app };
