'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconSettings,
  IconBell,
  IconMoon,
  IconSun,
  IconDeviceMobile,
  IconInfoCircle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Settings section card component
 */
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
        {title}
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * Settings row with toggle switch
 */
interface SettingsToggleRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingsToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Settings row with info (non-interactive)
 */
interface SettingsInfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function SettingsInfoRow({ icon: Icon, label, value }: SettingsInfoRowProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{value}</p>
    </div>
  );
}

/**
 * App Settings storage key
 */
const SETTINGS_STORAGE_KEY = 'agrigrow-app-settings';

/**
 * App settings interface
 */
interface AppSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  darkMode: 'system' | 'light' | 'dark';
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: AppSettings = {
  pushNotifications: true,
  emailNotifications: true,
  darkMode: 'system',
};

export default function AppSettingsPage() {
  const _router = useRouter();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setIsSaving(true);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);

      // Apply dark mode
      if (newSettings.darkMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (newSettings.darkMode === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle toggle changes
  const handleToggle = useCallback((key: keyof AppSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Handle dark mode cycle
  const handleDarkModeToggle = useCallback(() => {
    const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(settings.darkMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newSettings = { ...settings, darkMode: modes[nextIndex] };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Get dark mode icon and label
  const getDarkModeInfo = () => {
    switch (settings.darkMode) {
      case 'light':
        return { icon: IconSun, label: t('profile.settings.light') };
      case 'dark':
        return { icon: IconMoon, label: t('profile.settings.dark') };
      default:
        return { icon: IconDeviceMobile, label: t('profile.settings.system') };
    }
  };

  const darkModeInfo = getDarkModeInfo();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <PageHeader showBackButton title={t('profile.settings.title')} />

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {/* Description */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/30">
              <IconSettings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.settings.title')}
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('profile.settings.subtitle')}
          </p>
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div className="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-primary-700 dark:text-primary-300">Saving...</p>
          </div>
        )}

        {/* Notifications Section */}
        <SettingsSection title={t('profile.settings.notifications')}>
          <SettingsToggleRow
            icon={IconBell}
            label={t('profile.settings.pushNotifications')}
            description={t('profile.settings.pushNotificationsDesc')}
            checked={settings.pushNotifications}
            onCheckedChange={(checked) => handleToggle('pushNotifications', checked)}
          />
          <SettingsToggleRow
            icon={IconBell}
            label={t('profile.settings.emailNotifications')}
            description={t('profile.settings.emailNotificationsDesc')}
            checked={settings.emailNotifications}
            onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title={t('profile.settings.appearance')}>
          <button
            onClick={handleDarkModeToggle}
            className="w-full flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <darkModeInfo.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t('profile.settings.theme')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.settings.tapToChange')}: {darkModeInfo.label}
                </p>
              </div>
            </div>
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              'bg-primary-100 dark:bg-primary-900/30',
              'text-primary-700 dark:text-primary-300'
            )}>
              {darkModeInfo.label}
            </span>
          </button>
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title={t('profile.settings.about')}>
          <SettingsInfoRow
            icon={IconInfoCircle}
            label="Version"
            value="1.0.0"
          />
        </SettingsSection>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
