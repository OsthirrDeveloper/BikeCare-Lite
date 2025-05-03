
"use client"; // Add this directive for client-side state management

import { useState, useEffect } from "react";
import type { MaintenanceLog } from "@/types/maintenance";
import { MaintenanceLogForm } from "@/components/maintenance-log-form";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isValid, addDays } from "date-fns"; // Import isValid and addDays

// Pre-added maintenance tasks for Veloce Legion 10
const initialLogs: MaintenanceLog[] = [
  // Weekly / Every Few Rides (+7 days)
  { id: crypto.randomUUID(), taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Recommended weekly / every few rides" },
  { id: crypto.randomUUID(), taskType: "Tire Pressure", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Recommended weekly / every few rides" },
  { id: crypto.randomUUID(), taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Check pad wear (recommended weekly / every few rides)" },
  { id: crypto.randomUUID(), taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Quick gear shift test (recommended weekly / every few rides)" },

  // Monthly (+30 days)
  { id: crypto.randomUUID(), taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Derailleur adjustment (recommended monthly)" },
  { id: crypto.randomUUID(), taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Check brake cable tension (recommended monthly)" },
  { id: crypto.randomUUID(), taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Clean drivetrain (chain, cassette, chainring) (recommended monthly)" },

  // Every 2-3 Months (+75 days)
  { id: crypto.randomUUID(), taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Full bike wash (recommended every 2-3 months)" },
  { id: crypto.randomUUID(), taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Re-lube all moving parts (recommended every 2-3 months)" },
  { id: crypto.randomUUID(), taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Check bolts for tightness (recommended every 2-3 months)" },

  // Every 6 Months (+180 days)
  { id: crypto.randomUUID(), taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Bottom bracket inspection (recommended every 6 months)" },
  { id: crypto.randomUUID(), taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Wheel truing (if needed) (recommended every 6 months)" },
  { id: crypto.randomUUID(), taskType: "Hub Service", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Check hub bearings (recommended every 6 months)" },
];


export default function Home() {
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load logs from local storage on component mount (client-side only)
  useEffect(() => {
     setIsClient(true); // Indicate that we are now on the client
    try {
      const storedLogs = localStorage.getItem("maintenanceLogs");
      if (storedLogs) {
        // Parse dates correctly from stored JSON and validate them
        const parsedLogs = JSON.parse(storedLogs).map((log: any) => {
            const datePerformed = new Date(log.datePerformed);
            const nextServiceDue = log.nextServiceDue ? new Date(log.nextServiceDue) : undefined;

            // Validate dates after parsing
            if (!isValid(datePerformed) || (nextServiceDue && !isValid(nextServiceDue))) {
                console.warn(`Invalid date found in stored log (ID: ${log.id}), skipping.`);
                return null; // Skip logs with invalid dates
            }

            return {
                ...log,
                datePerformed: datePerformed,
                nextServiceDue: nextServiceDue,
            };
        }).filter((log: MaintenanceLog | null): log is MaintenanceLog => log !== null); // Filter out null (skipped) logs

        // Only set logs if the parsed logs are not empty, otherwise use initialLogs
        if (parsedLogs.length > 0) {
            setMaintenanceLogs(parsedLogs);
        } else {
             // Initialize with pre-added tasks if no valid logs are stored
             setMaintenanceLogs(initialLogs);
        }
      } else {
         // Initialize with pre-added tasks if no logs are stored at all
         setMaintenanceLogs(initialLogs);
      }
    } catch (error) {
      console.error("Failed to load logs from localStorage:", error);
       // Fallback to initial pre-added tasks in case of error
      setMaintenanceLogs(initialLogs);
    }
  }, []);

  // Save logs to local storage whenever they change (client-side only)
  useEffect(() => {
     if (isClient) { // Only run on client after initial mount
        try {
            // Ensure dates are stored in a consistent format (ISO string)
            const logsToStore = maintenanceLogs.map(log => ({
                ...log,
                datePerformed: log.datePerformed.toISOString(),
                nextServiceDue: log.nextServiceDue ? log.nextServiceDue.toISOString() : undefined,
            }));
            localStorage.setItem("maintenanceLogs", JSON.stringify(logsToStore));
        } catch (error) {
            console.error("Failed to save logs to localStorage:", error);
            // Optionally, show a toast or message to the user
        }
     }
  }, [maintenanceLogs, isClient]);


  const addLog = (newLog: MaintenanceLog) => {
    // Ensure the new log dates are valid Date objects before adding
    if (!isValid(newLog.datePerformed) || (newLog.nextServiceDue && !isValid(newLog.nextServiceDue))) {
        console.error("Attempted to add log with invalid date:", newLog);
        // Optionally show an error toast to the user
        return;
    }
    // Use crypto.randomUUID for new logs added via form
    const logWithId = { ...newLog, id: crypto.randomUUID() };
    setMaintenanceLogs((prevLogs) => [...prevLogs, logWithId]);
  };

   const deleteLog = (idToDelete: string) => {
    setMaintenanceLogs((prevLogs) => prevLogs.filter(log => log.id !== idToDelete));
  };


  return (
    <div className="flex flex-col min-h-screen">
       <Header />
       <main className="flex-1 container mx-auto py-8 px-4 md:px-6 lg:px-8">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Log Form Section */}
           <div className="lg:col-span-1">
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Log New Maintenance</CardTitle>
                    <CardDescription>Record a bike maintenance task you've performed.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Render form only on the client */}
                    {isClient ? <MaintenanceLogForm addLog={addLog} /> : <p>Loading form...</p>}
                </CardContent>
             </Card>
           </div>

           {/* Overview Section */}
           <div className="lg:col-span-2">
              {/* Render overview only on the client */}
              {isClient ? <MaintenanceOverview logs={maintenanceLogs} deleteLog={deleteLog}/> : <p>Loading maintenance history...</p>}
           </div>
         </div>
       </main>
       <footer className="py-4 mt-8 border-t">
         <div className="container text-center text-sm text-muted-foreground">
           BikeCare Lite - Keep your ride smooth.
         </div>
       </footer>
     </div>
  );
}
