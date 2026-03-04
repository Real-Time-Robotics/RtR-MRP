'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  FileText,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  simulationHorizonDays: number;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ScenarioCard({ scenario, onRun, onEdit, onDelete }: ScenarioCardProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'demand':
        return <TrendingUp className="h-4 w-4" />;
      case 'supply':
        return <TrendingDown className="h-4 w-4" />;
      case 'capacity':
        return <Zap className="h-4 w-4" />;
      case 'custom':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'demand':
        return 'bg-blue-100 text-blue-800';
      case 'supply':
        return 'bg-orange-100 text-orange-800';
      case 'capacity':
        return 'bg-purple-100 text-purple-800';
      case 'custom':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'running':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          runMonteCarlo: true,
          generateAIInsight: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/ai/simulation/${result.resultId}`);
      }
    } catch (error) {
      clientLogger.error('Failed to run simulation', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ai/simulation/scenarios?id=${scenario.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
      }
    } catch (error) {
      clientLogger.error('Failed to delete scenario', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/ai/simulation/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate',
          scenarioId: scenario.id,
        }),
      });

      if (response.ok) {
        onDelete(); // Refresh the list
      }
    } catch (error) {
      clientLogger.error('Failed to duplicate scenario', error);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(scenario.type)}>
                {getTypeIcon(scenario.type)}
                <span className="ml-1 capitalize">{scenario.type}</span>
              </Badge>
              <Badge className={getStatusColor(scenario.status)}>
                {scenario.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardTitle className="text-lg mt-2">{scenario.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {scenario.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(scenario.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{scenario.simulationHorizonDays} days</span>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleRunSimulation}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Simulation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{scenario.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
