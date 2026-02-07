'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  disabled = false, 
  className,
  placeholder
}: PhoneInputProps) {
  const { t } = useTranslation();
  const displayPlaceholder = placeholder || t('auth.enterMobileNumber');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '');
    if (input.length <= 10) {
      onChange(input);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
        <span className="text-sm font-medium text-muted-foreground">+91</span>
      </div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={displayPlaceholder}
        className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        maxLength={10}
      />
    </div>
  );
}
