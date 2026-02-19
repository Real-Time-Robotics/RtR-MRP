'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Link2,
  Search,
  Package,
  FileStack,
  ClipboardList,
  ShoppingCart,
  Receipt,
  Truck,
  Users,
  Warehouse,
  CheckCircle,
  Calculator,
  Loader2,
} from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import {
  LinkedEntityType,
  EntityLinkInput,
  EntitySearchResult,
  ENTITY_CONFIG,
} from '@/types/discussions';

interface EntityPickerProps {
  onSelect: (entity: EntityLinkInput) => void;
  disabled?: boolean;
  className?: string;
}

const ENTITY_ICONS: Record<LinkedEntityType, React.ComponentType<{ className?: string }>> = {
  PART: Package,
  BOM: FileStack,
  WORK_ORDER: ClipboardList,
  PURCHASE_ORDER: ShoppingCart,
  SALES_ORDER: Receipt,
  SUPPLIER: Truck,
  CUSTOMER: Users,
  INVENTORY: Warehouse,
  QC_REPORT: CheckCircle,
  MRP_RUN: Calculator,
};

const QUICK_ENTITY_TYPES: LinkedEntityType[] = ['PART', 'WORK_ORDER', 'PURCHASE_ORDER', 'SALES_ORDER'];
const ALL_ENTITY_TYPES: LinkedEntityType[] = Object.keys(ENTITY_CONFIG) as LinkedEntityType[];

export function EntityPicker({ onSelect, disabled, className }: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LinkedEntityType>('PART');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<EntitySearchResult[]>([]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search for entities
  const searchEntities = useCallback(async (type: LinkedEntityType, query: string) => {
    if (!query.trim() && query.length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/discussions/entities/search?type=${type}&q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      clientLogger.error('Entity search failed', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Effect to search when query changes
  useMemo(() => {
    if (open && debouncedQuery) {
      searchEntities(activeTab, debouncedQuery);
    } else if (!debouncedQuery) {
      setResults([]);
    }
  }, [debouncedQuery, activeTab, open, searchEntities]);

  const handleSelect = useCallback((result: EntitySearchResult) => {
    const entityLink: EntityLinkInput = {
      entityType: result.type,
      entityId: result.id,
      entityTitle: result.title,
      entitySubtitle: result.subtitle,
      entityIcon: result.icon,
      entityStatus: result.status,
    };
    onSelect(entityLink);
    setOpen(false);
    setSearchQuery('');
    setResults([]);
  }, [onSelect]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as LinkedEntityType);
    setResults([]);
    if (searchQuery) {
      searchEntities(value as LinkedEntityType, searchQuery);
    }
  }, [searchQuery, searchEntities]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className={cn('h-8 w-8', className)}
              aria-label="Liên kết thực thể"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Link Entity</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="px-3 pt-2">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
              {ALL_ENTITY_TYPES.map((type) => {
                const config = ENTITY_CONFIG[type];
                const Icon = ENTITY_ICONS[type];
                const isQuick = QUICK_ENTITY_TYPES.includes(type);
                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className={cn(
                      'h-7 px-2 text-xs gap-1',
                      !isQuick && 'hidden sm:flex'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <ScrollArea className="h-[250px]">
            {ALL_ENTITY_TYPES.map((type) => (
              <TabsContent key={type} value={type} className="m-0 p-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result) => {
                      const Icon = ENTITY_ICONS[result.type];
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className={cn(
                            'mt-0.5 p-1.5 rounded',
                            `bg-${ENTITY_CONFIG[result.type].color}-100 text-${ENTITY_CONFIG[result.type].color}-600`
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {result.title}
                              </span>
                              {result.status && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {result.status}
                                </Badge>
                              )}
                            </div>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No {ENTITY_CONFIG[type].label.toLowerCase()}s found
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Start typing to search {ENTITY_CONFIG[type].label.toLowerCase()}s
                  </div>
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
