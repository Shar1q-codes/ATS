"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitBranch,
  BarChart3,
  Settings,
  Building2,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    children: [
      { name: "Job Families", href: "/jobs/families" },
      { name: "Templates", href: "/jobs/templates" },
      { name: "Company Variants", href: "/jobs/variants" },
      { name: "Active Postings", href: "/jobs/postings" },
    ],
  },
  {
    name: "Candidates",
    href: "/candidates",
    icon: Users,
    children: [
      { name: "All Candidates", href: "/candidates" },
      { name: "Resume Upload", href: "/candidates/upload" },
      { name: "Candidate Search", href: "/candidates/search" },
    ],
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: GitBranch,
    children: [
      { name: "Pipeline View", href: "/pipeline" },
      { name: "Applications", href: "/pipeline/applications" },
      { name: "Interview Schedule", href: "/pipeline/interviews" },
    ],
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    children: [
      { name: "Overview", href: "/analytics" },
      { name: "Pipeline Metrics", href: "/analytics/pipeline" },
      { name: "Source Performance", href: "/analytics/sources" },
      { name: "Diversity Reports", href: "/analytics/diversity" },
      { name: "Reports", href: "/analytics/reports" },
    ],
  },
  {
    name: "Communication",
    href: "/communication",
    icon: Mail,
    children: [
      { name: "Email Templates", href: "/communication/templates" },
      { name: "Email History", href: "/communication/history" },
      { name: "Bulk Communications", href: "/communication/bulk" },
    ],
  },

  {
    name: "Organization",
    href: "/organization",
    icon: Building2,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { name: "General", href: "/settings" },
      { name: "Integrations", href: "/settings/integrations" },
      { name: "API Keys", href: "/settings/api" },
    ],
  },
];

export function Sidebar({ className, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isExpanded = (href: string) => {
    return expandedItems.includes(href) || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:relative md:top-0 md:h-[calc(100vh-4rem)] md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto py-4">
          <nav className="flex-1 space-y-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const expanded = hasChildren && isExpanded(item.href);

              return (
                <div key={item.name}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive(item.href) && "bg-secondary"
                    )}
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpanded(item.href);
                      }
                    }}
                    asChild={!hasChildren}
                  >
                    {hasChildren ? (
                      <div className="flex items-center">
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                        <svg
                          className={cn(
                            "ml-auto h-4 w-4 transition-transform",
                            expanded && "rotate-90"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        {...(onClose && { onClick: onClose })}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    )}
                  </Button>

                  {hasChildren && expanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Button
                          key={child.name}
                          variant={isActive(child.href) ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link
                            href={child.href}
                            {...(onClose && { onClick: onClose })}
                          >
                            {child.name}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
