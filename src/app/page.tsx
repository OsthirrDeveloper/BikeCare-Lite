
"use client";

import { useState, useEffect } from "react";
import type { MaintenanceLog } from "@/types/maintenance";
import { MaintenanceLogForm } from "@/components/maintenance-log-form";
import { MaintenanceOverview } from "@/components/maintenance-overview";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isValid, addDays } from "date-fns";
// Import Firestore-based service functions
import { subscribeToMaintenanceLogs, addMaintenanceLog, deleteMaintenanceLog, getInitialMaintenanceLogs, updateMaintenanceLog } from "@/services/maintenanceService";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholder User ID - Replace with actual authentication logic
const USER_ID = "user-123";

// Default initial logs if DB is empty (consider seeding this in DB instead)
// Keeping the structure the same, service layer handles Timestamp conversion
const defaultInitialLogs: Omit<MaintenanceLog, 'id'>[] = [
    // Weekly / Every Few Rides (+7 days)
    { taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Recommended weekly / every few rides" },
    { taskType: "Tire Pressure", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 3), notes: "Recommended every 3 days" },
    { taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 14), notes: "Check pad wear (recommended every 2 weeks)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 7), notes: "Quick gear shift test (recommended weekly / every few rides)" },

    // Monthly (+30 days)
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Derailleur adjustment / Gear Tuning (recommended monthly)" },
    { taskType: "Brake Check", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Check brake cable tension (recommended monthly)" },
    { taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 30), notes: "Clean drivetrain (chain, cassette, chainring) (recommended monthly)" },

    // Every 2-3 Months (+75 days)
    { taskType: "Wash", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Full bike wash (recommended every 2-3 months)" },
    { taskType: "Chain Lube", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Re-lube all moving parts (recommended every 2-3 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Check bolts for tightness (recommended every 2-3 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 75), notes: "Chain Stretch Check (recommended every 2-3 months)" },

    // Every 6 Months (+180 days)
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Bottom bracket inspection (recommended every 6 months)" },
    { taskType: "Other", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Wheel truing (if needed) (recommended every 6 months)" },
    { taskType: "Hub Service", datePerformed: new Date(), nextServiceDue: addDays(new Date(), 180), notes: "Check hub bearings / Hub Greasing (recommended every 6 months)" },
];


export default function Home() {
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null); // State for editing
  const { toast } = useToast();

  // Fetch initial data and set up real-time listener (using Firestore service)
  useEffect(() => {
    setIsClient(true);

    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
        try {
            // Fetch initial data quickly using Firestore service
            const initialData = await getInitialMaintenanceLogs(USER_ID);
            if (initialData.length === 0) {
                console.log("No logs found in Firestore, seeding with default tasks...");
                // Seed Firestore if empty
                await Promise.all(defaultInitialLogs.map(log => addMaintenanceLog(USER_ID, log)));
                // No need to fetch again, listener will pick up seeded data
            } else {
                setMaintenanceLogs(initialData);
            }
            setIsLoading(false); // Initial load complete

            // Set up the real-time listener using Firestore service
            unsubscribe = subscribeToMaintenanceLogs(USER_ID, (updatedLogs) => {
                setMaintenanceLogs(updatedLogs);
                // Optionally set loading false here if you want a spinner on every update
                // setIsLoading(false);
            });

        } catch (error) {
            console.error("Error setting up Firestore maintenance log listener:", error);
            toast({
                title: "Error Loading Data",
                description: "Could not load maintenance logs from the database.",
                variant: "destructive",
            });
            setIsLoading(false);
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

  const handleAddOrUpdateLog = async (logData: Omit<MaintenanceLog, 'id'>) => {
    // Basic date validation
    if (!isValid(logData.datePerformed) || (logData.nextServiceDue && !isValid(logData.nextServiceDue))) {
        console.error("Attempted to add/update log with invalid date:", logData);
        toast({
            title: "Invalid Date",
            description: "Please ensure the dates entered are valid.",
            variant: "destructive",
        });
        return;
    }

    try {
      if (editingLog) {
        // Update existing log
        await updateMaintenanceLog(USER_ID, editingLog.id, logData);
        toast({
            title: "Log Updated",
            description: `Maintenance log for ${logData.taskType} updated successfully.`,
            variant: "default",
        });
        setEditingLog(null); // Exit editing mode
      } else {
        // Add new log
        await addMaintenanceLog(USER_ID, logData);
        // Toast for add is handled in the form submission itself
      }
      // Listener handles state update for both add and update
    } catch (error) {
      console.error(`Failed to ${editingLog ? 'update' : 'add'} log in Firestore:`, error);
      toast({
        title: `Error ${editingLog ? 'Updating' : 'Adding'} Log`,
        description: `Could not save the maintenance log to the database.`,
        variant: "destructive",
      });
    }
  };

   const handleDeleteLog = async (idToDelete: string) => {
     try {
        const logToDelete = maintenanceLogs.find(log => log.id === idToDelete);
        const taskType = logToDelete ? logToDelete.taskType : 'Task';

        // Call Firestore delete function
        await deleteMaintenanceLog(USER_ID, idToDelete);
        // Listener handles state update
         toast({
            title: "Log Deleted",
            description: `Maintenance log for ${taskType} deleted successfully.`,
            variant: "destructive" // Consistent destructive variant for delete
         });
     } catch (error) {
         console.error("Failed to delete log from Firestore:", error);
         toast({
            title: "Error Deleting Log",
            description: "Could not delete the maintenance log from the database.",
            variant: "destructive",
         });
     }
   };

   // Function to initiate editing
    const handleEditLog = (log: MaintenanceLog) => {
        setEditingLog(log);
        // Optionally scroll to the form or highlight it
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

     // Function to cancel editing
    const handleCancelEdit = () => {
        setEditingLog(null);
    };

   // Loading State UI (remains the same)
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
             <Card className="shadow-md relative"> {/* Added relative positioning */}
                 {/* Show overlay when editing */}
                {editingLog && (
                  <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm z-10 rounded-lg pointer-events-none"></div>
                 )}
                <CardHeader>
                    {/* Dynamic title based on editing state */}
                    <CardTitle>{editingLog ? `Edit Maintenance Log` : 'Log New Maintenance'}</CardTitle>
                    <CardDescription>{editingLog ? `Update the details for the task performed on ${isValid(editingLog.datePerformed) ? editingLog.datePerformed.toLocaleDateString() : 'N/A'}.` : 'Record a bike maintenance task you\'ve performed.'}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-20"> {/* Ensure form is above overlay */}
                    {/* Render form only on the client */}
                    {isClient ? (
                        <MaintenanceLogForm
                            onSubmitLog={handleAddOrUpdateLog} // Renamed prop for clarity
                            initialData={editingLog} // Pass editing log data to form
                            onCancelEdit={handleCancelEdit} // Pass cancel handler
                            isEditing={!!editingLog} // Pass editing status
                        />
                     ) : <Skeleton className="h-96 w-full" /> /* Form skeleton */}
                </CardContent>
             </Card>
           </div>

           {/* Overview Section */}
           <div className="lg:col-span-2">
              {/* Render overview only on the client, show skeleton while loading */}
              {!isClient || isLoading ? (
                 <LoadingSkeleton />
              ) : (
                 // Pass Firestore logs, delete, and edit handlers
                 <MaintenanceOverview
                    logs={maintenanceLogs}
                    deleteLog={handleDeleteLog}
                    editLog={handleEditLog} // Pass edit handler
                  />
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
