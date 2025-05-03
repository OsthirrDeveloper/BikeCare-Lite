import React from 'react';
import { Bike } from 'lucide-react'; // Using Lucide Bike icon

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Bike className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold text-lg">BikeCare Lite</span>
        </div>
        {/* Add navigation or user actions here if needed */}
        {/* <nav className="flex items-center space-x-6 text-sm font-medium">
          <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</a>
          <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Settings</a>
        </nav> */}
      </div>
    </header>
  );
}
