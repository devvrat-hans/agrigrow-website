'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconHome, 
  IconPlant2, 
  IconBook, 
  IconUsers,
  IconUser
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { safeAreaCalc } from '@/lib/safe-area';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/home', label: 'Feed', icon: <IconHome size={24} /> },
  { href: '/communities', label: 'Groups', icon: <IconUsers size={24} /> },
  { href: '/knowledge', label: 'Learn', icon: <IconBook size={24} /> },
  { href: '/crop-ai', label: 'Crop AI', icon: <IconPlant2 size={24} /> },
  { href: '/profile', label: 'Profile', icon: <IconUser size={24} /> },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-sm",
        // Safe area handling for horizontal insets (landscape mode)
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      )}
      style={{
        // Safe area padding-bottom with fallback
        paddingBottom: safeAreaCalc('bottom', '0px'),
      }}
    >
      {/* Visual separator line - positioned above safe area */}
      <div 
        className="absolute top-0 left-0 right-0 h-px bg-border"
        aria-hidden="true"
      />
      
      {/* Navigation items container */}
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Touch-friendly minimum tap target (44px)
                "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                "min-w-[44px] min-h-[44px]",
                "transition-colors active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      {/* Safe area spacer for home indicator area on notched devices */}
      <div 
        className="w-full bg-background/95"
        style={{
          // This creates a colored area behind the home indicator
          height: 'env(safe-area-inset-bottom)',
        }}
        aria-hidden="true"
      />
    </nav>
  );
}
