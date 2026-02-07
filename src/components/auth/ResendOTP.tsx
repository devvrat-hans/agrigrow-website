'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ResendOTPProps {
  onResend: () => void;
  disabled?: boolean;
  initialCountdown?: number;
}

export function ResendOTP({ 
  onResend, 
  disabled = false, 
  initialCountdown = 30 
}: ResendOTPProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    if (canResend && !disabled) {
      onResend();
      setCountdown(initialCountdown);
      setCanResend(false);
    }
  };

  return (
    <div className="text-center">
      {canResend ? (
        <Button
          variant="link"
          onClick={handleResend}
          disabled={disabled}
          className="text-primary hover:text-primary/80"
        >
          Resend OTP
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Resend OTP in <span className="font-medium text-foreground">{countdown}s</span>
        </p>
      )}
    </div>
  );
}
