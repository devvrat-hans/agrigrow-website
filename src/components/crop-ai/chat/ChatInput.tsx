'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { IconSend, IconLoader2, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// TYPES

export interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (message: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether sending is in progress */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Maximum characters allowed */
  maxLength?: number;
}

// CONSTANTS

const DEFAULT_PLACEHOLDER = 'Ask anything about your crops...';
const DEFAULT_MAX_LENGTH = 2000;

/**
 * ChatInput Component
 * 
 * Multiline text input with send button for chat interface.
 * Supports keyboard shortcuts and loading states.
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = DEFAULT_PLACEHOLDER,
  loading = false,
  className,
  autoFocus = false,
  maxLength = DEFAULT_MAX_LENGTH,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice-to-text state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if voice recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  // Toggle voice-to-text
  const toggleVoiceToText = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }

      if (finalTranscript) {
        setMessage(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-resize textarea based on content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxLength) {
        setMessage(value);
      }
    },
    [maxLength]
  );

  // Handle send
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !loading) {
      onSend(trimmedMessage);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, disabled, loading, onSend]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send (without Shift for newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Adjust height on message change
  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Can send check
  const canSend = message.trim().length > 0 && !disabled && !loading;

  // Character count
  const charCount = message.length;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <div className={cn('relative', className)}>
      {/* Input Container */}
      <div
        className={cn(
          'flex items-end gap-2',
          'p-2 sm:p-3',
          'bg-gray-50 dark:bg-gray-800',
          'rounded-xl',
          'transition-colors duration-150',
          'focus-within:ring-0 focus-within:outline-none',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          rows={1}
          style={{ outline: 'none', boxShadow: 'none' }}
          className={cn(
            'flex-1 min-h-[40px] max-h-[150px]',
            'px-3 py-2',
            'text-sm sm:text-base text-gray-900 dark:text-white',
            'bg-transparent',
            'border-none outline-none ring-0',
            'focus:ring-0 focus:outline-none focus:border-none',
            'focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none',
            'resize-none',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            '[&:focus]:outline-none [&:focus]:ring-0 [&:focus]:border-none',
            disabled && 'cursor-not-allowed'
          )}
        />

        {/* Voice Input Button */}
        {voiceSupported && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleVoiceToText}
            className={cn(
              'flex-shrink-0',
              'min-w-[44px] min-h-[44px] p-0',
              'rounded-full',
              'active:scale-[0.95] transition-transform',
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600',
              'focus:ring-0 focus:outline-none focus-visible:ring-0'
            )}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? (
              <IconMicrophoneOff className="w-5 h-5" />
            ) : (
              <IconMicrophone className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Send Button - Touch friendly with feedback */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0',
            'min-w-[44px] min-h-[44px] p-0',
            'rounded-full',
            'active:scale-[0.95] transition-transform',
            canSend
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            'focus:ring-0 focus:outline-none focus-visible:ring-0',
            'disabled:opacity-100'
          )}
        >
          {loading ? (
            <IconLoader2 className="w-5 h-5 animate-spin" />
          ) : (
            <IconSend className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Helper Row */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        {/* Keyboard Hint - Hide on mobile */}
        <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">
          Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">↵</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">Shift</kbd> + <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">↵</kbd> for new line
        </span>

        {/* Character Count */}
        {isNearLimit && (
          <span
            className={cn(
              'text-xs',
              charCount >= maxLength
                ? 'text-red-500'
                : 'text-amber-500'
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatInput;
