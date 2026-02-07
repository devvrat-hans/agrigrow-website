'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { IconMessageCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ChatWindow } from '@/components/crop-ai/chat/ChatWindow';
import { ChatHeader } from '@/components/crop-ai/chat/ChatHeader';

/**
 * GlobalAIWidget Component
 * 
 * A floating Ask AI button that appears on all pages except the crop-ai page.
 * Opens a fullscreen chat overlay when clicked.
 */
export function GlobalAIWidget() {
  const pathname = usePathname();
  const [showChat, setShowChat] = useState(false);

  // Hide on crop-ai page since it has its own AI widget
  if (pathname?.startsWith('/crop-ai')) {
    return null;
  }

  // Hide on auth pages
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding')) {
    return null;
  }

  const toggleChat = () => setShowChat(!showChat);
  const closeChat = () => setShowChat(false);

  return (
    <>
      {/* Floating Action Button */}
      {!showChat && (
        <button
          onClick={toggleChat}
          className={cn(
            'fixed z-40 flex items-center justify-center rounded-full shadow-lg',
            'bg-green-600 hover:bg-green-700 text-white',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            // Position above MobileBottomNav on mobile, bottom right on desktop
            'bottom-24 right-4 md:bottom-6 md:right-6',
            'min-w-[56px] min-h-[56px] md:min-w-[auto] md:min-h-[auto] md:px-4 md:py-3 md:gap-2'
          )}
          aria-label="Ask AI"
        >
          <IconMessageCircle className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-medium">Ask AI</span>
        </button>
      )}

      {/* Chat Overlay - Slides up from bottom */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Chat Header */}
          <ChatHeader
            title="Ask AI"
            onClose={closeChat}
          />

          {/* Chat Content */}
          <div className="flex-1 flex flex-col min-h-0 pb-[env(safe-area-inset-bottom)]">
            <ChatWindow
              placeholder="Ask about your crops..."
              autoFocus
              showHeader={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalAIWidget;
