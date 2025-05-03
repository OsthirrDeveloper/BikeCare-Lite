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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"; // Import Command components

const maintenanceTasks: { value: MaintenanceTaskType; label: string; icon: React.ElementType }[] = [
  { value: "Chain Lube", label: "Chain Lube", icon: Droplet },
  { value: "Brake Check", label: "Brake Check", icon: CircleCheck },
  { value: "Tire Pressure", label: "Tire Pressure", icon: Gauge },
  { value: "Hub Service", label: "Hub Service", icon: Wrench },
  { value: "Wash", label: "Bike Wash", icon: Wind }, // Using Wind for wash
  { value: "Other", label: "Other", icon: Bike },
];

const formSchema = z.object({
  taskType: z.enum([
    "Chain Lube",
    "Brake Check",
    "Tire Pressure",
    "Hub Service",
    "Wash",
    "Other",
  ]),
  datePerformed: z.date({
    required_error: "Date performed is required.",
  }),
  notes: z.string().optional(),
  nextServiceDue: z.date().optional(),
});

type MaintenanceFormValues = z.infer<typeof formSchema>;

interface MaintenanceLogFormProps {
  addLog: (log: MaintenanceLog) => void;
}

export function MaintenanceLogForm({ addLog }: MaintenanceLogFormProps) {
  const { toast } = useToast();
  const [taskTypePopoverOpen, setTaskTypePopoverOpen] = useState(false);

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      datePerformed: new Date(),
      notes: "",
    },
  });

  function onSubmit(data: MaintenanceFormValues) {
    const newLog: MaintenanceLog = {
      id: crypto.randomUUID(), // Simple ID generation for client-side
      taskType: data.taskType,
      datePerformed: data.datePerformed,
      notes: data.notes,
      nextServiceDue: data.nextServiceDue,
    };
    addLog(newLog);
    toast({
      title: "Maintenance Logged",
      description: `${data.taskType} performed on ${format(data.datePerformed, "PPP")}.`,
    });
    form.reset({ datePerformed: new Date(), notes: "" }); // Reset form after submission
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
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? maintenanceTasks.find(
                            (task) => task.value === field.value
                          )?.label
                        : "Select task type"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                              form.setValue("taskType", task.value);
                              setTaskTypePopoverOpen(false);
                            }}
                          >
                            <task.icon className="mr-2 h-4 w-4" />
                            {task.label}
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
                    onSelect={field.onChange}
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
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific details? e.g., Replaced brake pads"
                  {...field}
                />
              </FormControl>
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
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
               <FormDescription>
                 Set a date for the next reminder for this task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Log Maintenance Task
        </Button>
      </form>
    </Form>
  );
}
