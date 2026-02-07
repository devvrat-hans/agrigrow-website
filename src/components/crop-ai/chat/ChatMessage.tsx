'use client';

import { useMemo } from 'react';
import { IconRobot, IconUser } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

// TYPES

export type MessageRole = 'user' | 'assistant';

export interface ChatMessageData {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: string;
}

export interface ChatMessageProps {
  /** Message data */
  message: ChatMessageData;
  /** Whether the message is loading (for assistant) */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// HELPER COMPONENTS

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

// AVATAR COMPONENT

interface AvatarProps {
  role: MessageRole;
}

function Avatar({ role }: AvatarProps) {
  if (role === 'assistant') {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          'w-8 h-8 rounded-full',
          'bg-primary-100 dark:bg-primary-900/50',
          'ring-2 ring-primary-200 dark:ring-primary-800'
        )}
      >
        <IconRobot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'w-8 h-8 rounded-full',
        'bg-gray-200 dark:bg-gray-700',
        'ring-2 ring-gray-300 dark:ring-gray-600'
      )}
    >
      <IconUser className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    </div>
  );
}

// MARKDOWN RENDERER (Simple)

function renderMarkdown(content: string): React.ReactNode {
  // Simple markdown rendering
  // Handle code blocks
  const parts = content.split(/```(\w+)?\n?([\s\S]*?)```/g);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Code block content (every 3rd element after first)
    if (i % 3 === 2 && part) {
      elements.push(
        <pre
          key={i}
          className="my-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-x-auto"
        >
          <code className="text-sm text-gray-800 dark:text-gray-200">
            {part}
          </code>
        </pre>
      );
      continue;
    }

    // Language identifier
    if (i % 3 === 1) continue;

    // Regular text
    if (part) {
      // Handle inline formatting
      const lines = part.split('\n');
      lines.forEach((line, lineIndex) => {
        // Bold text
        let processedLine: React.ReactNode = line;
        const boldPattern = /\*\*(.+?)\*\*/g;
        if (boldPattern.test(line)) {
          const lineParts = line.split(boldPattern);
          processedLine = lineParts.map((p, pi) =>
            pi % 2 === 1 ? (
              <strong key={pi}>{p}</strong>
            ) : (
              p
            )
          );
        }

        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          elements.push(
            <li key={`${i}-${lineIndex}`} className="ml-4 list-disc">
              {typeof processedLine === 'string'
                ? processedLine.slice(2)
                : processedLine}
            </li>
          );
        }
        // Numbered lists
        else if (/^\d+\.\s/.test(line.trim())) {
          elements.push(
            <li key={`${i}-${lineIndex}`} className="ml-4 list-decimal">
              {typeof processedLine === 'string'
                ? processedLine.replace(/^\d+\.\s/, '')
                : processedLine}
            </li>
          );
        }
        // Headings
        else if (line.startsWith('### ')) {
          elements.push(
            <h4 key={`${i}-${lineIndex}`} className="font-semibold text-gray-900 dark:text-white mt-2 mb-1">
              {line.slice(4)}
            </h4>
          );
        }
        else if (line.startsWith('## ')) {
          elements.push(
            <h3 key={`${i}-${lineIndex}`} className="font-bold text-gray-900 dark:text-white mt-2 mb-1">
              {line.slice(3)}
            </h3>
          );
        }
        // Regular paragraph
        else if (line.trim()) {
          elements.push(
            <p key={`${i}-${lineIndex}`} className="mb-1">
              {processedLine}
            </p>
          );
        }
        // Empty line
        else {
          elements.push(<br key={`${i}-${lineIndex}`} />);
        }
      });
    }
  }

  return elements;
}

/**
 * ChatMessage Component
 * 
 * Renders a chat message bubble with different styling for user and assistant.
 * Supports markdown rendering for assistant messages.
 */
export function ChatMessage({
  message,
  isLoading = false,
  className,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Format timestamp
  const formattedTime = useMemo(() => {
    try {
      const date = new Date(message.timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  }, [message.timestamp]);

  // Render content
  const renderedContent = useMemo(() => {
    if (isLoading) {
      return <TypingIndicator />;
    }

    if (isUser) {
      return <span className="whitespace-pre-wrap">{message.content}</span>;
    }

    return renderMarkdown(message.content);
  }, [isLoading, isUser, message.content]);

  return (
    <div
      className={cn(
        'flex gap-2 sm:gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <Avatar role={message.role} />

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%]',
          'px-3 py-2 sm:px-4 sm:py-3',
          isUser
            ? 'bg-primary-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm'
        )}
      >
        {/* Content */}
        <div className={cn('text-sm sm:text-base leading-relaxed', isUser ? '' : 'prose-sm dark:prose-invert')}>
          {renderedContent}
        </div>

        {/* Timestamp */}
        {!isLoading && formattedTime && (
          <div
            className={cn(
              'mt-1 text-xs text-muted-foreground',
              isUser
                ? 'text-primary-200'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {formattedTime}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
