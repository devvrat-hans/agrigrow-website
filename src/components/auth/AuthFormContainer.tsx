'use client';

import { Logo } from '@/components/common';

interface AuthFormContainerProps {
  children: React.ReactNode;
}

export function AuthFormContainer({ children }: AuthFormContainerProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md">
        {/* Mobile Logo */}
        <div className="md:hidden mb-8 flex justify-center">
          <Logo size="md" />
        </div>
        {children}
      </div>
    </div>
  );
}
