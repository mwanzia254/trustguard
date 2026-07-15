-- ScamChek — Supabase Migration 001
-- Run this in the Supabase SQL Editor or via: supabase db push

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- Users profile table (linked to auth.users)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'contributor', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 0,
  profile_image VARCHAR(500),
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────
-- Sellers
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(255),
  phone_number VARCHAR(20),
  till_number VARCHAR(20),
  paybill_number VARCHAR(20),
  social_media_handle VARCHAR(255),
  website_url VARCHAR(500),
  location VARCHAR(255),
  trust_score INTEGER DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('trusted','good','caution','high_risk','unknown','blocked')),
  total_reports INTEGER DEFAULT 0,
  positive_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Reports
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('fake_product','no_delivery','fake_business','payment_fraud','identity_theft','other')),
  description TEXT NOT NULL,
  amount_lost DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'KES',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','investigating')),
  ai_risk_score DECIMAL(5,2),
  ai_pattern VARCHAR(100),
  ai_severity VARCHAR(20),
  is_fake_detected BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Evidence (file metadata — files in Supabase Storage)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,       -- path inside Supabase Storage bucket
  public_url VARCHAR(500),                  -- signed/public URL
  file_type VARCHAR(50) NOT NULL,
  original_name VARCHAR(255),
  file_size INTEGER,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Reviews
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Search history
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  searched_value VARCHAR(500) NOT NULL,
  search_type VARCHAR(30) NOT NULL CHECK (search_type IN ('phone','till_number','paybill','business_name','social_media','website')),
  result_found BOOLEAN DEFAULT FALSE,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- AI analysis log
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_analysis_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  risk_score DECIMAL(5,2),
  prediction VARCHAR(50),
  detected_patterns TEXT[],
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Performance indexes
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sellers_phone    ON public.sellers(phone_number);
CREATE INDEX IF NOT EXISTS idx_sellers_till     ON public.sellers(till_number);
CREATE INDEX IF NOT EXISTS idx_sellers_paybill  ON public.sellers(paybill_number);
CREATE INDEX IF NOT EXISTS idx_sellers_name     ON public.sellers(business_name);
CREATE INDEX IF NOT EXISTS idx_sellers_score    ON public.sellers(trust_score);
CREATE INDEX IF NOT EXISTS idx_reports_seller   ON public.reports(seller_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reviews_seller   ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_searches_value   ON public.searches(searched_value);

-- ──────────────────────────────────────────────
-- Row Level Security policies
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches  ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read any profile, only update their own
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Sellers: anyone can read, only service role can write
CREATE POLICY "sellers_select_all" ON public.sellers FOR SELECT USING (TRUE);

-- Reports: authenticated users can insert; only owner can see their own; admins via service role
CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reports_select_own"  ON public.reports FOR SELECT USING (user_id = auth.uid());

-- Reviews: public read, authenticated write
CREATE POLICY "reviews_select_all"    ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_auth"   ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Evidence: owner can see their own
CREATE POLICY "evidence_select_own" ON public.evidence
  FOR SELECT USING (
    report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
  );

-- Searches: private to owner
CREATE POLICY "searches_select_own" ON public.searches
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "searches_insert_any" ON public.searches
  FOR INSERT WITH CHECK (TRUE);
