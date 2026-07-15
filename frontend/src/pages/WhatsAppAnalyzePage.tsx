import React, { useState } from 'react';
import { MessageCircle, Search, AlertTriangle, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { analyzeText, extractIdentifiers, getTrustLabel } from '../lib/aiEngine';
import { searchSellers } from '../lib/db';
import toast from 'react-hot-toast';

interface SellerResult {
  identifier: string;
  type: string;
  found: boolean;
  trustScore?: number;
  trustLabel?: string;
  totalReports?: number;
  sellerId?: string;
}

interface AnalysisResult {
  detectedPhones:   string[];
  detectedTills:    string[];
  detectedPaybills: string[];
  detectedTikToks:  string[];
  detectedAmount:   string | null;
  aiAnalysis:       ReturnType<typeof analyzeText>;
  sellerResults:    SellerResult[];
}

export const WhatsAppAnalyzePage: React.FC = () => {
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<AnalysisResult | null>(null);

  const analyze = async () => {
    if (!message.trim() || message.trim().length < 10) {
      toast.error('Please paste a seller message to analyze');
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      // 1. Browser AI — no backend
      const aiAnalysis = analyzeText(message);
      const ids        = extractIdentifiers(message);

      // 2. Check each detected identifier against Supabase directly
      const sellerResults: SellerResult[] = [];

      const checkOne = async (value: string, type: any, label: string, display: string) => {
        try {
          const res = await searchSellers(value, type);
          if (res.found && res.sellers.length > 0) {
            const s = res.sellers[0] as any;
            sellerResults.push({ identifier: display, type: label, found: true, trustScore: s.trust_score, trustLabel: getTrustLabel(s.trust_score), totalReports: s.total_reports, sellerId: s.id });
          } else {
            sellerResults.push({ identifier: display, type: label, found: false });
          }
        } catch {
          sellerResults.push({ identifier: display, type: label, found: false });
        }
      };

      for (const phone   of ids.phones)   await checkOne(phone,   'phone',       'Phone',   phone);
      for (const till    of ids.tills)    await checkOne(till,    'till_number', 'Till',    till);
      for (const paybill of ids.paybills) await checkOne(paybill, 'paybill',     'Paybill', paybill);
      for (const tiktok  of ids.tiktoks)  await checkOne(tiktok,  'tiktok',      'TikTok',  `@${tiktok}`);

      setResult({
        detectedPhones:   ids.phones,
        detectedTills:    ids.tills,
        detectedPaybills: ids.paybills,
        detectedTikToks:  ids.tiktoks,
        detectedAmount:   ids.amount,
        aiAnalysis,
        sellerResults,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyle = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return '🚨 HIGH RISK';
    if (score >= 40) return '⚠️ CAUTION';
    return '✅ APPEARS SAFE';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <MessageCircle size={32} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Analyzer</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Paste any seller message. The AI detects phone numbers, till numbers, TikTok handles
          and scam patterns — entirely in your browser. No data sent to any server.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Shield size={20} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">100% Private</p>
          <p className="text-sm text-green-700 mt-0.5">
            Analysis runs entirely in your browser. Your message is never sent to any external server or API.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Paste Seller Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
          placeholder={'Example:\n"Niambie utume KES 5,000 kwa hii namba 0712345678 kama deposit..."\n\nPaste any forwarded seller message here.'}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">{message.length} characters</span>
          <button onClick={analyze} disabled={loading || message.trim().length < 10}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Search size={16} /> Analyze Message</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-5">
          {/* Verdict */}
          <div className={`rounded-2xl border p-5 ${getRiskStyle(result.aiAnalysis.riskScore)}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-2xl font-extrabold">{getRiskLabel(result.aiAnalysis.riskScore)}</p>
                <p className="text-sm mt-1 opacity-80">AI Risk Score: {result.aiAnalysis.riskScore}/100</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{result.aiAnalysis.pattern}</p>
                <p className="text-sm capitalize opacity-80">Severity: {result.aiAnalysis.severity}</p>
              </div>
            </div>
          </div>

          {/* Detected identifiers */}
          {(result.detectedPhones.length > 0 || result.detectedTills.length > 0 || result.detectedPaybills.length > 0 || result.detectedTikToks.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">Detected Identifiers</h3>
              <div className="space-y-2">
                {result.detectedPhones.map(p => <div key={p} className="flex items-center gap-2 text-sm"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Phone</span><span className="font-mono">{p}</span></div>)}
                {result.detectedTills.map(t => <div key={t} className="flex items-center gap-2 text-sm"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">Till</span><span className="font-mono">{t}</span></div>)}
                {result.detectedPaybills.map(p => <div key={p} className="flex items-center gap-2 text-sm"><span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Paybill</span><span className="font-mono">{p}</span></div>)}
                {result.detectedTikToks.map(t => <div key={t} className="flex items-center gap-2 text-sm"><span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-xs font-medium">TikTok</span><span className="font-mono">@{t}</span></div>)}
                {result.detectedAmount && <div className="flex items-center gap-2 text-sm"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Amount</span><span className="font-medium text-red-600">KES {parseInt(result.detectedAmount).toLocaleString()}</span></div>}
              </div>
            </div>
          )}

          {/* DB check */}
          {result.sellerResults.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={16} className="text-primary-500" /> ScamChek Database Check
              </h3>
              <div className="space-y-3">
                {result.sellerResults.map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-xl">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">{s.type}</span>
                        <span className="font-mono text-sm font-medium">{s.identifier}</span>
                      </div>
                      {s.found ? (
                        <div>
                          <p className={`font-bold ${s.trustScore! < 31 ? 'text-red-600' : s.trustScore! >= 86 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {s.trustLabel} ({s.trustScore}/100)
                          </p>
                          <p className="text-xs text-gray-500">{s.totalReports} report(s)</p>
                          {s.sellerId && <a href={`/seller/${s.sellerId}`} className="text-xs text-primary-600 hover:underline">View profile →</a>}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not found in database</p>
                      )}
                    </div>
                    <div>
                      {s.found ? (s.trustScore! < 31 ? <AlertTriangle size={20} className="text-red-500" /> : <CheckCircle size={20} className="text-green-500" />) : <Search size={20} className="text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <a href="/report" className="bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-medium text-sm flex items-center gap-2">
              <AlertTriangle size={14} /> Report This Scam
            </a>
            <button onClick={() => { setMessage(''); setResult(null); }}
              className="border border-gray-300 text-gray-600 px-5 py-2 rounded-xl hover:bg-gray-50 font-medium text-sm">
              Analyze Another Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
