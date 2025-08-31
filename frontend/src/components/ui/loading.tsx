import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-current border-t-transparent",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
LoadingSpinner.displayName = "LoadingSpinner";

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  // Additional props can be added here in the future
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
);
LoadingSkeleton.displayName = "LoadingSkeleton";

interface LoadingStateProps {
  children?: React.ReactNode;
  loading?: boolean;
  skeleton?: React.ReactNode;
  spinner?: boolean;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  children,
  loading = false,
  skeleton,
  spinner = false,
  className,
}) => {
  if (loading) {
    if (skeleton) {
      return <>{skeleton}</>;
    }
    if (spinner) {
      return (
        <div className={cn("flex items-center justify-center p-4", className)}>
          <LoadingSpinner />
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
};

// Simple Loading component for general use
const Loading: React.FC<{ className?: string }> = ({ className }) => (
  <div
    data-testid="loading"
    className={cn("flex items-center justify-center p-8", className)}
  >
    <LoadingSpinner />
  </div>
);

export { LoadingSpinner, LoadingSkeleton, LoadingState, Loading };
