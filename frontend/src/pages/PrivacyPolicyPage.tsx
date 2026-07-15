import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-gray-900 mb-3 border-l-4 border-primary-500 pl-4">{title}</h2>
    <div className="text-gray-600 text-sm leading-relaxed space-y-3">{children}</div>
  </div>
);

export const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = 'July 8, 2026';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-full mb-4">
          <Shield size={28} className="text-primary-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm">Last updated: {lastUpdated}</p>
        <p className="text-gray-500 text-sm mt-1">ScamChek Kenya · scamchek.co.ke</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
        <strong>Summary:</strong> ScamChek collects only what is necessary to protect the community from scammers, fake accounts, and online fraud. 
        We do not sell your data, we do not share it with advertisers, and you can request deletion at any time.
      </div>

      <Section title="1. Who We Are">
        <p>
          ScamChek is a community-driven scam and seller verification platform based in Kenya. 
          Our purpose is to help Kenyans verify sellers — including their phone numbers, M-Pesa 
          till/paybill numbers, TikTok handles, and business names — before making payments.
        </p>
        <p>
          For privacy questions, contact us at: <strong>privacy@scamchek.co.ke</strong>
        </p>
      </Section>

      <Section title="2. What Data We Collect">
        <p><strong>When you register an account:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Name and email address</li>
          <li>Phone number (optional)</li>
          <li>Password (stored as a secure hash — never in plain text)</li>
        </ul>

        <p><strong>When you submit a scam report:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Description of the incident</li>
          <li>Report category (e.g. fake product, no delivery)</li>
          <li>Amount lost (optional)</li>
          <li>Evidence files you upload (screenshots, receipts)</li>
          <li>Seller identifiers mentioned (phone, till, TikTok handle, etc.)</li>
        </ul>

        <p><strong>When you search:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>The search term and type (e.g. phone number search)</li>
          <li>Whether a result was found</li>
          <li>Your user ID if logged in, or anonymous if not</li>
        </ul>

        <p><strong>Automatically collected:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>IP address (for abuse prevention and watchlist flagging)</li>
          <li>Browser session data managed by Supabase Auth</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>To verify sellers</strong> — Search history and reports power the trust score system that protects other users.</li>
          <li><strong>To detect scam patterns</strong> — Our AI engine analyzes report descriptions in your browser. No text is sent to external AI services.</li>
          <li><strong>To prevent abuse</strong> — We track zero-match searches to identify potential scam advertisement campaigns (Watchlist feature).</li>
          <li><strong>To weight reports fairly</strong> — Your report approval history affects how much your future reports influence trust scores, preventing malicious "review bombing".</li>
          <li><strong>To send notifications</strong> — If you enable push notifications, we send alerts when your reports are reviewed or when a seller you searched gets new reports.</li>
        </ul>
        <p>We do <strong>not</strong> use your data for advertising, profiling, or sale to third parties.</p>      </Section>

      <Section title="4. Data Storage & Security">
        <p>
          All data is stored in <strong>Supabase</strong>, a secure PostgreSQL database hosted on AWS infrastructure. 
          Your data is protected by:
        </p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Row Level Security (RLS) — you can only read your own reports and profile</li>
          <li>Encrypted connections (HTTPS/TLS) for all data in transit</li>
          <li>Passwords hashed using bcrypt — never stored in plain text</li>
          <li>Authentication managed by Supabase Auth with secure JWT tokens</li>
        </ul>
        <p>
          Evidence files (screenshots, receipts) are stored in Supabase Storage with access 
          restricted to the report owner and administrators.
        </p>
      </Section>

      <Section title="5. Data Sharing">
        <p>We share data only in these limited circumstances:</p>
        <ul className="list-disc ml-5 space-y-2">
          <li>
            <strong>Publicly visible:</strong> Seller trust scores, total report counts, 
            and complaint categories are visible to all users and anonymous visitors. 
            Individual reporter names and personal details are never shown publicly.
          </li>
          <li>
            <strong>Administrators:</strong> ScamChek admins can view reports to review 
            and approve them. They cannot see your password.
          </li>
          <li>
            <strong>Legal requirements:</strong> We may disclose data if required by Kenyan 
            law or court order.
          </li>
        </ul>
        <p>We do <strong>not</strong> sell, rent, or share your personal data with advertisers or data brokers.</p>
      </Section>

      <Section title="6. Cookies & Tracking">
        <p>
          ScamChek does not use advertising cookies or third-party tracking scripts. 
          We use browser <strong>localStorage</strong> only to maintain your login session 
          (storing your authentication token). No cross-site tracking occurs.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>As a user, you have the right to:</p>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Access</strong> — Request a copy of all data we hold about you</li>
          <li><strong>Correction</strong> — Update your name, phone, or email in your dashboard</li>
          <li><strong>Deletion</strong> — Request full account and data deletion by emailing <strong>privacy@scamchek.co.ke</strong></li>
          <li><strong>Withdraw consent</strong> — You can disable push notifications at any time in your browser settings</li>
          <li><strong>Object</strong> — You can object to your reports being used in the trust scoring system by contacting us</li>
        </ul>
        <p>We will respond to requests within <strong>14 days</strong>.</p>
      </Section>

      <Section title="8. Data Retention">
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of an account deletion request.</li>
          <li><strong>Approved reports:</strong> Retained indefinitely as part of the community scam record. Anonymized versions may be kept after account deletion.</li>
          <li><strong>Search history:</strong> Retained for 90 days, then deleted.</li>
          <li><strong>Evidence files:</strong> Retained for the lifetime of the associated report.</li>
        </ul>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          ScamChek is not intended for users under the age of 18. We do not knowingly collect 
          personal data from children. If you believe a child has submitted data, please contact 
          us at <strong>privacy@scamchek.co.ke</strong> for immediate removal.
        </p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy when we add new features or in response to legal 
          requirements. Changes will be posted on this page with an updated date. Continued 
          use of ScamChek after changes constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>For any privacy concerns or data requests:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Email: <strong>privacy@scamchek.co.ke</strong></li>
          <li>Platform: <Link to="/report" className="text-primary-600 hover:underline">Submit a request via the Report page</Link></li>
        </ul>
      </Section>

      <div className="border-t border-gray-200 pt-8 mt-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} ScamChek Kenya. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link to="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <Link to="/search" className="hover:text-gray-600 transition-colors">Search</Link>
          <Link to="/report" className="hover:text-gray-600 transition-colors">Report Scam</Link>
        </div>
      </div>
    </div>
  );
};
