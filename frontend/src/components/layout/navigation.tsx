"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

interface NavigationProps {
  items: NavigationItem[];
  className?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "pills" | "underline";
}

export function Navigation({
  items,
  className,
  orientation = "horizontal",
  variant = "default",
}: NavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getVariantClasses = (active: boolean) => {
    switch (variant) {
      case "pills":
        return active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground";
      case "underline":
        return active
          ? "border-b-2 border-primary text-primary"
          : "border-b-2 border-transparent hover:border-muted-foreground";
      default:
        return active
          ? "text-primary font-medium"
          : "text-muted-foreground hover:text-foreground";
    }
  };

  const baseClasses = cn(
    "flex",
    orientation === "horizontal" ? "flex-row space-x-6" : "flex-col space-y-1",
    className
  );

  const itemClasses = cn(
    "transition-colors text-sm",
    variant === "pills" && "px-3 py-2 rounded-md",
    variant === "underline" && "pb-2"
  );

  return (
    <nav className={baseClasses}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(itemClasses, getVariantClasses(active))}
          >
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

// Breadcrumb navigation component
interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="mx-2 h-4 w-4 text-muted-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
