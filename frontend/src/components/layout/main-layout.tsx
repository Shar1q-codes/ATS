"use client";

import * as React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showSidebar?: boolean;
  showFooter?: boolean;
}

export function MainLayout({
  children,
  className,
  showSidebar = true,
  showFooter = true,
}: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={showSidebar ? toggleSidebar : undefined}
        isMenuOpen={isSidebarOpen}
      />

      <div className="flex">
        {showSidebar && (
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        )}

        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-4rem)]",
            showSidebar && "md:ml-64",
            className
          )}
        >
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>

      {showFooter && <Footer />}
    </div>
  );
}
