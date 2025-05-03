
"use client";

import type * as React from "react";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Bike, Droplet, Gauge, Wrench, CircleCheck, Wind, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MaintenanceLog, MaintenanceTaskType } from "@/types/maintenance";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // Import Command components

const maintenanceTasks: { value: MaintenanceTaskType; label: string; icon: React.ElementType }[] = [
  { value: "Chain Lube", label: "Chain Lube", icon: Droplet },
  { value: "Brake Check", label: "Brake Check", icon: CircleCheck },
  { value: "Tire Pressure", label: "Tire Pressure", icon: Gauge },
  { value: "Hub Service", label: "Hub Service / Greasing", icon: Wrench }, // Updated label
  { value: "Wash", label: "Bike Wash", icon: Wind }, // Using Wind for wash
  { value: "Other", label: "Other (Specify in Notes)", icon: Bike }, // Updated label
];

// Ensure Zod enum includes all possible task types defined above
const formSchema = z.object({
  taskType: z.enum([
    "Chain Lube",
    "Brake Check",
    "Tire Pressure",
    "Hub Service",
    "Wash",
    "Other",
  ], { required_error: "Task type is required." }),
  datePerformed: z.date({
    required_error: "Date performed is required.",
  }),
  notes: z.string().optional(),
  nextServiceDue: z.date().optional().nullable(), // Allow null for optional dates
});

type MaintenanceFormValues = z.infer<typeof formSchema>;

interface MaintenanceLogFormProps {
  onSubmitLog: (log: Omit<MaintenanceLog, 'id'>) => Promise<void>; // Renamed prop
  initialData?: MaintenanceLog | null; // For editing
  onCancelEdit?: () => void; // To cancel editing
  isEditing?: boolean; // Explicit editing flag
}

export function MaintenanceLogForm({ onSubmitLog, initialData, onCancelEdit, isEditing = false }: MaintenanceLogFormProps) {
  const { toast } = useToast();
  const [taskTypePopoverOpen, setTaskTypePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(formSchema),
    // Set default values based on initialData if editing, otherwise use defaults
    defaultValues: initialData ? {
        taskType: initialData.taskType,
        datePerformed: initialData.datePerformed,
        notes: initialData.notes ?? "",
        nextServiceDue: initialData.nextServiceDue ?? null,
    } : {
        datePerformed: new Date(),
        notes: "",
        taskType: undefined,
        nextServiceDue: null,
    },
  });

  // Reset form when initialData changes (e.g., switching between editing and adding)
  useEffect(() => {
    if (initialData) {
      form.reset({
        taskType: initialData.taskType,
        datePerformed: initialData.datePerformed,
        notes: initialData.notes ?? "",
        nextServiceDue: initialData.nextServiceDue ?? null,
      });
    } else {
      // Reset to default 'add' state if initialData becomes null/undefined
      form.reset({ datePerformed: new Date(), notes: "", taskType: undefined, nextServiceDue: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // Removed form from dependency array as recommended by react-hook-form docs

  const selectedTaskType = form.watch("taskType"); // Watch the taskType field

  async function onSubmit(data: MaintenanceFormValues) {
    setIsSubmitting(true);
    // Convert null back to undefined if necessary for your logic, or keep as null
    const logDataToSubmit: Omit<MaintenanceLog, 'id'> = {
      taskType: data.taskType,
      datePerformed: data.datePerformed,
      notes: data.notes,
      // Ensure nextServiceDue is Date or undefined
      nextServiceDue: data.nextServiceDue ? data.nextServiceDue : undefined,
    };

    try {
        await onSubmitLog(logDataToSubmit); // Call the renamed prop
        if (!isEditing) { // Only show add toast here, update toast is handled in parent
            toast({
                title: "Maintenance Logged",
                description: `${data.taskType} performed on ${format(data.datePerformed, "PPP")}.`,
                variant: "default"
            });
            form.reset({ datePerformed: new Date(), notes: "", taskType: undefined, nextServiceDue: null }); // Reset form after adding
        }
        // Parent handles resetting form/state after update
    } catch (error) {
        // Error toast is handled in the parent component where onSubmitLog is defined
        console.error("Form submission error:", error)
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Task Type Combobox */}
        <FormField
          control={form.control}
          name="taskType"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Task Type</FormLabel>
              <Popover open={taskTypePopoverOpen} onOpenChange={setTaskTypePopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={taskTypePopoverOpen}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      {field.value
                        ? maintenanceTasks.find(
                            (task) => task.value === field.value
                          )?.label
                        : "Select task type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                   <Command>
                    <CommandInput placeholder="Search task..." />
                    <CommandList>
                      <CommandEmpty>No task found.</CommandEmpty>
                      <CommandGroup>
                        {maintenanceTasks.map((task) => (
                          <CommandItem
                            value={task.label}
                            key={task.value}
                            onSelect={() => {
                              form.setValue("taskType", task.value, { shouldValidate: true });
                              setTaskTypePopoverOpen(false);
                            }}
                          >
                            <task.icon className={cn("mr-2 h-4 w-4",
                               task.value === field.value ? "opacity-100" : "opacity-60"
                            )} />
                            <span>{task.label}</span>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                task.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTaskType === "Other" && (
                <FormDescription className="mt-2">
                  Please provide specific details about the task in the 'Notes' section below.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Performed Calendar */}
        <FormField
          control={form.control}
          name="datePerformed"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Performed</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      type="button"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                         if(date) field.onChange(date); // Ensure date is not undefined
                         form.trigger("datePerformed");
                     }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                     // Use defaultMonth if editing to show the selected month
                     defaultMonth={field.value ? field.value : new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes Textarea */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes {selectedTaskType === "Other" && !isEditing ? "" : "(Optional)"}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={selectedTaskType === "Other" ? "Please specify the maintenance task performed..." : "Any specific details? e.g., Replaced brake pads, Tuned gears..."}
                  {...field}
                />
              </FormControl>
               {selectedTaskType === "Other" && (
                 <FormDescription>
                   This field is important when selecting 'Other' task type.
                 </FormDescription>
               )}
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Next Service Due Calendar */}
        <FormField
          control={form.control}
          name="nextServiceDue"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Next Service Due (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      type="button"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Set reminder date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ?? undefined} // Pass undefined if null
                     onSelect={(date) => {
                         field.onChange(date ?? null); // Store null if date is cleared
                         form.trigger("nextServiceDue");
                     }}
                     disabled={(date) => date < new Date()} // Can only set reminders for the future
                     // Allow clearing the date by clicking again
                     footer={
                        field.value ? (
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start text-sm text-muted-foreground"
                            onClick={() => {
                                field.onChange(null); // Clear the date
                                form.trigger("nextServiceDue");
                            }}
                        >
                            <XCircle className="mr-2 h-4 w-4" /> Clear Date
                        </Button>
                        ) : null
                     }
                    initialFocus
                    // Use defaultMonth if editing to show the selected month
                    defaultMonth={field.value ? field.value : undefined}
                  />
                </PopoverContent>
              </Popover>
               <FormDescription>
                 Set a future date for the next maintenance reminder for this task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit/Cancel Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "Saving..." : "Logging...") : (isEditing ? "Save Changes" : "Log Maintenance Task")}
            </Button>
            {isEditing && onCancelEdit && (
                <Button type="button" variant="outline" className="flex-1" onClick={onCancelEdit} disabled={isSubmitting}>
                    Cancel Edit
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}

