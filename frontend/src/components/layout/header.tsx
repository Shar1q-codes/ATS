"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
  onMenuToggle?: (() => void) | undefined;
  isMenuOpen?: boolean;
}

export function Header({ className, onMenuToggle, isMenuOpen }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Mobile Menu Toggle */}
        <div className="flex items-center gap-4">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuToggle}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          )}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                ATS
              </span>
            </div>
            <span className="font-bold text-xl">AI-Native ATS</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Dashboard
          </Link>
          <Link
            href="/jobs"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Jobs
          </Link>
          <Link
            href="/candidates"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Candidates
          </Link>
          <Link
            href="/pipeline"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Pipeline
          </Link>
          <Link
            href="/analytics"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Analytics
          </Link>
        </nav>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="relative"
          >
            <User className="h-5 w-5" />
          </Button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border bg-popover p-1 shadow-md">
                <div className="px-2 py-1.5 text-sm font-medium">
                  John Doe
                  <div className="text-xs text-muted-foreground">
                    john@example.com
                  </div>
                </div>
                <div className="h-px bg-border my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
                <div className="h-px bg-border my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
