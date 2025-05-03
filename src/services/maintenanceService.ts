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
  updateDoc, // Import updateDoc
} from "firebase/firestore";
import type { MaintenanceLog } from "@/types/maintenance";
import { isValid } from "date-fns";

// Helper function to convert JS Date to Firestore Timestamp or null
const dateToTimestampOrNull = (date: Date | undefined | null): Timestamp | null => {
  if (date && isValid(date)) {
    return Timestamp.fromDate(date);
  }
  return null;
};

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
      datePerformed = new Date(); // Consider logging this or handling more gracefully
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
      notes: logData.notes ?? '', // Ensure notes is always a string
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
    const datePerformedTimestamp = dateToTimestampOrNull(logData.datePerformed) ?? serverTimestamp(); // Use server timestamp if date is invalid

    const nextServiceDueTimestamp = dateToTimestampOrNull(logData.nextServiceDue); // Will be null if undefined or invalid

    const dataToSave = {
      taskType: logData.taskType,
      datePerformed: datePerformedTimestamp,
      notes: logData.notes ?? "", // Ensure notes is saved as string
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
 * Updates an existing maintenance log in Firestore for a specific user.
 * @param userId The ID of the user.
 * @param logId The ID of the log (Firestore document ID) to update.
 * @param updatedData Partial data to update the log with.
 * @returns A promise that resolves when the log is updated.
 */
export const updateMaintenanceLog = async (userId: string, logId: string, updatedData: Partial<Omit<MaintenanceLog, 'id'>>): Promise<void> => {
  try {
    const logDocRef = doc(firestore, `users/${userId}/maintenanceLogs/${logId}`);

    // Prepare data for Firestore, converting dates to Timestamps
    const dataToUpdate: Record<string, any> = {};
    if (updatedData.taskType !== undefined) dataToUpdate.taskType = updatedData.taskType;
    if (updatedData.notes !== undefined) dataToUpdate.notes = updatedData.notes ?? "";
    if (updatedData.datePerformed !== undefined) {
        // Allow setting to null if needed, but usually a date is required
        dataToUpdate.datePerformed = dateToTimestampOrNull(updatedData.datePerformed) ?? serverTimestamp();
    }
    if (updatedData.hasOwnProperty('nextServiceDue')) { // Check if property exists, even if undefined/null
      dataToUpdate.nextServiceDue = dateToTimestampOrNull(updatedData.nextServiceDue);
    }
    // Optional: Add an updatedAt timestamp
    // dataToUpdate.updatedAt = serverTimestamp();

    // Only update if there's data to update
    if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(logDocRef, dataToUpdate);
    } else {
        console.warn("No valid data provided for update.");
    }

  } catch (error) {
    console.error("Error updating maintenance log in Firestore:", error);
    throw new Error("Failed to update maintenance log."); // Re-throw for handling in the component
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
