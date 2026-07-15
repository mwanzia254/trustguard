-- Trending searches RPC
CREATE OR REPLACE FUNCTION public.trending_searches(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(searched_value TEXT, search_type TEXT, search_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT searched_value, search_type, COUNT(*) AS search_count
  FROM public.searches
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY searched_value, search_type
  ORDER BY search_count DESC
  LIMIT limit_count;
$$;
