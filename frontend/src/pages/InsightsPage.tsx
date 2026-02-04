/**
 * ORBIT Insights Page
 * 
 * Shows insights about user's cognitive patterns.
 * Philosophy: Insights should be actionable, not just interesting.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Target, 
  Brain,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

interface Insight {
  id: string;
  type: 'pattern' | 'suggestion' | 'warning' | 'achievement';
  title: string;
  description: string;
  confidence: number;
  actionable?: string;
  createdAt: string;
}

interface ProfileStats {
  focusDuration: number;
  productivityPeakHour: number;
  completionRate: number;
  activeStreak: number;
  topCategory: string;
}

export function InsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const [insightsRes, statsRes] = await Promise.all([
        api.get<{ insights: Insight[] }>('/orbit/insights'),
        api.get<ProfileStats>('/evaluator/profile-stats')
      ]);
      
      setInsights(insightsRes.data.insights || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    try {
      await api.post('/orbit/learn');
      await loadInsights();
    } finally {
      setRefreshing(false);
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'pattern': return <Brain className="w-5 h-5" />;
      case 'suggestion': return <Sparkles className="w-5 h-5" />;
      case 'warning': return <Clock className="w-5 h-5" />;
      case 'achievement': return <Target className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'pattern': return 'text-blue-400 bg-blue-500/10';
      case 'suggestion': return 'text-purple-400 bg-purple-500/10';
      case 'warning': return 'text-amber-400 bg-amber-500/10';
      case 'achievement': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-orbit-void p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Canvas</span>
          </button>

          <button
            onClick={refreshInsights}
            disabled={refreshing}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-white/5 hover:bg-white/10 transition-colors
              ${refreshing ? 'opacity-50' : ''}
            `}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <h1 className="text-2xl font-light text-white mb-2">
          Cognitive Insights
        </h1>
        <p className="text-white/50 mb-8">
          Patterns and suggestions based on your behavior
        </p>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Focus Duration"
              value={`${stats.focusDuration} min`}
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard
              label="Peak Hour"
              value={`${stats.productivityPeakHour}:00`}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              label="Completion Rate"
              value={`${Math.round(stats.completionRate * 100)}%`}
              icon={<Target className="w-5 h-5" />}
            />
            <StatCard
              label="Active Streak"
              value={`${stats.activeStreak} days`}
              icon={<Sparkles className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Insights List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-24 rounded-xl bg-white/5 animate-pulse"
                />
              ))
            ) : insights.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Brain className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">
                  No insights yet. Keep using ORBIT to generate patterns.
                </p>
              </motion.div>
            ) : (
              insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass p-5 rounded-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getInsightColor(insight.type)}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-white">
                          {insight.title}
                        </h3>
                        <span className="text-xs text-white/30">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      <p className="text-white/60 text-sm mb-3">
                        {insight.description}
                      </p>
                      
                      {insight.actionable && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-indigo-400">💡 Suggestion:</span>
                          <span className="text-white/70">{insight.actionable}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Philosophy Note */}
        <div className="mt-12 text-center text-white/30 text-sm">
          <p>
            These insights are generated from your behavior patterns.
            <br />
            ORBIT learns passively — you don't need to do anything special.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string; 
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass p-4 rounded-xl"
    >
      <div className="flex items-center gap-2 text-white/40 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-light text-white">
        {value}
      </div>
    </motion.div>
  );
}

export default InsightsPage;
