import React from 'react';
import { getTrustLabel } from '../../lib/utils';

interface TrustMeterProps {
  score: number;
}

export const TrustMeter: React.FC<TrustMeterProps> = ({ score }) => {
  const getBarColor = () => {
    if (score >= 86) return 'bg-green-500';
    if (score >= 61) return 'bg-blue-500';
    if (score >= 31) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (score >= 86) return 'text-green-700';
    if (score >= 61) return 'text-blue-700';
    if (score >= 31) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">Trust Score</span>
        <span className={`text-2xl font-bold ${getTextColor()}`}>{score}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-700 ${getBarColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0 — HIGH RISK</span>
        <span>CAUTION — 60</span>
        <span>100 — TRUSTED</span>
      </div>
      <p className={`text-center mt-2 font-semibold text-lg ${getTextColor()}`}>
        {getTrustLabel(score)}
      </p>
    </div>
  );
};
