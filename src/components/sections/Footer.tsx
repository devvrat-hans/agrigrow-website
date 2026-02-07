'use client';

import { Logo, FooterLinkGroup } from '@/components/common';
import { containerMaxWidth } from '@/lib/design-tokens';

const companyLinks = [
  { label: 'About', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Contact', href: '#' },
];

const legalLinks = [
  { label: 'Privacy', href: '#' },
  { label: 'Terms', href: '#' },
  { label: 'Cookies', href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-muted border-t border-border py-12 px-6">
      <div className={`${containerMaxWidth['7xl']} mx-auto`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Logo size="md" href="/" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Helping farmers make better decisions with <br />AI and community knowledge.
            </p>
          </div>

          <FooterLinkGroup title="Company" links={companyLinks} />
          <FooterLinkGroup title="Legal" links={legalLinks} />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 AgriGrow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
