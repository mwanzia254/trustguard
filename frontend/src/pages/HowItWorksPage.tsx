import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Shield,
  AlertTriangle,
  BarChart2,
  GitMerge,
  Eye,
  Cpu,
  Users,
  CheckCircle,
  Star,
  Flag,
  Phone,
  Hash,
  AtSign,
  Building2,
  ChevronRight,
} from 'lucide-react';

/* ─── small helpers ─────────────────────────────────────────── */

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="text-center mb-10">
    <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-4">
      {icon}
    </div>
    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">{subtitle}</p>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

/* ─── trust band row ─────────────────────────────────────────── */

interface BandProps {
  range: string;
  label: string;
  color: string;
  bg: string;
  desc: string;
}

const TrustBand: React.FC<BandProps> = ({ range, label, color, bg, desc }) => (
  <div className={`flex items-start gap-4 rounded-xl p-4 ${bg}`}>
    <div className={`shrink-0 w-16 text-center`}>
      <span className={`text-xs font-black ${color}`}>{range}</span>
      <p className={`text-[11px] font-bold mt-0.5 ${color} uppercase tracking-wide`}>{label}</p>
    </div>
    <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
  </div>
);

/* ─── main page ─────────────────────────────────────────────── */

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white py-16 sm:py-20 px-4 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-5">
            <div className="relative bg-white/10 rounded-full p-4 backdrop-blur-sm">
              <Shield size={44} style={{ color: '#c8956c' }} />
              <span className="absolute bottom-3 right-3 bg-white/20 rounded-full p-0.5">
                <Search size={16} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </div>
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-blue-300 mb-3">
            Trust · Verify · Report
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
            How <span style={{ color: '#c8956c' }}>ScamChek</span> Works
          </h1>
          <p className="text-blue-200 text-sm sm:text-base max-w-xl mx-auto mb-8">
            A transparent look at the technology, scoring system, and community network that
            protects Kenyans from online scams every day.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {[
              'Search & Verify',
              'Trust Score',
              'Report a Scam',
              'Scammer Graph',
              'Watchlist',
              'AI Engine',
              'Community Roles',
            ].map((s) => (
              <span
                key={s}
                className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-blue-100"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-20">

        {/* ── Section 1: Search & Verify ── */}
        <section id="search">
          <SectionTitle
            icon={<Search size={28} className="text-primary-600" />}
            title="1. Search & Verify"
            subtitle="Before you send money to a stranger, search their identifier. It takes seconds."
          />
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: <Phone size={20} className="text-blue-600" />, label: 'Phone Number', desc: 'The most common scammer identifier. Paste any Kenyan phone number to see their trust score and all linked reports instantly.' },
              { icon: <Hash size={20} className="text-green-600" />, label: 'M-Pesa Till Number', desc: 'Verify an M-Pesa till before buying from an online shop. Till numbers are permanent and hard to fake.' },
              { icon: <Hash size={20} className="text-purple-600" />, label: 'Paybill Number', desc: 'Check a paybill to confirm it belongs to a legitimate business before paying invoices or buying goods.' },
              { icon: <AtSign size={20} className="text-pink-600" />, label: 'TikTok Handle', desc: 'Scammers using TikTok LIVE to sell fake goods are searchable by their @handle. We index their account history.' },
              { icon: <Building2 size={20} className="text-orange-600" />, label: 'Business Name', desc: 'Search a business name to see if it has linked complaints, scam reports, or a verified registration.' },
              { icon: <AtSign size={20} className="text-gray-600" />, label: 'Social Media', desc: 'Facebook pages, Instagram accounts, and Twitter/X handles — if it\'s been reported, it\'s searchable.' },
            ].map(({ icon, label, desc }) => (
              <Card key={label} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <p className="font-bold text-gray-800 mb-1 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </Card>
            ))}
          </div>
          <Card className="bg-primary-50 border-primary-100 text-center">
            <p className="text-sm text-primary-800">
              Search is <strong>100% free</strong> and available without an account. No login required to
              check a seller — we want verification to have zero friction.
            </p>
          </Card>
        </section>

        {/* ── Section 2: Trust Score ── */}
        <section id="trust-score">
          <SectionTitle
            icon={<BarChart2 size={28} className="text-yellow-500" />}
            title="2. Trust Score System"
            subtitle="Every seller gets a score from 0 to 100 — calculated automatically from community data."
          />

          <Card className="mb-6">
            <h3 className="font-bold text-gray-800 mb-4">The Four Trust Bands</h3>
            <div className="space-y-3">
              <TrustBand
                range="86–100"
                label="TRUSTED"
                color="text-green-700"
                bg="bg-green-50"
                desc="This seller has a strong positive history. Many verified reviews, no accepted scam reports, and a long active account. Safe to transact with."
              />
              <TrustBand
                range="61–85"
                label="GOOD"
                color="text-blue-700"
                bg="bg-blue-50"
                desc="Mostly positive signals with few or no red flags. This seller appears reliable but hasn't yet accumulated enough history for a TRUSTED rating."
              />
              <TrustBand
                range="31–60"
                label="CAUTION"
                color="text-yellow-700"
                bg="bg-yellow-50"
                desc="Mixed signals — there may be unresolved complaints or a low volume of positive reviews. Proceed carefully and verify before payment."
              />
              <TrustBand
                range="0–30"
                label="HIGH RISK"
                color="text-red-700"
                bg="bg-red-50"
                desc="Multiple accepted scam reports or verified fraud. This seller has been flagged by the community as dangerous. Do not transact."
              />
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-gray-800 mb-4">How the Score Is Calculated</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Scam Reports', weight: '40%', desc: 'Each accepted report reduces the score. Contributor reports carry more weight than new-user reports.', color: 'bg-red-100 text-red-700' },
                { label: 'Positive Reviews', weight: '25%', desc: 'Verified buyers can leave positive reviews that raise the score. Anonymous reviews are weighted lower.', color: 'bg-green-100 text-green-700' },
                { label: 'Account Age', weight: '20%', desc: 'Older, consistently clean profiles score higher. Newly registered identifiers start at a neutral 50.', color: 'bg-blue-100 text-blue-700' },
                { label: 'Verification Status', weight: '15%', desc: 'Sellers who complete identity or business verification receive a bonus that boosts their score ceiling.', color: 'bg-purple-100 text-purple-700' },
              ].map(({ label, weight, desc, color }) => (
                <div key={label} className="flex gap-3">
                  <span className={`shrink-0 text-xs font-black px-2 py-1 rounded-lg h-fit ${color}`}>
                    {weight}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Section 3: Report a Scam ── */}
        <section id="report">
          <SectionTitle
            icon={<Flag size={28} className="text-red-500" />}
            title="3. Report a Scam"
            subtitle="Submitting a report is how the community grows stronger. Your report protects the next person."
          />
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { step: '1', title: 'Fill the Form', desc: 'Enter the scammer\'s identifier (phone, till, handle), choose a category, describe what happened, and include the amount lost if any.' },
              { step: '2', title: 'Upload Evidence', desc: 'Attach screenshots, M-Pesa receipts, or chat exports. Evidence is stored securely and shared only with admins during review.' },
              { step: '3', title: 'AI Pre-screening', desc: 'Our browser-based NLP engine pre-screens your report for authenticity — checking language patterns and cross-referencing known scam signatures before it reaches an admin.' },
            ].map(({ step, title, desc }) => (
              <Card key={step} className="text-center">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="font-extrabold text-primary-700">{step}</span>
                </div>
                <p className="font-bold text-gray-800 mb-2 text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
          <Card className="bg-amber-50 border-amber-100">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Reports go through an admin review before they affect a seller's trust score. This prevents
                false reports and "review bombing" by bad actors. Your identity is never revealed to the
                person you reported.
              </p>
            </div>
          </Card>
        </section>

        {/* ── Section 4: Scammer Graph ── */}
        <section id="scammer-graph">
          <SectionTitle
            icon={<GitMerge size={28} className="text-purple-600" />}
            title="4. Scammer Graph"
            subtitle="Scammers use many identifiers. ScamChek links them all together automatically."
          />
          <Card className="mb-6">
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              When a scam report mentions multiple identifiers — for example, a phone number and a TikTok
              handle — ScamChek creates a <strong>link</strong> between those two identifiers in a graph
              database. This means that searching for one will surface the others.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center text-sm font-medium">
              {[
                { label: '0712 345 678', icon: <Phone size={14} /> },
                { label: 'Till 123456', icon: <Hash size={14} /> },
                { label: '@fakeshop_ke', icon: <AtSign size={14} /> },
              ].map(({ label, icon }, i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2 bg-primary-50 text-primary-800 px-4 py-2 rounded-xl border border-primary-100">
                    {icon} {label}
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight size={16} className="text-gray-400 rotate-90 sm:rotate-0 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mt-4">
              Search any one identifier and the connected profile shows all linked identifiers.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Why This Matters</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Scammers frequently switch phone numbers or create new social media accounts after being
              reported. The Scammer Graph defeats this by ensuring that a new identifier connected to a
              known scammer immediately inherits the risk signal — even before new reports come in.
            </p>
          </Card>
        </section>

        {/* ── Section 5: Watchlist ── */}
        <section id="watchlist">
          <SectionTitle
            icon={<Eye size={28} className="text-orange-500" />}
            title="5. Watchlist"
            subtitle="We catch scammers who haven't been reported yet — by watching search patterns."
          />
          <Card className="mb-4">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              When someone searches for a seller that has <strong>no existing record</strong> in
              ScamChek, we log that as a "zero-match search." A single zero-match search is normal —
              someone is just checking a legitimate seller who isn't on our platform yet.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              But when the <strong>same unknown identifier</strong> is searched by many different users
              in a short window — especially from different locations — that is a red flag. It often
              means a scammer is actively advertising and victims are trying to verify them before
              paying. ScamChek automatically flags these identifiers on the Watchlist.
            </p>
          </Card>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: <Search size={20} className="text-blue-500" />, label: 'High Volume', desc: '10+ unique users search the same unknown identifier within 48 hours.' },
              { icon: <AlertTriangle size={20} className="text-yellow-500" />, label: 'Auto-Flag', desc: 'The identifier is automatically added to the public Watchlist with a "Trending" badge.' },
              { icon: <Eye size={20} className="text-orange-500" />, label: 'Community Alert', desc: 'Users who searched that identifier are notified: "This seller is now on the Watchlist."' },
            ].map(({ icon, label, desc }) => (
              <Card key={label} className="text-center">
                <div className="flex justify-center mb-3">{icon}</div>
                <p className="font-bold text-gray-800 mb-1 text-sm">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Section 6: AI Engine ── */}
        <section id="ai-engine">
          <SectionTitle
            icon={<Cpu size={28} className="text-indigo-600" />}
            title="6. AI Engine"
            subtitle="Privacy-first NLP that runs entirely in your browser — no data leaves your device."
          />
          <Card className="mb-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'Browser-Based NLP',
                  desc: 'When you submit a report, a lightweight natural language processing model runs locally in your browser to pre-screen the text. Your report description is never sent to an external AI API.',
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50',
                },
                {
                  title: 'Scam Pattern Detection',
                  desc: 'The model is trained on real Kenyan scam patterns — fake delivery services, "I\'ll pay you back" loops, investment scams, and fake M-Pesa confirmations. It flags common signatures automatically.',
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                },
                {
                  title: 'Fake Report Detection',
                  desc: 'The AI also checks if a report looks like it was submitted in bad faith — e.g., a competitor trying to tank a rival\'s score. Suspicious reports are flagged for priority admin review.',
                  color: 'text-red-600',
                  bg: 'bg-red-50',
                },
                {
                  title: 'WhatsApp Analysis',
                  desc: 'Paste a WhatsApp conversation export into our analyzer and the AI will flag manipulative phrases, urgency tactics, and known scam scripts — in both English and Swahili.',
                  color: 'text-green-600',
                  bg: 'bg-green-50',
                },
              ].map(({ title, desc, color, bg }) => (
                <div key={title} className={`rounded-xl p-4 ${bg}`}>
                  <p className={`font-bold text-sm mb-1 ${color}`}>{title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="bg-indigo-50 border-indigo-100 text-center">
            <p className="text-sm text-indigo-800">
              <strong>Zero cloud AI calls.</strong> All NLP inference runs in WebAssembly inside your
              browser tab. ScamChek never transmits your report text to OpenAI, Google, or any other
              external service.
            </p>
          </Card>
        </section>

        {/* ── Section 7: Community Trust Network ── */}
        <section id="community">
          <SectionTitle
            icon={<Users size={28} className="text-green-600" />}
            title="7. Community Trust Network"
            subtitle="Not all reports are equal. A trusted contributor's report carries more weight than a brand-new account."
          />
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                role: 'User',
                icon: <Users size={22} className="text-gray-500" />,
                bg: 'bg-gray-50 border-gray-200',
                labelColor: 'text-gray-700 bg-gray-100',
                perks: [
                  'Search any seller for free',
                  'Submit scam reports',
                  'Leave reviews',
                  'Access your personal dashboard',
                ],
                weight: '1× report weight',
              },
              {
                role: 'Contributor',
                icon: <Star size={22} className="text-yellow-500" />,
                bg: 'bg-yellow-50 border-yellow-200',
                labelColor: 'text-yellow-800 bg-yellow-100',
                perks: [
                  'All User permissions',
                  'Reports carry 2× more weight on trust scores',
                  'Earned by submitting 5+ approved reports',
                  'Contributor badge shown on profile',
                ],
                weight: '2× report weight',
              },
              {
                role: 'Admin',
                icon: <Shield size={22} className="text-primary-600" />,
                bg: 'bg-primary-50 border-primary-200',
                labelColor: 'text-primary-800 bg-primary-100',
                perks: [
                  'Review and approve/reject reports',
                  'Verify seller identities',
                  'Manage watchlist flags',
                  'Access full admin dashboard',
                ],
                weight: 'Full moderation access',
              },
            ].map(({ role, icon, bg, labelColor, perks, weight }) => (
              <Card key={role} className={`${bg} flex flex-col`}>
                <div className="flex items-center gap-3 mb-4">
                  {icon}
                  <div>
                    <p className="font-extrabold text-gray-900">{role}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${labelColor}`}>
                      {weight}
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {perks.map((p) => (
                    <li key={p} className="flex gap-2 text-xs text-gray-600">
                      <CheckCircle size={13} className="text-green-500 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <Card className="bg-green-50 border-green-100">
            <p className="text-sm text-green-800 text-center">
              The contributor system prevents "report flooding" by anonymous throwaway accounts.
              Because contributor status must be <strong>earned</strong> through approved reports,
              it is hard to manipulate the trust score of a legitimate seller.
            </p>
          </Card>
        </section>

        {/* ── CTA ── */}
        <section className="text-center py-6">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Ready to check a seller?</h2>
          <p className="text-gray-500 mb-6 text-sm">Free, instant, no account required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Search size={18} />
              Search a Seller
            </Link>
            <Link
              to="/report"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-red-200 text-red-700 font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Flag size={18} />
              Report a Scam
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};
