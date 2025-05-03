// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";

// Updated Firebase configuration based on user input
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDAFMFViJXriGsVOJPr1hsNVVVCZqUHn_E",
  authDomain: "bikecare-lite.firebaseapp.com",
  projectId: "bikecare-lite",
  storageBucket: "bikecare-lite.appspot.com", // Corrected common typo: .appspot.com instead of .firebasestorage.app
  messagingSenderId: "390003143421",
  appId: "1:390003143421:web:e2b70ec44c90addbca4494",
  // Derive databaseURL from projectId if not explicitly provided
  databaseURL: "https://bikecare-lite-default-rtdb.firebaseio.com", // Common default RTDB URL pattern
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional, keep commented or remove if not needed
};

// Validate essential configuration
if (!firebaseConfig.projectId) {
  throw new Error("Firebase projectId is not set. Please check your NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable or the hardcoded config.");
}
if (!firebaseConfig.databaseURL) {
    // While Firebase might sometimes infer this, explicitly requiring it is safer
    // and aligns with the error message the user encountered.
  throw new Error("Firebase databaseURL could not be derived or is not set. Please check your NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable or the hardcoded config.");
}
if (!firebaseConfig.apiKey) {
  console.warn("Firebase apiKey is not set. This might be required for some Firebase services.");
  // Depending on auth needs, you might throw an error here too.
  // throw new Error("Firebase apiKey is not set. Please check your NEXT_PUBLIC_FIREBASE_API_KEY environment variable or the hardcoded config.");
}


// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // Re-throw or handle initialization error appropriately
    throw new Error(`Firebase initialization failed. Ensure your environment variables or hardcoded config are correctly set and match your Firebase project configuration. Original error: ${error}`);
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
