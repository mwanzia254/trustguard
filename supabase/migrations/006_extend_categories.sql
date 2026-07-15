-- Migration 006: Extend report categories beyond money scams
-- Run in Supabase SQL Editor

-- Drop old constraint and replace with broader categories
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_category_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_category_check
  CHECK (category IN (
    'fake_product',
    'no_delivery',
    'fake_business',
    'payment_fraud',
    'identity_theft',
    'fake_account',
    'romance_scam',
    'job_scam',
    'other'
  ));
