
"use client";

import { useState, useEffect } from "react";
import type { MaintenanceLog } from "@/types/maintenance";
import { MaintenanceLogForm } from "@/components/maintenance-log-form";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isValid, addDays } from "date-fns";
import { subscribeToMaintenanceLogs, addMaintenanceLog, deleteMaintenanceLog, getInitialMaintenanceLogs } from "@/services/maintenanceService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Placeholder User ID - Replace with actual authentication logic
const USER_ID = "user-123";

// Default initial logs if DB is empty (consider seeding this in DB instead)
const defaultInitialLogs: Omit<MaintenanceLog, 'id'>[] = [
    // Weekly / Every Few Rides (+7 days)
    { taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Recommended weekly / every few rides" },
    { taskType: "Tire Pressure", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 3), notes: "Recommended every 3 days" }, // Adjusted frequency
    { taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 14), notes: "Check pad wear (recommended every 2 weeks)" }, // Adjusted frequency
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Quick gear shift test (recommended weekly / every few rides)" },

    // Monthly (+30 days)
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Derailleur adjustment / Gear Tuning (recommended monthly)" },
    { taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Check brake cable tension (recommended monthly)" },
    { taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Clean drivetrain (chain, cassette, chainring) (recommended monthly)" },

    // Every 2-3 Months (+75 days)
    { taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Full bike wash (recommended every 2-3 months)" },
    { taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Re-lube all moving parts (recommended every 2-3 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Check bolts for tightness (recommended every 2-3 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Chain Stretch Check (recommended every 2-3 months)" }, // Added


    // Every 6 Months (+180 days)
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Bottom bracket inspection (recommended every 6 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Wheel truing (if needed) (recommended every 6 months)" },
    { taskType: "Hub Service", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Check hub bearings / Hub Greasing (recommended every 6 months)" }, // Merged Hub Service/Greasing
];


export default function Home() {
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  // Fetch initial data and set up real-time listener
  useEffect(() => {
    setIsClient(true); // Indicate client-side rendering

    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
        try {
             // Fetch initial data quickly
            const initialData = await getInitialMaintenanceLogs(USER_ID);
            if (initialData.length === 0) {
                // Seed database if empty (optional, consider doing this server-side or manually)
                console.log("No logs found in DB, seeding with default tasks...");
                 // Await all promises from adding default logs
                await Promise.all(defaultInitialLogs.map(log => addMaintenanceLog(USER_ID, log)));
                 // Fetch again after seeding (or rely on the listener below)
                 // setMaintenanceLogs(await getInitialMaintenanceLogs(USER_ID)); // Fetch again if needed immediately
            } else {
                setMaintenanceLogs(initialData);
            }
            setIsLoading(false); // Initial load complete

            // Set up the real-time listener
            unsubscribe = subscribeToMaintenanceLogs(USER_ID, (updatedLogs) => {
                setMaintenanceLogs(updatedLogs);
                 // No need to set loading false here again unless you want a spinner on every update
            });

        } catch (error) {
            console.error("Error setting up maintenance log listener:", error);
            toast({
                title: "Error Loading Data",
                description: "Could not load maintenance logs from the database.",
                variant: "destructive",
            });
            setIsLoading(false); // Stop loading even on error
        }
    };

    setupListener();

    // Cleanup listener on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast]); // Add toast dependency

  const handleAddLog = async (newLogData: Omit<MaintenanceLog, 'id'>) => {
    // Ensure the new log dates are valid Date objects before adding
    if (!isValid(newLogData.datePerformed) || (newLogData.nextServiceDue && !isValid(newLogData.nextServiceDue))) {
        console.error("Attempted to add log with invalid date:", newLogData);
        toast({
            title: "Invalid Date",
            description: "Please ensure the dates entered are valid.",
            variant: "destructive",
        });
        return;
    }

    try {
      await addMaintenanceLog(USER_ID, newLogData);
      // No need to manually update state, listener will handle it.
      // toast is handled in the form component upon successful submission.
    } catch (error) {
      console.error("Failed to add log:", error);
      toast({
        title: "Error Adding Log",
        description: "Could not save the maintenance log to the database.",
        variant: "destructive",
      });
    }
  };

   const handleDeleteLog = async (idToDelete: string) => {
     try {
        // Find the task type before deleting for the toast message
        const logToDelete = maintenanceLogs.find(log => log.id === idToDelete);
        const taskType = logToDelete ? logToDelete.taskType : 'Task';

        await deleteMaintenanceLog(USER_ID, idToDelete);
        // No need to manually update state, listener will handle it.
         toast({
            title: "Log Deleted",
            description: `Maintenance log for ${taskType} deleted successfully.`,
            variant: "destructive" // Keep variant destructive for delete action
         });
     } catch (error) {
         console.error("Failed to delete log:", error);
         toast({
            title: "Error Deleting Log",
            description: "Could not delete the maintenance log from the database.",
            variant: "destructive",
         });
     }
   };

   // Loading State UI
   const LoadingSkeleton = () => (
     <div className="space-y-4">
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-64 w-full" />
         <Skeleton className="h-64 w-full" />
     </div>
   );


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
                    {isClient ? <MaintenanceLogForm addLog={handleAddLog} /> : <Skeleton className="h-96 w-full" /> /* Form skeleton */}
                </CardContent>
             </Card>
           </div>

           {/* Overview Section */}
           <div className="lg:col-span-2">
              {/* Render overview only on the client, show skeleton while loading */}
              {!isClient || isLoading ? (
                 <LoadingSkeleton />
              ) : (
                 <MaintenanceOverview logs={maintenanceLogs} deleteLog={handleDeleteLog}/>
              )}
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
