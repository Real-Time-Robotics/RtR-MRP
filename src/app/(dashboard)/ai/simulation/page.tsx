'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Plus,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Zap,
  BarChart3,
  GitCompare,
  Loader2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { clientLogger } from '@/lib/client-logger';

// Lazy-load heavy simulation components
const ScenarioWizard = dynamic(
  () => import('@/components/ai/simulation/scenario-wizard').then(mod => mod.ScenarioWizard),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
  }
);

const ScenarioCard = dynamic(
  () => import('@/components/ai/simulation/scenario-card').then(mod => mod.ScenarioCard),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  simulationHorizonDays: number;
}

interface RecentResult {
  id: string;
  scenarioName: string;
  scenarioType: string;
  status: string;
  createdAt: string;
}

export default function SimulationPage() {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardTemplate, setWizardTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/ai/simulation?templates=true');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setScenarios(data.scenarios || []);
        setRecentResults(data.recentResults || []);
        setCategories(data.templateCategories || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = (templateId: string) => {
    setWizardTemplate(templateId);
    setShowWizard(true);
  };

  const handleWizardComplete = async (scenario: Record<string, unknown>) => {
    setShowWizard(false);
    setWizardTemplate(null);
    await fetchData();
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

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
        return 'bg-primary-100 text-primary-800';
      case 'supply':
        return 'bg-orange-100 text-orange-800';
      case 'capacity':
        return 'bg-purple-100 text-purple-800';
      case 'custom':
        return 'bg-success-100 text-success-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">What-If Simulation</h1>
          <p className="text-muted-foreground">
            Run scenarios to analyze potential business impacts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
          {scenarios.length >= 2 && (
            <Button variant="outline">
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-success-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Scenarios</p>
                <p className="text-2xl font-bold">{scenarios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Recent Results</p>
                <p className="text-2xl font-bold">{recentResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Runtime</p>
                <p className="text-2xl font-bold">~2s</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scenarios">My Scenarios</TabsTrigger>
          <TabsTrigger value="results">Recent Results</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getTypeColor(template.type)}>
                      {getTypeIcon(template.type)}
                      <span className="ml-1 capitalize">{template.type}</span>
                    </Badge>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => handleCreateFromTemplate(template.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          {scenarios.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Scenarios Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first scenario from a template or build a custom one
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scenario
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onRun={() => {}}
                  onEdit={() => {}}
                  onDelete={() => fetchData()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {recentResults.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Run a simulation to see results here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentResults.map((result) => (
                <Card key={result.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(result.scenarioType)}
                        <div>
                          <p className="font-medium">{result.scenarioName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={result.status === 'success' ? 'default' : 'destructive'}
                        >
                          {result.status}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/ai/simulation/${result.id}`}>View</a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Scenario Wizard Modal */}
      {showWizard && (
        <ScenarioWizard
          templateId={wizardTemplate}
          onClose={() => {
            setShowWizard(false);
            setWizardTemplate(null);
          }}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}
