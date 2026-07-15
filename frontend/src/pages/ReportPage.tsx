import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, AlertCircle, Brain, CheckCircle, Loader2, Link2, Plus, X } from 'lucide-react';
import { submitReport, linkSellersIntoCluster } from '../lib/db';
import { analyzeText } from '../lib/aiEngine';
import { REPORT_CATEGORIES, SEARCH_TYPES } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const schema = z.object({
  category:       z.string().min(1, 'Select a category'),
  description:    z.string().min(20, 'Description must be at least 20 characters').max(2000),
  amount_lost:    z.string().optional(),
  currency:       z.string().default('KES'),
  searched_value: z.string().optional(),
  search_type:    z.string().default('phone'),
});

type FormData = z.infer<typeof schema>;

export const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('seller_id');
  const navigate  = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [files,           setFiles]           = useState<File[]>([]);
  const [aiAnalysis,      setAiAnalysis]      = useState<any>(null);
  const [analyzing,       setAnalyzing]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  // Scammer Graph — extra identifiers the user wants to link
  const [linkedIds, setLinkedIds] = useState<Array<{ type: string; value: string }>>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const description = watch('description');
  const category    = watch('category');

  const analyzeWithAI = () => {
    if (!description || description.length < 20) return;
    setAnalyzing(true);
    try {
      const result = analyzeText(description, category || 'other');
      setAiAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length + files.length > 5) { toast.error('Maximum 5 files allowed'); return; }
    setFiles(prev => [...prev, ...selected]);
  };

  const onSubmit = async (data: FormData) => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to submit a report');
      navigate('/login');
      return;
    }

    if (aiAnalysis?.isFakeReport) {
      toast.error('Report appears to be spam. Please provide more specific details.');
      return;
    }

    setSubmitting(true);
    try {
      const report = await submitReport({
        seller_id:      sellerId || undefined,
        searched_value: data.searched_value,
        search_type:    data.search_type,
        user_id:        user.id,
        category:       data.category,
        description:    data.description,
        amount_lost:    data.amount_lost ? parseFloat(data.amount_lost) : undefined,
        currency:       data.currency,
        ai_risk_score:  aiAnalysis?.riskScore,
        ai_pattern:     aiAnalysis?.pattern,
        ai_severity:    aiAnalysis?.severity,
        files,
      });

      // Scammer Graph — if user linked extra identifiers, create/join a cluster
      if (linkedIds.length > 0 && report?.seller_id) {
        const { supabase } = await import('../lib/supabase');
        const extraSellerIds: string[] = [];

        for (const li of linkedIds) {
          const colMap: Record<string, string> = {
            phone: 'phone_number', till_number: 'till_number', paybill: 'paybill_number',
            business_name: 'business_name', tiktok: 'tiktok_handle',
            social_media: 'social_media_handle', website: 'website_url',
          };
          const col = colMap[li.type] || 'phone_number';
          const { data: found } = await supabase.from('sellers').select('id').eq(col, li.value).maybeSingle();
          if (found) extraSellerIds.push(found.id);
        }

        if (extraSellerIds.length > 0) {
          await linkSellersIntoCluster([report.seller_id, ...extraSellerIds]);
        }
      }

      toast.success('Report submitted successfully. It will be reviewed shortly.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Report a Scam</h1>
      <p className="text-gray-500 mb-8">Help protect the community. Your report is reviewed by our AI system.</p>

      {!isAuthenticated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-600 mt-0.5" />
          <p className="text-yellow-800 text-sm">
            You need to <a href="/login" className="underline font-semibold">login</a> or{' '}
            <a href="/register" className="underline font-semibold">register</a> to submit a report.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {!sellerId && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Who are you reporting?</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Type</label>
                <select {...register('search_type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  {SEARCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input {...register('searched_value')} placeholder="e.g. 0712345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Type of Scam</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REPORT_CATEGORIES.map(cat => (
              <label key={cat.value} className="relative cursor-pointer">
                <input type="radio" value={cat.value} {...register('category')} className="peer sr-only" />
                <div className="border-2 border-gray-200 peer-checked:border-primary-500 peer-checked:bg-primary-50 rounded-xl p-3 text-center transition-all">
                  <span className="text-sm font-medium text-gray-700 peer-checked:text-primary-700">{cat.label}</span>
                </div>
              </label>
            ))}
          </div>
          {errors.category && <p className="text-red-500 text-xs mt-2">{errors.category.message}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">What Happened?</h3>
          <textarea {...register('description')} rows={5}
            placeholder="Describe in detail. E.g.: The seller asked me to send KES 5,000 first then disappeared..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">{description?.length || 0}/2000</span>
            <button type="button" onClick={analyzeWithAI}
              disabled={analyzing || (description?.length || 0) < 20}
              className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 disabled:opacity-40 font-medium">
              {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              Analyze with AI
            </button>
          </div>
          {aiAnalysis && (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                <Brain size={12} /> AI Analysis
              </p>
              <p className="text-xs text-purple-800">Pattern: <strong>{aiAnalysis.pattern}</strong></p>
              <p className="text-xs text-purple-800">Severity: <strong>{aiAnalysis.severity}</strong></p>
              <p className="text-xs text-purple-800">Risk Score: <strong>{aiAnalysis.riskScore}/100</strong></p>
              {aiAnalysis.isFakeReport && (
                <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ Report may be spam — add more details</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Link2 size={16} className="text-purple-600" />
            Link Other Identifiers (Optional)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Did this scammer use multiple phone numbers, till numbers, or TikTok handles?
            Add them here — they'll be grouped in the Scammer Graph so each one reveals the others.
          </p>

          {linkedIds.map((li, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select
                value={li.type}
                onChange={e => setLinkedIds(prev => prev.map((x, idx) => idx === i ? { ...x, type: e.target.value } : x))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-36"
              >
                {SEARCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                value={li.value}
                onChange={e => setLinkedIds(prev => prev.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))}
                placeholder="e.g. 0722000000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              <button type="button" onClick={() => setLinkedIds(prev => prev.filter((_, idx) => idx !== i))}
                className="p-2 text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          ))}

          <button type="button"
            onClick={() => setLinkedIds(prev => [...prev, { type: 'phone', value: '' }])}
            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium mt-1">
            <Plus size={12} /> Add another identifier
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex gap-3">
            <select {...register('currency')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24">
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="UGX">UGX</option>
            </select>
            <input {...register('amount_lost')} type="number" placeholder="e.g. 15000"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Evidence (Optional)</h3>
          <p className="text-xs text-gray-400 mb-3">Screenshots, receipts. Max 5 files, 10MB each.</p>
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
            <Upload size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click to upload files</p>
            <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="sr-only" />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-700 truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-500 text-xs ml-3">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting || !isAuthenticated}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors">
          {submitting ? <><Loader2 size={20} className="animate-spin" /> Submitting...</> : <><CheckCircle size={20} /> Submit Report</>}
        </button>
      </form>
    </div>
  );
};
