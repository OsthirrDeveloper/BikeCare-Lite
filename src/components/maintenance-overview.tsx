
"use client";

import { useState, useMemo, useEffect } from "react";
import type { MaintenanceLog } from "@/types/maintenance";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, isFuture, isPast, isValid, formatDistanceToNowStrict } from "date-fns";
import { Droplet, Gauge, Wrench, CircleCheck, Wind, Bike, AlertTriangle, CheckCircle2, CalendarClock, Trash2, Info } from "lucide-react";
import { sendMaintenanceReminder } from "@/services/notification";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading parts


interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
  deleteLog: (id: string) => Promise<void>; // Make deleteLog async
}

const taskIcons: { [key in MaintenanceLog["taskType"]]: React.ElementType } = {
  "Chain Lube": Droplet,
  "Brake Check": CircleCheck,
  "Tire Pressure": Gauge,
  "Hub Service": Wrench,
  "Wash": Wind,
  "Other": Bike,
};

// Helper function to safely format dates, returning a placeholder or empty string on error
const safeFormatDate = (date: Date | undefined | null, formatString: string = "PPP"): string => {
  if (date && isValid(date)) {
    try {
        return format(date, formatString);
    } catch (error) {
        console.error("Error formatting date:", date, error);
        return "Invalid Date";
    }
  }
  return "N/A"; // Return N/A if date is undefined, null, or invalid
};


const getReminderBadge = (dueDate: Date | undefined): React.ReactNode => {
    // Ensure dueDate is a valid Date object if it exists
    if (!dueDate || !isValid(dueDate)) {
        return null; // No badge if no due date or it's invalid
    }

    const now = new Date();
    // Check if the date is in the past (including today)
     if (!isFuture(dueDate) && differenceInDays(dueDate, now) <= 0) {
        const daysPast = differenceInDays(now, dueDate);
         if (daysPast === 0) {
            return <Badge variant="destructive" className="ml-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Due Today</Badge>;
         } else {
             return <Badge variant="destructive" className="ml-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue by {formatDistanceToNowStrict(dueDate)}</Badge>;
         }
    }


    // Date is in the future
    const daysUntilDue = differenceInDays(dueDate, now); // Recalculate based on 'now'

    if (daysUntilDue <= 7) { // Due within the next 7 days
        return <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-accent text-accent-foreground"><CalendarClock className="h-3 w-3" /> Due in {formatDistanceToNowStrict(dueDate)}</Badge>;
    } else { // Due further out
        return <Badge variant="secondary" className="ml-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Due in {formatDistanceToNowStrict(dueDate)}</Badge>;
    }
};


