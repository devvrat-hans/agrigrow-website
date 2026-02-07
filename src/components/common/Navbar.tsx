'use client';

import { useState } from 'react';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { NavCTAButtons } from './NavCTAButtons';
import { MobileMenuButton } from './MobileMenuButton';
import { MobileMenu } from './MobileMenu';
import { zIndex } from '@/lib/design-tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { href: '#features', label: t('nav.features') },
    { href: '#about', label: t('nav.about') },
    { href: '#community', label: t('nav.community') },
    { href: '#resources', label: t('nav.resources') },
  ];

  return (
    <nav 
      className="fixed top-0 left-0 right-0 bg-background border-b border-border"
      style={{ zIndex: zIndex.navbar }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Logo size="md" />

          {/* Desktop Navigation */}
          <NavLinks items={navItems} className="hidden md:flex" />

          {/* CTA Buttons */}
          <NavCTAButtons className="hidden md:flex" />

          {/* Mobile Menu Button */}
          <MobileMenuButton 
            isOpen={isMobileMenuOpen} 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu isOpen={isMobileMenuOpen} items={navItems} />
      </div>
    </nav>
  );
}
