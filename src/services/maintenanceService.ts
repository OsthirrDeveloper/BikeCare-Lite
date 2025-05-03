// src/services/maintenanceService.ts
// Removed 'use server'; directive as these functions are primarily used client-side

import { database } from "@/lib/firebase";
import { ref, onValue, off, set, push, remove, Unsubscribe, get } from "firebase/database";
import type { MaintenanceLog } from "@/types/maintenance";
import { isValid, parseISO } from "date-fns";

// Helper to map Firebase data (object) to MaintenanceLog array
const mapFirebaseDataToLogs = (data: any): MaintenanceLog[] => {
  if (!data) {
    return [];
  }
  return Object.entries(data).map(([id, logData]: [string, any]) => {
    // Safely attempt to parse dates, fallback to defaults if invalid or missing
    let datePerformed: Date;
    try {
        datePerformed = logData.datePerformed ? parseISO(logData.datePerformed) : new Date();
        if (!isValid(datePerformed)) {
             console.warn(`Invalid datePerformed format for log ID ${id}. Using current date as fallback.`);
             datePerformed = new Date();
        }
    } catch (e) {
         console.warn(`Error parsing datePerformed for log ID ${id}. Using current date as fallback.`, e);
         datePerformed = new Date();
    }


    let nextServiceDue: Date | undefined;
    if (logData.nextServiceDue) {
        try {
            const parsedNextDue = parseISO(logData.nextServiceDue);
            if (isValid(parsedNextDue)) {
                nextServiceDue = parsedNextDue;
            } else {
                 console.warn(`Invalid nextServiceDue format for log ID ${id}. Setting to undefined.`);
                 nextServiceDue = undefined;
            }
        } catch (e) {
            console.warn(`Error parsing nextServiceDue for log ID ${id}. Setting to undefined.`, e);
            nextServiceDue = undefined;
        }

    } else {
        nextServiceDue = undefined;
    }


    return {
      id: id,
      taskType: logData.taskType,
      datePerformed: datePerformed, // Already validated with fallback
      notes: logData.notes,
      nextServiceDue: nextServiceDue, // Already validated or undefined
    };
  });
};


/**
 * Subscribes to real-time updates for maintenance logs for a specific user.
 * @param userId The ID of the user.
 * @param onDataChange Callback function to be called with the updated logs array.
 * @returns An unsubscribe function to detach the listener.
 */
export const subscribeToMaintenanceLogs = (userId: string, onDataChange: (logs: MaintenanceLog[]) => void): Unsubscribe => {
  const logsRef = ref(database, `users/${userId}/maintenanceLogs`);

  const listener = onValue(logsRef, (snapshot) => {
    const data = snapshot.val();
    const logsArray = mapFirebaseDataToLogs(data);
    onDataChange(logsArray);
  }, (error) => {
    console.error("Error fetching maintenance logs:", error);
    onDataChange([]); // Return empty array on error
  });

  // Return the unsubscribe function
  return () => off(logsRef, 'value', listener);
};


/**
 * Adds a new maintenance log to the database for a specific user.
 * @param userId The ID of the user.
 * @param logData The maintenance log data (without ID).
 * @returns A promise that resolves when the log is added.
 */
export const addMaintenanceLog = async (userId: string, logData: Omit<MaintenanceLog, 'id'>): Promise<void> => {
  try {
    const logsRef = ref(database, `users/${userId}/maintenanceLogs`);
    const newLogRef = push(logsRef); // Generate a unique ID

    // Ensure dates are valid before converting to ISO string
     const datePerformedISO = logData.datePerformed && isValid(logData.datePerformed)
        ? logData.datePerformed.toISOString()
        : new Date().toISOString(); // Fallback to current time if invalid

     const nextServiceDueISO = logData.nextServiceDue && isValid(logData.nextServiceDue)
         ? logData.nextServiceDue.toISOString()
         : null; // Store null if undefined or invalid

    // Format data for Firebase
    const dataToSave = {
      ...logData,
      datePerformed: datePerformedISO,
      nextServiceDue: nextServiceDueISO,
    };

    await set(newLogRef, dataToSave);
  } catch (error) {
    console.error("Error adding maintenance log:", error);
    throw new Error("Failed to add maintenance log."); // Re-throw for handling in the component
  }
};


/**
 * Deletes a maintenance log from the database for a specific user.
 * @param userId The ID of the user.
 * @param logId The ID of the log to delete.
 * @returns A promise that resolves when the log is deleted.
 */
export const deleteMaintenanceLog = async (userId: string, logId: string): Promise<void> => {
  try {
    const logRef = ref(database, `users/${userId}/maintenanceLogs/${logId}`);
    await remove(logRef);
  } catch (error) {
    console.error("Error deleting maintenance log:", error);
    throw new Error("Failed to delete maintenance log."); // Re-throw for handling in the component
  }
};

/**
 * Fetches initial maintenance logs once.
 * Useful for server components or initial load before real-time kicks in.
 * @param userId The ID of the user.
 * @returns A promise that resolves with the array of maintenance logs.
 */
export const getInitialMaintenanceLogs = async (userId: string): Promise<MaintenanceLog[]> => {
    const logsRef = ref(database, `users/${userId}/maintenanceLogs`);
    try {
        const snapshot = await get(logsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return mapFirebaseDataToLogs(data);
        } else {
            return []; // No logs found
        }
    } catch (error) {
        console.error("Error fetching initial maintenance logs:", error);
        return []; // Return empty on error
    }
};
