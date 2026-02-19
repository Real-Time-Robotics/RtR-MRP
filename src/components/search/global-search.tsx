"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clientLogger } from "@/lib/client-logger";
import {
  Search,
  Package,
  Truck,
  ShoppingCart,
  ClipboardList,
  Users,
  Box,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  link: string;
  source?: 'semantic' | 'keyword';
  relevanceScore?: number;
}

const typeIcons: Record<string, React.ElementType> = {
  part: Package,
  supplier: Truck,
  order: ShoppingCart,
  po: ClipboardList,
  customer: Users,
  product: Box,
};

const typeLabels: Record<string, string> = {
  part: "Parts",
  supplier: "Suppliers",
  order: "Sales Orders",
  po: "Purchase Orders",
  customer: "Customers",
  product: "Products",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [searchLatency, setSearchLatency] = useState<number | null>(null);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search with debounce - uses semantic search API
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearchLatency(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Use semantic search API for natural language queries
        const res = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            mode: searchMode,
            limit: 15,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSearchLatency(data.latency || null);
        } else {
          // Fallback to basic search
          const fallbackRes = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
          );
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setResults(data.results || []);
          }
        }
      } catch (error) {
        clientLogger.error("Search failed", error);
        // Fallback to basic search on error
        try {
          const fallbackRes = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
          );
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setResults(data.results || []);
          }
        } catch {
          // Silent fail
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchMode]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.link);
  };

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors w-64"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <CommandInput
            placeholder="Search naturally... e.g. 'low stock components' or 'Japanese suppliers'"
            value={query}
            onValueChange={setQuery}
            className="flex-1"
          />
          {/* Search mode toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSearchMode('hybrid')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                searchMode === 'hybrid'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
              title="Hybrid (AI + Keyword)"
            >
              <Zap className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                searchMode === 'semantic'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
              title="AI Semantic Search"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <CommandList>
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {searchMode === 'semantic' ? 'AI analyzing...' : 'Searching...'}
              </div>
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>
              <div className="text-center py-4">
                <p>No results found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different query or switch search mode
                </p>
              </div>
            </CommandEmpty>
          )}

          {/* Search stats */}
          {!isLoading && results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between border-b">
              <span>{results.length} results</span>
              <span className="flex items-center gap-1">
                {searchMode === 'semantic' && <Sparkles className="h-3 w-3" />}
                {searchMode === 'hybrid' && <Zap className="h-3 w-3" />}
                {searchMode} mode
                {searchLatency && <span className="ml-2">{searchLatency}ms</span>}
              </span>
            </div>
          )}

          {Object.entries(groupedResults).map(([type, items]) => {
            const Icon = typeIcons[type] || Package;
            return (
              <CommandGroup key={type} heading={typeLabels[type] || type}>
                {items.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelect(result)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(result);
                    }}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{result.title}</p>
                        {result.source === 'semantic' && (
                          <Sparkles className="h-3 w-3 text-purple-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.subtitle}
                      </p>
                    </div>
                    {result.relevanceScore !== undefined && result.relevanceScore > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {Math.round(result.relevanceScore * 100)}%
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
