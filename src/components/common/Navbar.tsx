'use client';

import { useState } from 'react';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { NavCTAButtons } from './NavCTAButtons';
import { MobileMenuButton } from './MobileMenuButton';
import { MobileMenu } from './MobileMenu';
import { zIndex } from '@/lib/design-tokens';

const navItems = [
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#community', label: 'Community' },
  { href: '#resources', label: 'Resources' },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
