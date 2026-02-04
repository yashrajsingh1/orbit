/**
 * ORBIT Settings Page
 * 
 * User preferences and notification settings.
 * Philosophy: Settings should be minimal but impactful.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX,
  Save,
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

interface Settings {
  // Notification preferences
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  allowInsights: boolean;
  allowReminders: boolean;
  allowCelebrations: boolean;
  urgentOnlyDuringFocus: boolean;
  
  // Voice preferences
  voiceEnabled: boolean;
  voiceSpeed: number;
  
  // Display preferences
  reducedMotion: boolean;
  compactMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  quietHoursStart: 22,
  quietHoursEnd: 7,
  allowInsights: true,
  allowReminders: true,
  allowCelebrations: true,
  urgentOnlyDuringFocus: true,
  voiceEnabled: true,
  voiceSpeed: 1.0,
  reducedMotion: false,
  compactMode: false,
};

export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  interface NotificationPreferences {
    quiet_hours_start: number | null;
    quiet_hours_end: number | null;
    allow_insights: boolean;
    allow_reminders: boolean;
    allow_celebrations: boolean;
    urgent_only_during_focus: boolean;
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<NotificationPreferences>('/notifications/preferences');
      setSettings(prev => ({
        ...prev,
        quietHoursStart: response.data.quiet_hours_start,
        quietHoursEnd: response.data.quiet_hours_end,
        allowInsights: response.data.allow_insights,
        allowReminders: response.data.allow_reminders,
        allowCelebrations: response.data.allow_celebrations,
        urgentOnlyDuringFocus: response.data.urgent_only_during_focus,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', {
        quiet_hours_start: settings.quietHoursStart,
        quiet_hours_end: settings.quietHoursEnd,
        allow_insights: settings.allowInsights,
        allow_reminders: settings.allowReminders,
        allow_celebrations: settings.allowCelebrations,
        urgent_only_during_focus: settings.urgentOnlyDuringFocus,
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orbit-void flex items-center justify-center">
        <Loader className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orbit-void p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
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
            onClick={saveSettings}
            disabled={saving}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all
              ${saved 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
              }
            `}
          >
            {saving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>✓ Saved</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>

        <h1 className="text-2xl font-light text-white mb-2">Settings</h1>
        <p className="text-white/50 mb-8">
          Customize how ORBIT works for you
        </p>

        {/* Notification Settings */}
        <Section title="Notifications" icon={<Bell className="w-5 h-5" />}>
          <ToggleSetting
            label="Allow insights"
            description="Receive insights about your patterns"
            value={settings.allowInsights}
            onChange={(v) => updateSetting('allowInsights', v)}
          />
          
          <ToggleSetting
            label="Allow reminders"
            description="Gentle reminders for pending tasks"
            value={settings.allowReminders}
            onChange={(v) => updateSetting('allowReminders', v)}
          />
          
          <ToggleSetting
            label="Allow celebrations"
            description="Brief acknowledgment when you complete tasks"
            value={settings.allowCelebrations}
            onChange={(v) => updateSetting('allowCelebrations', v)}
          />
          
          <ToggleSetting
            label="Urgent only during focus"
            description="Only urgent notifications break focus mode"
            value={settings.urgentOnlyDuringFocus}
            onChange={(v) => updateSetting('urgentOnlyDuringFocus', v)}
          />
        </Section>

        {/* Quiet Hours */}
        <Section title="Quiet Hours" icon={<Moon className="w-5 h-5" />}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-white/60 text-sm">Start</label>
              <select
                value={settings.quietHoursStart ?? ''}
                onChange={(e) => updateSetting('quietHoursStart', 
                  e.target.value ? parseInt(e.target.value) : null
                )}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Disabled</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-white/30 pt-6">to</div>
            
            <div className="flex-1">
              <label className="text-white/60 text-sm">End</label>
              <select
                value={settings.quietHoursEnd ?? ''}
                onChange={(e) => updateSetting('quietHoursEnd', 
                  e.target.value ? parseInt(e.target.value) : null
                )}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Disabled</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <p className="text-white/40 text-sm mt-3">
            During quiet hours, only urgent notifications will be delivered.
          </p>
        </Section>

        {/* Voice Settings */}
        <Section title="Voice" icon={settings.voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}>
          <ToggleSetting
            label="Enable voice"
            description="Use voice input and spoken responses"
            value={settings.voiceEnabled}
            onChange={(v) => updateSetting('voiceEnabled', v)}
          />
          
          {settings.voiceEnabled && (
            <div className="mt-4">
              <label className="text-white/60 text-sm">Speech speed</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.voiceSpeed}
                  onChange={(e) => updateSetting('voiceSpeed', parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-white/70 w-12 text-right">
                  {settings.voiceSpeed.toFixed(1)}x
                </span>
              </div>
            </div>
          )}
        </Section>

        {/* Display Settings */}
        <Section title="Display" icon={<Sun className="w-5 h-5" />}>
          <ToggleSetting
            label="Reduced motion"
            description="Minimize animations for accessibility"
            value={settings.reducedMotion}
            onChange={(v) => updateSetting('reducedMotion', v)}
          />
          
          <ToggleSetting
            label="Compact mode"
            description="Denser layout for smaller screens"
            value={settings.compactMode}
            onChange={(v) => updateSetting('compactMode', v)}
          />
        </Section>

        {/* Philosophy Note */}
        <div className="mt-12 text-center text-white/30 text-sm">
          <p>
            ORBIT is designed to respect your attention.
            <br />
            These settings help us help you better.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ 
  title, 
  icon, 
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-xl mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-indigo-400">{icon}</div>
        <h2 className="text-lg font-medium text-white">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white">{label}</div>
        <div className="text-white/40 text-sm">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${value ? 'bg-indigo-500' : 'bg-white/20'}
        `}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white"
        />
      </button>
    </div>
  );
}

export default SettingsPage;
