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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, isFuture, isPast, parseISO } from "date-fns";
import { Droplet, Gauge, Wrench, CircleCheck, Wind, Bike, AlertTriangle, CheckCircle2, CalendarClock, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog"


interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
  deleteLog: (id: string) => void;
}

const taskIcons: { [key in MaintenanceLog["taskType"]]: React.ElementType } = {
  "Chain Lube": Droplet,
  "Brake Check": CircleCheck,
  "Tire Pressure": Gauge,
  "Hub Service": Wrench,
  "Wash": Wind,
  "Other": Bike,
};

const getReminderBadge = (dueDate: Date | undefined): React.ReactNode => {
    // Ensure dueDate is a Date object if it exists
    const validDueDate = dueDate ? (typeof dueDate === 'string' ? parseISO(dueDate) : dueDate) : undefined;

    if (!validDueDate || !isFuture(validDueDate)) {
        return null; // No badge if no due date or if it's in the past
    }

    const daysUntilDue = differenceInDays(validDueDate, new Date());

    if (daysUntilDue <= 0) {
        return <Badge variant="destructive" className="ml-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Due Today / Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
        return <Badge variant="outline" className="ml-2 flex items-center gap-1 bg-accent text-accent-foreground"><CalendarClock className="h-3 w-3" /> Due in {daysUntilDue} day{daysUntilDue > 1 ? 's' : ''}</Badge>;
    } else {
        return <Badge variant="secondary" className="ml-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Due in {daysUntilDue} days</Badge>;
    }
};

export function MaintenanceOverview({ logs, deleteLog }: MaintenanceOverviewProps) {
  const { toast } = useToast();
  const [upcomingReminders, setUpcomingReminders] = useState<MaintenanceLog[]>([]);
  const [pastLogs, setPastLogs] = useState<MaintenanceLog[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

   useEffect(() => {
    // Set current time only on the client side after hydration
    setCurrentTime(new Date());
  }, []);

   useEffect(() => {
     if (!currentTime) return; // Don't run sorting/filtering until currentTime is set

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.datePerformed).getTime() - new Date(a.datePerformed).getTime()
    );

    const upcoming = sortedLogs.filter(
      (log) => log.nextServiceDue && isFuture(parseISO(log.nextServiceDue.toString()))
    ).sort((a, b) => new Date(a.nextServiceDue!).getTime() - new Date(b.nextServiceDue!).getTime());


    const past = sortedLogs.filter(
       (log) => !log.nextServiceDue || isPast(parseISO(log.nextServiceDue.toString()))
    );


    setUpcomingReminders(upcoming);
    setPastLogs(past);

    // Check for due reminders on mount and when logs change
    upcoming.forEach(log => {
        const dueDate = log.nextServiceDue ? parseISO(log.nextServiceDue.toString()) : undefined;
        if (dueDate && differenceInDays(dueDate, currentTime) <= 1 && differenceInDays(dueDate, currentTime) >= 0 ) { // Due today or tomorrow
            // Check if notification was already sent (e.g., using localStorage or a state variable)
            // For simplicity, we'll just show a toast here. A real app might track sent notifications.
             const notificationKey = `reminder_sent_${log.id}`;
             if (!localStorage.getItem(notificationKey)) {
                sendMaintenanceReminder(
                    "user-123", // Replace with actual user ID in a real app
                    `${log.taskType} is due on ${format(dueDate, "PPP")}`
                ).then(notification => {
                    toast({
                        title: "Maintenance Reminder",
                        description: notification.message,
                        variant: "default", // Use default or accent based on urgency
                    });
                    // Mark notification as sent
                     try {
                        localStorage.setItem(notificationKey, 'true');
                    } catch (error) {
                        console.error("Failed to use localStorage:", error);
                        // Handle cases where localStorage is not available or full
                    }
                });
            }
        }
    });

   }, [logs, toast, currentTime]); // Depend on currentTime

  const handleDelete = (id: string, taskType: string) => {
     deleteLog(id);
     toast({
        title: "Log Deleted",
        description: `Maintenance log for ${taskType} deleted.`,
        variant: "destructive"
     })
  }

  if (currentTime === null) {
     // Render loading state or placeholder until currentTime is available
     return (
        <Card>
            <CardHeader>
                <CardTitle>Loading Maintenance Logs...</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Please wait while we load your maintenance history.</p>
            </CardContent>
        </Card>
     )
  }


  return (
    <div className="space-y-8">
      {/* Upcoming Maintenance Section */}
       {upcomingReminders.length > 0 && (
         <Card>
            <CardHeader>
             <CardTitle className="text-accent">Upcoming Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
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
                        const dueDate = log.nextServiceDue ? parseISO(log.nextServiceDue.toString()) : undefined;
                        return (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                {log.taskType}
                                </TableCell>
                                <TableCell>{dueDate ? format(dueDate, "PPP") : "N/A"}</TableCell>
                                <TableCell>{getReminderBadge(dueDate)}</TableCell>
                                 <TableCell className="text-right">
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete Log</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the maintenance log for "{log.taskType}" performed on {format(parseISO(log.datePerformed.toString()), "PPP")}.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(log.id, log.taskType)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            </CardContent>
         </Card>
       )}


      {/* Maintenance History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance History</CardTitle>
        </CardHeader>
        <CardContent>
          {pastLogs.length > 0 ? (
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
                   const datePerformed = parseISO(log.datePerformed.toString()); // Ensure date is parsed correctly
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {log.taskType}
                      </TableCell>
                      <TableCell>{format(datePerformed, "PPP")}</TableCell>
                      <TableCell>{log.notes || "N/A"}</TableCell>
                      <TableCell className="text-right">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Log</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the maintenance log for "{log.taskType}" performed on {format(datePerformed, "PPP")}.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(log.id, log.taskType)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            <p className="text-center text-muted-foreground py-4">No maintenance history yet. Log your first task!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
