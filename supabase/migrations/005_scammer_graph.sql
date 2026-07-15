-- Migration 005: Scammer Graph (Cluster ID) + Watchlist
-- Run in Supabase SQL Editor

-- ── Scammer Cluster: group identifiers that belong to the same scammer ───────
CREATE TABLE IF NOT EXISTS public.scammer_clusters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label       VARCHAR(255),           -- optional human-readable label e.g. "John Scammer Network"
  risk_score  INTEGER DEFAULT 0,      -- composite risk across all linked sellers
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link sellers to clusters (many sellers can share a cluster)
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.scammer_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sellers_cluster ON public.sellers(cluster_id);

-- ── Watchlist: zero-match searches with high volume ──────────────────────────
CREATE TABLE IF NOT EXISTS public.search_watchlist (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  searched_value VARCHAR(500) NOT NULL,
  search_type    VARCHAR(30) NOT NULL,
  search_count   INTEGER DEFAULT 1,
  first_seen_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_flagged     BOOLEAN DEFAULT FALSE,
  flag_reason    VARCHAR(100)
);

-- Unique per (value, type) pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_unique
  ON public.search_watchlist(searched_value, search_type);

-- ── RPC: upsert a zero-match search into watchlist ───────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_watchlist(
  p_value TEXT,
  p_type  TEXT
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.search_watchlist (searched_value, search_type, search_count, first_seen_at, last_seen_at)
  VALUES (p_value, p_type, 1, NOW(), NOW())
  ON CONFLICT (searched_value, search_type)
  DO UPDATE SET
    search_count = search_watchlist.search_count + 1,
    last_seen_at = NOW(),
    -- Auto-flag if > 20 searches within 24 hours and not yet in DB
    is_flagged   = CASE
      WHEN search_watchlist.search_count >= 20
        AND search_watchlist.last_seen_at > NOW() - INTERVAL '24 hours'
      THEN TRUE
      ELSE search_watchlist.is_flagged
    END,
    flag_reason  = CASE
      WHEN search_watchlist.search_count >= 20
        AND search_watchlist.last_seen_at > NOW() - INTERVAL '24 hours'
        AND NOT search_watchlist.is_flagged
      THEN 'High search volume — possible active scam ad'
      ELSE search_watchlist.flag_reason
    END;
END;
$$;
