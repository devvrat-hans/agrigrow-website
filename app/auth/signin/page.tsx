'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PhoneInput, 
  OTPInput, 
  ResendOTP,
  AuthBrandingSection,
  AuthFormContainer,
  AuthFormHeader,
  BackButton,
  AuthLink
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

type AuthStep = 'phone' | 'otp';

export default function SigninPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setIsLoading(true);
    setError('');

    // Quick transition to OTP step
    await new Promise(resolve => setTimeout(resolve, 100));
    setStep('otp');
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Quick verification - accept any 6-digit OTP
      await new Promise(resolve => setTimeout(resolve, 100));

      // Store phone number for session
      localStorage.setItem('userPhone', phone);

      // Check if user exists and is already onboarded
      const response = await fetch(`/api/user/me?phone=${phone}`);
      const data = await response.json();

      if (data.success && data.user && data.user.isOnboarded) {
        // User exists and is onboarded, go directly to home
        router.push('/home');
      } else {
        // User is new or not onboarded yet, go to onboarding
        router.push(`/onboarding?phone=${phone}`);
      }
    } catch {
      setError(t('auth.otpFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    setError('');
    await handleSendOTP();
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'phone' && phone.length === 10 && !isLoading) {
        handleSendOTP();
      } else if (step === 'otp' && otp.length === 6 && !isLoading) {
        handleVerifyOTP();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" onKeyDown={handleKeyDown}>
      <AuthBrandingSection 
        title={t('auth.signin.welcomeBack')}
        description={t('auth.signin.welcomeDesc')}
      />

      <AuthFormContainer>
        {step === 'phone' ? (
          <>
            <AuthFormHeader 
              title={t('auth.signin.title')}
              description={t('auth.signin.description')}
            />

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('auth.mobileNumber')}
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || phone.length !== 10}
                className="w-full"
                size="lg"
              >
                {isLoading ? t('auth.sendingOtp') : t('auth.sendOtp')}
              </Button>

              <AuthLink 
                question={t('auth.dontHaveAccount')}
                linkText={t('nav.signup')}
                href="/auth/signup"
              />
            </div>
          </>
        ) : (
          <>
            <BackButton onClick={handleBack} />

            <AuthFormHeader 
              title={t('auth.verifyOtpTitle')}
              description={`${t('auth.verifyOtpDesc')}${phone}`}
            />

            <div className="space-y-6">
              {/* Demo notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                  <strong>{t('auth.demoMode')}</strong> {t('auth.demoModeDesc')}
                </p>
              </div>

              <OTPInput
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full"
                size="lg"
              >
                {isLoading ? t('auth.verifyingOtp') : t('auth.verifyOtp')}
              </Button>

              <ResendOTP onResend={handleResendOTP} disabled={isLoading} />
            </div>
          </>
        )}
      </AuthFormContainer>
    </div>
  );
}
