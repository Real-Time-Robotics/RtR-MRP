"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, Cloud, Home } from "lucide-react";
import Link from "next/link";
import { isOnline, getPendingOperations } from "@/lib/mobile";

export default function OfflinePage() {
  const [online, setOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(isOnline());

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Get pending operations count
    getPendingOperations().then((ops) => setPendingCount(ops.length));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (online) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Cloud className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold">You&apos;re back online!</h1>
            <p className="text-sm text-muted-foreground">
              Your connection has been restored. You can continue using the app
              normally.
            </p>
            <Link href="/mobile">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <Card className="max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <WifiOff className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold">You&apos;re offline</h1>
          <p className="text-sm text-muted-foreground">
            It looks like you&apos;ve lost your internet connection. Don&apos;t worry -
            you can still use many features offline.
          </p>

          {pendingCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="text-yellow-800">
                You have <strong>{pendingCount}</strong> pending operation
                {pendingCount !== 1 ? "s" : ""} that will sync when you&apos;re back
                online.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="font-medium text-sm">Available offline:</h2>
            <ul className="text-sm text-muted-foreground text-left space-y-1">
              <li>• View cached parts and locations</li>
              <li>• Scan barcodes and QR codes</li>
              <li>• Make inventory adjustments (will sync later)</li>
              <li>• View recent scan history</li>
              <li>• Access cached work orders</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Link href="/mobile">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Continue Offline
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
