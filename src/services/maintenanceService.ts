// src/services/maintenanceService.ts
import { firestore } from "@/lib/firebase"; // Import Firestore instance
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  doc,
  Timestamp, // Import Timestamp
  serverTimestamp, // Import serverTimestamp for creation time if needed
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import type { MaintenanceLog } from "@/types/maintenance";
import { isValid } from "date-fns";

// Helper to map Firestore data (QuerySnapshot) to MaintenanceLog array
const mapFirestoreDataToLogs = (snapshot: QuerySnapshot<DocumentData, DocumentData>): MaintenanceLog[] => {
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map((docSnap) => {
    const logData = docSnap.data();
    let datePerformed: Date;
    // Firestore Timestamps need to be converted to JS Dates
    if (logData.datePerformed instanceof Timestamp) {
      datePerformed = logData.datePerformed.toDate();
    } else {
      // Fallback or handle potential string dates if necessary (though storing as Timestamp is best)
      console.warn(`Invalid datePerformed format for log ID ${docSnap.id}. Using current date as fallback.`);
      datePerformed = new Date();
    }

    let nextServiceDue: Date | undefined;
    if (logData.nextServiceDue instanceof Timestamp) {
      nextServiceDue = logData.nextServiceDue.toDate();
    } else {
      nextServiceDue = undefined; // Handle null or missing nextServiceDue
    }

    return {
      id: docSnap.id, // Firestore document ID
      taskType: logData.taskType,
      datePerformed: datePerformed,
      notes: logData.notes,
      nextServiceDue: nextServiceDue,
    };
  });
};


/**
 * Subscribes to real-time updates for maintenance logs for a specific user using Firestore.
 * @param userId The ID of the user.
 * @param onDataChange Callback function to be called with the updated logs array.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToMaintenanceLogs = (userId: string, onDataChange: (logs: MaintenanceLog[]) => void): (() => void) => {
  const logsCollectionRef = collection(firestore, `users/${userId}/maintenanceLogs`);
  // Optional: Query to order logs, e.g., by datePerformed descending
  const q = query(logsCollectionRef, orderBy("datePerformed", "desc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logsArray = mapFirestoreDataToLogs(snapshot);
    onDataChange(logsArray);
  }, (error) => {
    console.error("Error fetching maintenance logs from Firestore:", error);
    onDataChange([]); // Return empty array on error
  });

  // Return the unsubscribe function
  return unsubscribe;
};


/**
 * Adds a new maintenance log to Firestore for a specific user.
 * @param userId The ID of the user.
 * @param logData The maintenance log data (without ID).
 * @returns A promise that resolves when the log is added.
 */
export const addMaintenanceLog = async (userId: string, logData: Omit<MaintenanceLog, 'id'>): Promise<void> => {
  try {
    const logsCollectionRef = collection(firestore, `users/${userId}/maintenanceLogs`);

    // Convert JS Dates to Firestore Timestamps before saving
    const datePerformedTimestamp = logData.datePerformed && isValid(logData.datePerformed)
        ? Timestamp.fromDate(logData.datePerformed)
        : serverTimestamp(); // Use server timestamp if date is invalid or use Timestamp.now() for client time

    const nextServiceDueTimestamp = logData.nextServiceDue && isValid(logData.nextServiceDue)
         ? Timestamp.fromDate(logData.nextServiceDue)
         : null; // Store null if undefined or invalid

    const dataToSave = {
      ...logData,
      datePerformed: datePerformedTimestamp,
      nextServiceDue: nextServiceDueTimestamp,
      // Optional: Add a createdAt timestamp
      // createdAt: serverTimestamp(),
    };

    await addDoc(logsCollectionRef, dataToSave);
  } catch (error) {
    console.error("Error adding maintenance log to Firestore:", error);
    throw new Error("Failed to add maintenance log."); // Re-throw for handling in the component
  }
};


/**
 * Deletes a maintenance log from Firestore for a specific user.
 * @param userId The ID of the user.
 * @param logId The ID of the log (Firestore document ID) to delete.
 * @returns A promise that resolves when the log is deleted.
 */
export const deleteMaintenanceLog = async (userId: string, logId: string): Promise<void> => {
  try {
    const logDocRef = doc(firestore, `users/${userId}/maintenanceLogs/${logId}`);
    await deleteDoc(logDocRef);
  } catch (error) {
    console.error("Error deleting maintenance log from Firestore:", error);
    throw new Error("Failed to delete maintenance log."); // Re-throw for handling in the component
  }
};

/**
 * Fetches initial maintenance logs once from Firestore.
 * Useful for server components or initial load before real-time kicks in.
 * @param userId The ID of the user.
 * @returns A promise that resolves with the array of maintenance logs.
 */
export const getInitialMaintenanceLogs = async (userId: string): Promise<MaintenanceLog[]> => {
    const logsCollectionRef = collection(firestore, `users/${userId}/maintenanceLogs`);
    // Optional: Query to order logs
     const q = query(logsCollectionRef, orderBy("datePerformed", "desc"));
    try {
        const snapshot = await getDocs(q); // Use the query q
        return mapFirestoreDataToLogs(snapshot); // Reuse the mapping function
    } catch (error) {
        console.error("Error fetching initial maintenance logs from Firestore:", error);
        return []; // Return empty on error
    }
};
