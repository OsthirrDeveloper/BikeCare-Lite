export type MaintenanceTaskType =
  | "Chain Lube"
  | "Brake Check"
  | "Tire Pressure"
  | "Hub Service"
  | "Wash"
  | "Other";

export interface MaintenanceLog {
  id: string;
  taskType: MaintenanceTaskType;
  datePerformed: Date;
  notes?: string;
  nextServiceDue?: Date;
}
