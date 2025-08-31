import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600">
            It looks like you've lost your internet connection. Don't worry, you
            can still access some cached content.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <div className="text-sm text-gray-500">
            <p>While offline, you can:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• View previously loaded candidates</li>
              <li>• Access cached job postings</li>
              <li>• Review application pipeline</li>
              <li>• View analytics data</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Your data will sync automatically when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
}
