'use client';

import { NavLink } from './NavLink';

interface NavItem {
  href: string;
  label: string;
}

interface NavLinksProps {
  items: NavItem[];
  className?: string;
}

export function NavLinks({ items, className = '' }: NavLinksProps) {
  return (
    <div className={`flex items-center gap-8 ${className}`}>
      {items.map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
