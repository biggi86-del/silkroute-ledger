"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface UseDataFetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useDataFetch<T extends { fetchedAt?: string }>(
  url = "/api/data"
): UseDataFetchResult<T> {
  const [data, setData]             = useState<T | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt]   = useState<string | null>(null);

  const load = useCallback(
    async (bust = false) => {
      const endpoint = bust ? `${url}?refresh=true` : url;
      try {
        const r = await fetch(endpoint, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: T = await r.json();
        setData(d);
        setFetchedAt(d.fetchedAt ?? new Date().toISOString());
        setError(null);
        if (bust) toast.success("Ledger refreshed", { duration: 2000 });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        toast.error(`Failed to load data: ${msg}`, { duration: 4000 });
      }
    },
    [url]
  );

  useEffect(() => {
    load(false).finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { data, error, loading, refreshing, fetchedAt, refresh };
}
