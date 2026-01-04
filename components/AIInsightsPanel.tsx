
import React, { useState, useEffect } from 'react';
import { getCommunityInsights } from '../services/geminiService';
import { Community, AIInsight } from '../types';

interface Props {
  selectedCommunity: Community | null;
}

const AIInsightsPanel: React.FC<Props> = ({ selectedCommunity }) => {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCommunity) {
      setLoading(true);
      // Simulate some community data for Gemini to analyze
      const mockActivity = [
        "High engagement on latest announcement",
        "Member growth up 12% this week",
        "Multiple reports of off-topic spam in #general",
        "Successful AMA session hosted yesterday"
      ];

      getCommunityInsights(selectedCommunity.name, mockActivity).then(res => {
        setInsight(res);
        setLoading(false);
      });
    }
  }, [selectedCommunity]);

  const handleExport = () => {
    console.log(`[ACTION] Exporting Intelligence Report for: ${selectedCommunity?.name}`);
    alert(`Intelligence report for ${selectedCommunity?.name} has been encrypted and prepared for export.`);
  };

  if (!selectedCommunity) {
    return (
      <div className="w-full bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">✨</div>
        <h3 className="text-lg font-bold text-zinc-200">AI Intelligence</h3>
        <p className="text-zinc-500 text-sm max-w-[200px]">Select a community to view intelligent management insights.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-indigo-400">✨</span> Gemini Insights
        </h3>
        {loading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-zinc-800 rounded-xl w-full" />
          <div className="h-4 bg-zinc-800 rounded w-1/2" />
          <div className="h-4 bg-zinc-800 rounded w-2/3" />
        </div>
      ) : insight ? (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border ${
            insight.sentiment === 'positive' ? 'bg-emerald-500/5 border-emerald-500/20' : 
            insight.sentiment === 'cautionary' ? 'bg-rose-500/5 border-rose-500/20' : 
            'bg-zinc-800/50 border-zinc-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                insight.sentiment === 'positive' ? 'text-emerald-400' : 
                insight.sentiment === 'cautionary' ? 'text-rose-400' : 'text-zinc-400'
              }`}>
                {insight.sentiment}
              </span>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {insight.summary}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Strategic Recommendations</h4>
            <ul className="space-y-2">
              {insight.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-400 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={handleExport}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20"
          >
            Export Intelligence Report
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default AIInsightsPanel;
