'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useSocketContextSafe } from '@/providers/socket-provider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  showText?: boolean;
  className?: string;
}

export function ConnectionStatus({
  showText = false,
  className,
}: ConnectionStatusProps) {
  const socket = useSocketContextSafe();
  const isConnected = socket?.isConnected ?? false;
  const isConnecting = socket?.socket?.connected === false && !socket?.socket?.disconnected;

  if (isConnecting) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-amber-500',
          className
        )}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {showText && <span className="text-[10px]">Connecting...</span>}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 cursor-default',
            isConnected ? 'text-green-500' : 'text-muted-foreground',
            className
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              {showText && <span className="text-[10px]">Live</span>}
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              {showText && <span className="text-[10px]">Offline</span>}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isConnected
          ? 'Real-time connection active'
          : 'Real-time connection unavailable'}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Minimal connection indicator (just a dot)
 */
interface ConnectionDotProps {
  className?: string;
}

export function ConnectionDot({ className }: ConnectionDotProps) {
  const socket = useSocketContextSafe();
  const isConnected = socket?.isConnected ?? false;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'w-2 h-2 rounded-full cursor-default',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30',
            className
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {isConnected ? 'Connected' : 'Disconnected'}
      </TooltipContent>
    </Tooltip>
  );
}
