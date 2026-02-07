'use client';

import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterLinkGroupProps {
  title: string;
  links: FooterLink[];
}

export function FooterLinkGroup({ title, links }: FooterLinkGroupProps) {
  return (
    <div>
      <h4 className="font-semibold text-foreground mb-4 text-sm">{title}</h4>
      <ul className="space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
