
"use client";

import type * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Bike, Droplet, Gauge, Wrench, CircleCheck, Wind } from "lucide-react";

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
// Remove Select imports as we are using Combobox (Popover + Command)
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
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
  ], { required_error: "Task type is required." }), // Added required error
  datePerformed: z.date({
    required_error: "Date performed is required.",
  }),
  notes: z.string().optional(),
  nextServiceDue: z.date().optional(),
});

type MaintenanceFormValues = z.infer<typeof formSchema>;

interface MaintenanceLogFormProps {
  addLog: (log: Omit<MaintenanceLog, 'id'>) => Promise<void>; // Make addLog async and expect Omit<...>
}

export function MaintenanceLogForm({ addLog }: MaintenanceLogFormProps) {
  const { toast } = useToast();
  const [taskTypePopoverOpen, setTaskTypePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      datePerformed: new Date(),
      notes: "",
      taskType: undefined, // Ensure taskType is initially undefined for placeholder
    },
  });

  const selectedTaskType = form.watch("taskType"); // Watch the taskType field

  async function onSubmit(data: MaintenanceFormValues) {
    setIsSubmitting(true); // Disable button on submit
    const newLogData: Omit<MaintenanceLog, 'id'> = { // Create data without ID
      taskType: data.taskType,
      datePerformed: data.datePerformed,
      notes: data.notes,
      nextServiceDue: data.nextServiceDue,
    };

    try {
        await addLog(newLogData); // Call the async addLog prop
        toast({
            title: "Maintenance Logged",
            description: `${data.taskType} performed on ${format(data.datePerformed, "PPP")}.`,
            variant: "default" // Use default variant for success
        });
        form.reset({ datePerformed: new Date(), notes: "", taskType: undefined }); // Reset form
    } catch (error) {
        // Error toast is handled in the parent component where addLog is defined
        console.error("Form submission error:", error)
    } finally {
        setIsSubmitting(false); // Re-enable button
    }

  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        !field.value && "text-muted-foreground" // Style placeholder
                      )}
                      // Ensure type="button" to prevent form submission on trigger click
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
                            value={task.label} // Use label for searching/filtering
                            key={task.value}
                            onSelect={() => {
                              form.setValue("taskType", task.value, { shouldValidate: true }); // Validate on change
                              setTaskTypePopoverOpen(false);
                            }}
                          >
                            <task.icon className={cn("mr-2 h-4 w-4",
                               task.value === field.value ? "opacity-100" : "opacity-60" // Indicate selection subtly
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
              {/* Conditionally render description for "Other" task */}
              {selectedTaskType === "Other" && (
                <FormDescription className="mt-2">
                  Please provide specific details about the task in the 'Notes' section below.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

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
                      type="button" // Ensure this is not submitting the form
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
                         field.onChange(date); // Update field value
                         form.trigger("datePerformed"); // Manually trigger validation if needed
                     }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes {selectedTaskType === "Other" ? "" : "(Optional)"}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={selectedTaskType === "Other" ? "Please specify the maintenance task performed..." : "Any specific details? e.g., Replaced brake pads, Tuned gears..."}
                  {...field}
                />
              </FormControl>
               {/* Add description specifically for 'Other' task notes */}
               {selectedTaskType === "Other" && (
                 <FormDescription>
                   This field is important when selecting 'Other' task type.
                 </FormDescription>
               )}
              <FormMessage />
            </FormItem>
          )}
        />

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
                      type="button" // Prevent form submission
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
                    selected={field.value}
                     onSelect={(date) => {
                         field.onChange(date);
                         form.trigger("nextServiceDue");
                     }}
                     disabled={(date) => date < new Date()} // Can only set reminders for the future
                    initialFocus
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging..." : "Log Maintenance Task"}
        </Button>
      </form>
    </Form>
  );
}

