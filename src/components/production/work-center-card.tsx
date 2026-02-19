"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkCenterStatus } from "./work-center-status";
import { CapacityBar } from "./capacity-bar";
import { Settings } from "lucide-react";

interface WorkCenterCardProps {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  currentJob?: string | null;
  utilization: number;
  queueCount: number;
}

export function WorkCenterCard({
  id,
  code,
  name,
  type,
  status,
  currentJob,
  utilization,
  queueCount,
}: WorkCenterCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{code}</CardTitle>
          <WorkCenterStatus status={status} />
        </div>
        <p className="text-sm text-muted-foreground">{name}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Type:</span>
          <span className="font-medium">{type}</span>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-medium">{Math.round(utilization)}%</span>
          </div>
          <CapacityBar utilization={utilization} showLabel={false} height="sm" />
        </div>

        {currentJob && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current Job: </span>
            <span className="font-medium">{currentJob}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Queue:</span>
          <span className="font-medium">{queueCount} jobs</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/production/work-centers/${id}`}>View</Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Cài đặt">
            <Link href={`/production/work-centers/${id}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
