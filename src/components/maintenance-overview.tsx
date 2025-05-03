
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, isFuture, isPast, isValid, formatDistanceToNowStrict } from "date-fns";
import { Droplet, Gauge, Wrench, CircleCheck, Wind, Bike, AlertTriangle, CheckCircle2, CalendarClock, Trash2, Info } from "lucide-react";
import { sendMaintenanceReminder } from "@/services/notification"; // Assuming this remains unchanged for now
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
import { Skeleton } from "@/components/ui/skeleton";


interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
  deleteLog: (id: string) => Promise<void>;
}

const taskIcons: { [key in MaintenanceLog["taskType"]]: React.ElementType } = {
  "Chain Lube": Droplet,
  "Brake Check": CircleCheck,
  "Tire Pressure": Gauge,
  "Hub Service": Wrench,
  "Wash": Wind,
  "Other": Bike,
};

// Helper function to safely format dates remains the same
const safeFormatDate = (date: Date | undefined | null, formatString: string = "PPP"): string => {
  // Ensure the input is a valid Date object before formatting
  if (date instanceof Date && isValid(date)) {
    try {
        return format(date, formatString);
    } catch (error) {
        console.error("Error formatting date:", date, error);
        return "Invalid Date";
    }
  } else if (date) {
     // If it's not a Date object but truthy, log a warning. This might happen if mapping fails.
     console.warn("safeFormatDate received a non-Date object:", date);
     return "Invalid Input";
  }
  return "N/A"; // Return N/A if date is undefined, null, or explicitly invalid
};


const getReminderBadge = (dueDate: Date | undefined | null): React.ReactNode => {
    // Ensure dueDate is a valid Date object
    if (!dueDate || !(dueDate instanceof Date) || !isValid(dueDate)) {
        return null; // No badge if no due date or it's invalid/not a Date object
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
    const daysUntilDue = differenceInDays(dueDate, now);

    if (daysUntilDue <= 7) {
        return <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-accent text-accent-foreground"><CalendarClock className="h-3 w-3" /> Due in {formatDistanceToNowStrict(dueDate)}</Badge>;
    } else {
        return <Badge variant="secondary" className="ml-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Due in {formatDistanceToNowStrict(dueDate)}</Badge>;
    }
};


export function MaintenanceOverview({ logs, deleteLog }: MaintenanceOverviewProps) {
  const { toast } = useToast();
  const [upcomingReminders, setUpcomingReminders] = useState<MaintenanceLog[]>([]);
  const [pastLogs, setPastLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);


   useEffect(() => {
    // Set current time only on the client side
    setCurrentTime(new Date());
  }, []);


   useEffect(() => {
     // Wait for currentTime and logs
     if (currentTime === null || !logs) {
         setIsLoading(true);
         return;
     }
     setIsLoading(true);

     // Logs received from props should already have JS Date objects due to mapping layer
     // Filter logs based on date validity and whether they are upcoming or past
    const now = currentTime; // Use the state variable

    // Filter for valid dates and ensure they are JS Date objects
    const validLogs = logs.filter(log =>
        log.datePerformed instanceof Date && isValid(log.datePerformed) &&
        (!log.nextServiceDue || (log.nextServiceDue instanceof Date && isValid(log.nextServiceDue)))
    );


    const upcoming = validLogs.filter(
      (log) => log.nextServiceDue // Check if nextServiceDue exists and is a valid Date (already filtered)
    ).sort((a, b) => {
        // Should always be valid Date objects here
        return a.nextServiceDue!.getTime() - b.nextServiceDue!.getTime();
    });


    const past = validLogs.filter(
       (log) => !log.nextServiceDue // Keep logs with no due date in past
       // Or logs where due date is in the past (already filtered for valid Date objects)
       || (log.nextServiceDue && isPast(log.nextServiceDue))
    ).sort((a, b) => {
         // Should always be valid Date objects here
         return b.datePerformed.getTime() - a.datePerformed.getTime();
     });


    setUpcomingReminders(upcoming);
    setPastLogs(past);
    setIsLoading(false);

    // --- Notification Logic (remains largely the same, ensure date validity) ---
    upcoming.forEach(log => {
        const dueDate = log.nextServiceDue;
        // Ensure dueDate is valid Date and check if due today or tomorrow
         if (dueDate && isValid(dueDate) && differenceInDays(dueDate, now) <= 1 && differenceInDays(dueDate, now) >= 0 ) {
             const notificationKey = `reminder_sent_${log.id}_${safeFormatDate(dueDate, 'yyyy-MM-dd')}`;
             let alreadySent = false;
             try {
                 alreadySent = localStorage.getItem(notificationKey) === 'true';
             } catch (e) { console.error("localStorage unavailable"); }


             if (!alreadySent) {
                sendMaintenanceReminder(
                    "user-123", // Replace with actual user ID
                    `${log.taskType} is due on ${safeFormatDate(dueDate, "PPP")}`
                ).then(notification => {
                    if (notification) { // Check if notification was actually sent (optional)
                        toast({
                            title: "Maintenance Reminder",
                            description: notification.message,
                            variant: "default",
                        });
                        try {
                             localStorage.setItem(notificationKey, 'true');
                        } catch (e) { console.error("localStorage unavailable"); }
                    }
                }).catch(error => {
                    console.error("Failed to send notification:", error);
                });
            }
        }
    });
    // --- End Notification Logic ---

   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [logs, currentTime]); // Rerun when logs or currentTime change


  const handleDelete = async (id: string, taskType: string) => {
     try {
         await deleteLog(id); // Call the delete function passed via props
         // Toast is handled in the parent component
     } catch (error) {
         console.error("Overview: Failed to trigger delete log", error);
         // Error toast is handled in the parent component
     }
  }

  // Loading Skeleton remains the same
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


   // Conditional rendering based on loading state remains the same
    if (currentTime === null) {
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
                            // Ensure dates are valid Date objects before passing to helpers
                            const validDatePerformed = log.datePerformed instanceof Date && isValid(log.datePerformed) ? log.datePerformed : undefined;
                            const validNextServiceDue = log.nextServiceDue instanceof Date && isValid(log.nextServiceDue) ? log.nextServiceDue : undefined;

                            return (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    {log.taskType}
                                    </TableCell>
                                    {/* Use safeFormatDate with validated date */}
                                    <TableCell>{safeFormatDate(validNextServiceDue, "PPP")}</TableCell>
                                    {/* Pass validated date to badge generator */}
                                    <TableCell>{getReminderBadge(validNextServiceDue)}</TableCell>
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
                                                    {/* Use safeFormatDate for display */}
                                                    This action cannot be undone. This will permanently delete the upcoming reminder for "{log.taskType}" due on {safeFormatDate(validNextServiceDue, "PPP")}. The original log performed on {safeFormatDate(validDatePerformed, "PPP")} will remain in history (if applicable).
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                     // Ensure datePerformed is valid Date before formatting
                     const validDatePerformed = log.datePerformed instanceof Date && isValid(log.datePerformed) ? log.datePerformed : undefined;
                    return (
                        <TableRow key={log.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {log.taskType}
                        </TableCell>
                        {/* Use safeFormatDate with validated date */}
                        <TableCell>{safeFormatDate(validDatePerformed, "PPP")}</TableCell>
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
                                        {/* Use safeFormatDate for display */}
                                        This action cannot be undone. This will permanently delete the maintenance log for "{log.taskType}" performed on {safeFormatDate(validDatePerformed, "PPP")}.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
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
