
"use client"; // Add this directive for client-side state management

import { useState, useEffect } from "react";
import type { MaintenanceLog } from "@/types/maintenance";
import { MaintenanceLogForm } from "@/components/maintenance-log-form";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isValid } from "date-fns"; // Import isValid

// Mock data for initial state - replace with data fetching in a real app
const initialLogs: MaintenanceLog[] = [
  { id: "1", taskType: "Chain Lube", datePerformed: new Date(Date.now() - 86400000 * 7), notes: "Used wet lube", nextServiceDue: new Date(Date.now() + 86400000 * 7) }, // Due in 7 days
  { id: "2", taskType: "Brake Check", datePerformed: new Date(Date.now() - 86400000 * 30), notes: "Pads look good" },
  { id: "3", taskType: "Tire Pressure", datePerformed: new Date(Date.now() - 86400000 * 2), nextServiceDue: new Date(Date.now() + 86400000 * 1) }, // Due tomorrow
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

        setMaintenanceLogs(parsedLogs);
      } else {
         // Initialize with mock data if no logs are stored
         setMaintenanceLogs(initialLogs);
      }
    } catch (error) {
      console.error("Failed to load logs from localStorage:", error);
       // Fallback to initial mock data in case of error
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
    setMaintenanceLogs((prevLogs) => [...prevLogs, newLog]);
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

    