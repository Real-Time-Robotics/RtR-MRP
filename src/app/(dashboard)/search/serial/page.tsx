// /dashboard/search/serial — Tra cứu Serial (TIP-S27-08)
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SerialDetailCard, type SerialResponse } from '@/components/serial/serial-detail-card';

export default function SerialSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SerialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('serial-recent-searches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Auto-search if query param present
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function doSearch(serial: string) {
    const trimmed = serial.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/serial/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError('Không tìm thấy serial.');
        return;
      }
      if (!res.ok) {
        setError('Lỗi tra cứu, vui lòng thử lại.');
        return;
      }
      const data = await res.json();
      setResult(data);

      // Save to recent
      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('serial-recent-searches', JSON.stringify(updated));
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('q', query.trim());
    router.replace(url.pathname + url.search);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Tra cứu Serial</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Quét hoặc nhập serial để xem thông tin đầy đủ.
      </p>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập serial number..."
          autoFocus
          aria-label="Serial number search"
          className="flex-1 px-3 py-2 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-info-cyan dark:bg-steel-dark dark:border-mrp-border"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-info-cyan text-white text-sm font-semibold rounded hover:bg-info-cyan/90 disabled:opacity-50"
        >
          {loading ? 'Đang tìm...' : 'Tra cứu'}
        </button>
      </form>

      {/* Recent searches */}
      {!result && !loading && recentSearches.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Tìm gần đây:</p>
          <div className="flex flex-wrap gap-1">
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s); }}
                className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gunmetal rounded hover:bg-gray-200 dark:hover:bg-mrp-border"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground animate-pulse">
          Đang tra cứu...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && <SerialDetailCard serial={result} />}
    </div>
  );
}
