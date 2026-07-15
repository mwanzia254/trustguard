-- Migration 004: M-Pesa transaction code tracking
-- Run in Supabase SQL Editor

-- Store validated M-Pesa codes per report to detect duplicates
CREATE TABLE IF NOT EXISTS public.mpesa_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  code        VARCHAR(20) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: same M-Pesa code cannot be used as evidence twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_mpesa_codes_unique ON public.mpesa_codes(code);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_mpesa_codes_report ON public.mpesa_codes(report_id);

-- Add reporter_weight column to reports for audit trail
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reporter_weight DECIMAL(4,2) DEFAULT 1.0;
