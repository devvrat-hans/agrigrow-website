'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconLanguage } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LANGUAGES, isLanguageAvailable } from '@/constants/languages';

export default function LanguageSettingsPage() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [originalLanguage, setOriginalLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user's current language setting
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const phone = localStorage.getItem('userPhone');
        if (!phone) {
          router.push('/auth/signin');
          return;
        }

        const response = await fetch(`/api/user/me?phone=${phone}`);
        const data = await response.json();

        if (data.success && data.user) {
          const lang = data.user.language || 'en';
          setSelectedLanguage(lang);
          setOriginalLanguage(lang);
          // Sync language preference to localStorage for voice recognition
          localStorage.setItem('userLanguage', lang);
        }
      } catch (err) {
        console.error('Error fetching user language:', err);
        setError('Failed to load language settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserLanguage();
  }, [router]);

  // Handle language selection - only allow available languages
  const handleSelectLanguage = useCallback((langCode: string) => {
    if (!isLanguageAvailable(langCode)) return;
    setSelectedLanguage(langCode);
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (selectedLanguage === originalLanguage) {
      setSuccessMessage('Language settings saved');
      setTimeout(() => setSuccessMessage(null), 2000);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const phone = localStorage.getItem('userPhone');
      if (!phone) {
        router.push('/auth/signin');
        return;
      }

      const response = await fetch('/api/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': phone,
        },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalLanguage(selectedLanguage);
        // Store language preference for voice recognition
        localStorage.setItem('userLanguage', selectedLanguage);
        setSuccessMessage('Language updated successfully');
        setTimeout(() => setSuccessMessage(null), 2000);
      } else {
        throw new Error(data.error || 'Failed to update language');
      }
    } catch (err) {
      console.error('Error saving language:', err);
      setError(err instanceof Error ? err.message : 'Failed to save language settings');
    } finally {
      setIsSaving(false);
    }
  }, [selectedLanguage, originalLanguage, router]);

  // Check if there are unsaved changes
  const hasChanges = selectedLanguage !== originalLanguage;

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
      <PageHeader showBackButton title="Language Settings" />

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {/* Description */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/30">
              <IconLanguage className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Choose Your Language
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select your preferred language. English and Hindi are fully available. Other regional languages will be available soon.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Language Options */}
        <div className="space-y-2">
          {LANGUAGES.map((language) => {
            const isSelected = selectedLanguage === language.code;
            const isAvailable = language.status === 'available';
            return (
              <button
                key={language.code}
                onClick={() => handleSelectLanguage(language.code)}
                disabled={!isAvailable}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-xl',
                  'border transition-all duration-200',
                  'min-h-[60px]',
                  isAvailable
                    ? isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    : 'border-gray-200/50 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'
                )}
              >
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium',
                      isAvailable
                        ? isSelected
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {language.name}
                    </span>
                    {isAvailable ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    isAvailable
                      ? isSelected
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {language.nativeName}
                  </span>
                </div>
                {isSelected && isAvailable && (
                  <IconCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-8">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full min-h-[48px]"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </div>
            ) : hasChanges ? (
              'Save Changes'
            ) : (
              'Save'
            )}
          </Button>
        </div>

        {/* Note */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Note: Changing the language may require a page refresh to take full effect.
        </p>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