export function MaintenanceOverview({ logs, deleteLog }: MaintenanceOverviewProps) {
  const { toast } = useToast();
  const [upcomingReminders, setUpcomingReminders] = useState<MaintenanceLog[]>([]);
  const [pastLogs, setPastLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for internal processing
  const [currentTime, setCurrentTime] = useState<Date | null>(null); // State for client-side Date


   useEffect(() => {
    // Set current time only on the client side after hydration
    setCurrentTime(new Date());
  }, []);


   useEffect(() => {
     // Wait for currentTime and logs to be available
     if (currentTime === null || !logs) {
         setIsLoading(true);
         return;
     }
     setIsLoading(true); // Start loading for sorting/filtering

     // Ensure logs have valid Date objects before processing
    const validLogs = logs.map(log => {
         // Attempt to create Date objects. If creation fails, isValid will catch it.
         const datePerformed = log.datePerformed instanceof Date ? log.datePerformed : new Date(log.datePerformed);
         const nextServiceDue = log.nextServiceDue ? (log.nextServiceDue instanceof Date ? log.nextServiceDue : new Date(log.nextServiceDue)) : undefined;

        return {
            ...log,
            datePerformed: datePerformed,
            nextServiceDue: nextServiceDue,
        };
     }).filter(log => isValid(log.datePerformed)); // Filter out logs with invalid datePerformed


    const now = currentTime; // Use the state variable

    const upcoming = validLogs.filter(
      (log) => log.nextServiceDue && isValid(log.nextServiceDue) // Check validity first
      // Only show reminders that are due today or in the future
      // && (isFuture(log.nextServiceDue) || differenceInDays(log.nextServiceDue, now) === 0)
    ).sort((a, b) => {
        // Sort invalid dates to the end if any slip through (shouldn't happen with filter)
        if (!a.nextServiceDue!) return 1;
        if (!b.nextServiceDue!) return -1;
        return a.nextServiceDue!.getTime() - b.nextServiceDue!.getTime(); // Sort directly
    });


    const past = validLogs.filter(
       (log) => !log.nextServiceDue || !isValid(log.nextServiceDue) || isPast(log.nextServiceDue) // Check validity before isPast
    ).sort((a, b) => {
         // Sort by datePerformed descending for history
         if (!isValid(a.datePerformed)) return 1;
         if (!isValid(b.datePerformed)) return -1;
         return b.datePerformed.getTime() - a.datePerformed.getTime();
     });


    setUpcomingReminders(upcoming);
    setPastLogs(past);
    setIsLoading(false); // Finish loading

    // Check for due reminders (moved outside the main log processing)
    // Consider debouncing this or running less frequently if performance is an issue
    upcoming.forEach(log => {
        const dueDate = log.nextServiceDue;
        // Ensure dueDate is valid and check if due today or tomorrow
         if (dueDate && isValid(dueDate) && differenceInDays(dueDate, now) <= 1 && differenceInDays(dueDate, now) >= 0 ) {
             const notificationKey = `reminder_sent_${log.id}_${safeFormatDate(dueDate, 'yyyy-MM-dd')}`; // Add date to key
             let alreadySent = false;
             try {
                 alreadySent = localStorage.getItem(notificationKey) === 'true';
             } catch (e) { console.error("localStorage unavailable"); }


             if (!alreadySent) {
                sendMaintenanceReminder(
                    "user-123", // Replace with actual user ID
                    `${log.taskType} is due on ${safeFormatDate(dueDate, "PPP")}`
                ).then(notification => {
                    toast({
                        title: "Maintenance Reminder",
                        description: notification.message,
                        variant: "default",
                    });
                    try {
                         localStorage.setItem(notificationKey, 'true');
                    } catch (e) { console.error("localStorage unavailable"); }
                }).catch(error => {
                    console.error("Failed to send notification:", error);
                });
            }
        }
    });

   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [logs, currentTime]); // Rerun when logs or currentTime change


  const handleDelete = async (id: string, taskType: string) => {
     try {
         await deleteLog(id);
         // Toast is now handled in the parent component after successful DB operation
     } catch (error) {
         // Error toast is handled in the parent component
         console.error("Overview: Failed to trigger delete log", error);
     }
  }

  // Loading Skeleton for the tables
   const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
     <Table>
       <TableHeader>
         <TableRow>
           <TableHead><Skeleton className="h-5 w-20" /></TableHead>
           <TableHead><Skeleton className="h-5 w-24" /></TableHead>
           <TableHead><Skeleton className="h-5 w-32" /></TableHead>
           <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
         </TableRow>
       </TableHeader>
       <TableBody>
         {Array.from({ length: rows }).map((_, index) => (
           <TableRow key={index}>
             <TableCell><Skeleton className="h-5 w-full" /></TableCell>
             <TableCell><Skeleton className="h-5 w-full" /></TableCell>
             <TableCell><Skeleton className="h-5 w-full" /></TableCell>
             <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
           </TableRow>
         ))}
       </TableBody>
     </Table>
   );


   // Conditional rendering based on loading state
    if (currentTime === null) {
        // Initial loading state before client-side hydration
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading Maintenance Logs...</CardTitle>
                    <CardDescription>Please wait...</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full mb-4" />
                    <TableSkeleton />
                </CardContent>
            </Card>
        )
    }


  return (
    <div className="space-y-8">
      {/* Upcoming Maintenance Section */}
       <Card>
            <CardHeader>
             <CardTitle className="text-primary">Upcoming & Due Maintenance</CardTitle>
             <CardDescription>Tasks that need attention soon or are overdue.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <TableSkeleton rows={3} /> :
                 upcomingReminders.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {upcomingReminders.map((log) => {
                            const Icon = taskIcons[log.taskType] || Bike;
                            return (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    {log.taskType}
                                    </TableCell>
                                    {/* Use safeFormatDate */}
                                    <TableCell>{safeFormatDate(log.nextServiceDue, "PPP")}</TableCell>
                                    <TableCell>{getReminderBadge(log.nextServiceDue)}</TableCell>
                                     <TableCell className="text-right">
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label={`Delete upcoming log for ${log.taskType}`}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete Log</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the upcoming reminder for "{log.taskType}" due on {safeFormatDate(log.nextServiceDue, "PPP")}. The original log performed on {safeFormatDate(log.datePerformed, "PPP")} will remain in history (if applicable).
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                {/* Wrap async call */}
                                                <AlertDialogAction onClick={async () => await handleDelete(log.id, log.taskType)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Delete Reminder
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                ) : (
                     <p className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2">
                        <Info className="h-4 w-4"/> No upcoming maintenance reminders found.
                    </p>
                )}
            </CardContent>
       </Card>


      {/* Maintenance History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
           <CardDescription>A record of maintenance tasks performed.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? <TableSkeleton rows={5} /> :
            pastLogs.length > 0 ? (
                <Table>
                <TableCaption>A list of your recent bike maintenance logs.</TableCaption>
                <TableHeader>
                    <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Date Performed</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pastLogs.map((log) => {
                    const Icon = taskIcons[log.taskType] || Bike;
                    return (
                        <TableRow key={log.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {log.taskType}
                        </TableCell>
                        {/* Use safeFormatDate to prevent errors */}
                        <TableCell>{safeFormatDate(log.datePerformed, "PPP")}</TableCell>
                        <TableCell className="max-w-xs truncate" title={log.notes}>{log.notes || "N/A"}</TableCell>
                        <TableCell className="text-right">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label={`Delete history log for ${log.taskType}`}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Log</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the maintenance log for "{log.taskType}" performed on {safeFormatDate(log.datePerformed, "PPP")}.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    {/* Wrap async call */}
                                    <AlertDialogAction onClick={async () => await handleDelete(log.id, log.taskType)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        </TableRow>
                    );
                    })}
                </TableBody>
                </Table>
            ) : (
                 <p className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2">
                     <Info className="h-4 w-4"/> No maintenance history yet. Log your first task!
                 </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
