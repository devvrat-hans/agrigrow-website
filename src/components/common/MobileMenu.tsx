'use client';

import { NavLink } from './NavLink';
import { NavCTAButtons } from './NavCTAButtons';

interface NavItem {
  href: string;
  label: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  items: NavItem[];
}

export function MobileMenu({ isOpen, items }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden py-4 border-t border-border">
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <NavLink key={item.href} href={item.href}>
            {item.label}
          </NavLink>
        ))}
        <NavCTAButtons variant="mobile" />
      </div>
    </div>
  );
}
