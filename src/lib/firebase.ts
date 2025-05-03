// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
// Remove Realtime Database import
// import { getDatabase } from "firebase/database";
// Add Firestore import
import { getFirestore } from "firebase/firestore";


// Updated Firebase configuration based on user input
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDAFMFViJXriGsVOJPr1hsNVVVCZqUHn_E",
  authDomain: "bikecare-lite.firebaseapp.com",
  projectId: "bikecare-lite",
  storageBucket: "bikecare-lite.appspot.com", // Corrected: Use .appspot.com for RTDB/Storage if applicable, or verify correct bucket name
  messagingSenderId: "390003143421",
  appId: "1:390003143421:web:e2b70ec44c90addbca4494",
  // Explicitly add databaseURL if using Realtime Database alongside Firestore, otherwise Firestore doesn't strictly need it here.
  // databaseURL: "https://bikecare-lite-default-rtdb.firebaseio.com", // Keep if RTDB is also needed
};

// Validate essential configuration
if (!firebaseConfig.projectId) {
  throw new Error("Firebase projectId is not set. Please check your NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable or the hardcoded config.");
}
// Removed databaseURL check as Firestore doesn't always require it in the config object itself
// if (!firebaseConfig.databaseURL) {
//   throw new Error("Firebase databaseURL could not be derived or is not set. Please check your NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable or the hardcoded config.");
// }
if (!firebaseConfig.apiKey) {
  console.warn("Firebase apiKey is not set. This might be required for some Firebase services.");
  // throw new Error("Firebase apiKey is not set. Please check your NEXT_PUBLIC_FIREBASE_API_KEY environment variable or the hardcoded config.");
}


// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw new Error(`Firebase initialization failed. Ensure your environment variables or hardcoded config are correctly set and match your Firebase project configuration. Original error: ${error}`);
  }
} else {
  app = getApp();
}

// Get Firestore instance safely
let firestore;
try {
    firestore = getFirestore(app);
} catch(error) {
    console.error("Failed to get Firebase Firestore instance:", error);
    throw new Error(`Failed to get Firebase Firestore instance. Check your Firebase project setup and permissions. Original error: ${error}`);
}

// Remove Realtime Database export
// export { database, app };
// Export Firestore instance
export { firestore, app };
