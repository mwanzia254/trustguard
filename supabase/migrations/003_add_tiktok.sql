-- Migration 003: Add TikTok support
-- Run in Supabase SQL Editor

-- Add tiktok_handle column to sellers
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS tiktok_handle VARCHAR(255);

-- Add index for fast TikTok lookups
CREATE INDEX IF NOT EXISTS idx_sellers_tiktok ON public.sellers(tiktok_handle);

-- Update searches search_type constraint to include tiktok
ALTER TABLE public.searches
  DROP CONSTRAINT IF EXISTS searches_search_type_check;

ALTER TABLE public.searches
  ADD CONSTRAINT searches_search_type_check
  CHECK (search_type IN ('phone','till_number','paybill','business_name','tiktok','social_media','website'));
