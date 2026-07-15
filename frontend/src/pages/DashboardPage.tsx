import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyReports } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { TrustBadge } from '../components/ui/TrustBadge';
import { Shield, Search, AlertTriangle, Clock, Star } from 'lucide-react';
import { formatDate, formatCurrency } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['my-reports', user?.id],
    queryFn:  () => getMyReports(user!.id),
    enabled:  !!user?.id,
  });

  const statusColor = (status: string) => {
    if (status === 'approved')    return 'text-green-600 bg-green-50';
    if (status === 'rejected')    return 'text-red-600 bg-red-50';
    if (status === 'investigating') return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} />
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-blue-100 text-sm capitalize">
              Role: {user?.role} {user?.is_verified && '• Verified ✓'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link to="/search" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Search size={14} /> Search Seller
          </Link>
          <Link to="/report" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <AlertTriangle size={14} /> Report Scam
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Reports Submitted', value: reports.length,                                                  icon: AlertTriangle, color: 'text-red-500'    },
          { label: 'Approved',          value: reports.filter((r: any) => r.status === 'approved').length,      icon: Shield,       color: 'text-green-500'  },
          { label: 'Pending Review',    value: reports.filter((r: any) => r.status === 'pending').length,       icon: Clock,        color: 'text-yellow-500' },
          { label: 'Role',              value: user?.role?.toUpperCase() || 'USER',                             icon: Star,         color: 'text-blue-500'   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <Icon size={22} className={`${color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Reports list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">My Reports</h2>
          <Link to="/report" className="text-primary-600 text-sm font-medium hover:underline">+ New Report</Link>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">You haven't submitted any reports yet.</p>
            <Link to="/report" className="mt-4 inline-block text-primary-600 font-medium hover:underline">
              Submit your first report
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div key={report.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800 truncate">
                        {report.business_name || report.phone_number || 'Unknown Seller'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{report.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="capitalize">{report.category?.replace(/_/g, ' ')}</span>
                      {report.amount_lost && (
                        <span className="text-red-500">Lost: {formatCurrency(report.amount_lost, report.currency)}</span>
                      )}
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                    {report.ai_risk_score && (
                      <div className="mt-2 text-xs text-purple-600">
                        AI Risk: {report.ai_risk_score}/100 · {report.ai_pattern}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
