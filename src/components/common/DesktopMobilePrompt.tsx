'use client';

/**
 * DesktopMobilePrompt Component
 * 
 * Shows a prompt to desktop users suggesting they view the website on mobile.
 * This is because the platform is primarily designed for farmers who access
 * the application via mobile devices.
 */

import { useState, useEffect } from 'react';
import { 
  IconDeviceMobile, 
  IconX, 
  IconBrandAndroid,
  IconBrandApple,
  IconArrowRight 
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DesktopMobilePromptProps {
  /** Minimum width considered as desktop (default: 768px) */
  minDesktopWidth?: number;
  /** Key for storing dismissed state in localStorage */
  storageKey?: string;
  /** Duration in days to remember user's dismissal choice */
  dismissDurationDays?: number;
}

export function DesktopMobilePrompt({
  minDesktopWidth = 768,
  storageKey = 'agrigrow_desktop_prompt_dismissed',
  dismissDurationDays = 7
}: DesktopMobilePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    // Set the current URL for QR code
    setCurrentUrl(window.location.href);
    
    // Check if user has previously dismissed the prompt
    const dismissedTimestamp = localStorage.getItem(storageKey);
    if (dismissedTimestamp) {
      const dismissedDate = new Date(parseInt(dismissedTimestamp, 10));
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // If dismissed within the duration, don't show
      if (daysDiff < dismissDurationDays) {
        return;
      }
    }

    // Check screen width
    const checkWidth = () => {
      const isDesktop = window.innerWidth >= minDesktopWidth;
      setShowPrompt(isDesktop);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);

    return () => window.removeEventListener('resize', checkWidth);
  }, [minDesktopWidth, storageKey, dismissDurationDays]);

  const handleDismiss = (remember: boolean) => {
    if (remember) {
      localStorage.setItem(storageKey, Date.now().toString());
    }
    setShowPrompt(false);
  };

  const handleContinueOnDesktop = () => {
    // Remember for shorter duration when continuing on desktop
    localStorage.setItem(storageKey, Date.now().toString());
    setShowPrompt(false);
  };

  // Don't render on server or when not showing
  if (!mounted || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <Card className="max-w-lg w-full shadow-2xl border-primary-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <IconDeviceMobile className="w-10 h-10 text-primary-600" />
          </div>
          <CardTitle className="text-2xl text-primary-900">
            Best Experience on Mobile
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Agrigrow is designed for farmers on the go. 
            For the best experience, please access this platform on your mobile device.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mobile device recommendation */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-800 text-center mb-4">
              Scan the QR code or visit this URL on your mobile:
            </p>
            <div className="flex flex-col items-center gap-4">
              {/* Actual QR Code */}
              <div className="w-36 h-36 bg-white p-2 border-2 border-primary-300 rounded-lg flex items-center justify-center">
                {currentUrl && (
                  <QRCodeSVG 
                    value={currentUrl} 
                    size={120}
                    level="M"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                )}
              </div>
              <code className="text-sm bg-white px-3 py-1.5 rounded border text-primary-700 max-w-full break-all text-center">
                {currentUrl || 'agrigrow.app'}
              </code>
            </div>
          </div>

          {/* Coming soon badges */}
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-gray-600 text-sm">
              <IconBrandAndroid className="w-5 h-5" />
              <span>Play Store (Coming Soon)</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-gray-600 text-sm">
              <IconBrandApple className="w-5 h-5" />
              <span>App Store (Coming Soon)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={handleContinueOnDesktop}
            >
              Continue on Desktop Anyway
              <IconArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => handleDismiss(true)}
            >
              <IconX className="w-4 h-4 mr-1" />
              Don&apos;t show this again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DesktopMobilePrompt;
