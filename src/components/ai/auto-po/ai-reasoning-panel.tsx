'use client';

// =============================================================================
// AI REASONING PANEL - Expandable panel showing AI decision explanation
// Vietnamese explanation with key factors and data sources
// =============================================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Database,
  Clock,
  Package,
  Truck,
  DollarSign,
} from 'lucide-react';

interface KeyFactor {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  label: string;
  description: string;
  impact?: 'high' | 'medium' | 'low';
}

interface DataSource {
  name: string;
  description: string;
  lastUpdated?: string;
}

interface AIReasoningPanelProps {
  reasoning: string;
  keyFactors?: KeyFactor[];
  dataSources?: DataSource[];
  shortSummary?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function AIReasoningPanel({
  reasoning,
  keyFactors = [],
  dataSources = [],
  shortSummary,
  defaultExpanded = false,
  className,
}: AIReasoningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const factorIcons = {
    positive: <CheckCircle className="h-4 w-4 text-green-500" />,
    negative: <TrendingDown className="h-4 w-4 text-red-500" />,
    neutral: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  };

  const impactBadges = {
    high: <Badge variant="destructive" className="text-xs">Cao</Badge>,
    medium: <Badge variant="secondary" className="text-xs">Trung bình</Badge>,
    low: <Badge variant="outline" className="text-xs">Thấp</Badge>,
  };

  const sourceIcons: Record<string, JSX.Element> = {
    inventory: <Package className="h-4 w-4" />,
    demand: <TrendingUp className="h-4 w-4" />,
    supplier: <Truck className="h-4 w-4" />,
    price: <DollarSign className="h-4 w-4" />,
    history: <Clock className="h-4 w-4" />,
    default: <Database className="h-4 w-4" />,
  };

  return (
    <Card className={cn('border-blue-200 dark:border-blue-800', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-sm font-medium">
                  Phân tích AI
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {shortSummary && !isExpanded && (
                  <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {shortSummary}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Main Reasoning */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {reasoning}
              </p>
            </div>

            {/* Key Factors */}
            {keyFactors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Yếu tố chính
                </h4>
                <div className="space-y-2">
                  {keyFactors.map((factor, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-md text-sm',
                        factor.type === 'positive' && 'bg-green-50 dark:bg-green-950/30',
                        factor.type === 'negative' && 'bg-red-50 dark:bg-red-950/30',
                        factor.type === 'warning' && 'bg-yellow-50 dark:bg-yellow-950/30',
                        factor.type === 'neutral' && 'bg-gray-50 dark:bg-gray-800/30'
                      )}
                    >
                      {factorIcons[factor.type]}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{factor.label}</span>
                          {factor.impact && impactBadges[factor.impact]}
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {factor.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Sources */}
            {dataSources.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Nguồn dữ liệu
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {dataSources.map((source, index) => {
                    const iconKey = source.name.toLowerCase().includes('inventory')
                      ? 'inventory'
                      : source.name.toLowerCase().includes('demand')
                      ? 'demand'
                      : source.name.toLowerCase().includes('supplier')
                      ? 'supplier'
                      : source.name.toLowerCase().includes('price')
                      ? 'price'
                      : source.name.toLowerCase().includes('history')
                      ? 'history'
                      : 'default';

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded"
                      >
                        {sourceIcons[iconKey]}
                        <div>
                          <span className="font-medium">{source.name}</span>
                          <p className="text-muted-foreground">{source.description}</p>
                          {source.lastUpdated && (
                            <p className="text-muted-foreground mt-0.5">
                              Cập nhật: {source.lastUpdated}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default AIReasoningPanel;
