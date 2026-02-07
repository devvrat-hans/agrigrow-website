'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconX, IconPlus, IconSeedling } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Common Indian crops for autocomplete suggestions
 */
const COMMON_INDIAN_CROPS = [
  // Cereals
  'wheat', 'rice', 'maize', 'bajra', 'jowar', 'ragi', 'barley', 'oats',
  // Pulses
  'gram', 'tur', 'moong', 'urad', 'masoor', 'lentils', 'chickpeas', 'pigeon pea',
  // Oilseeds
  'groundnut', 'soybean', 'mustard', 'sunflower', 'sesame', 'castor', 'safflower',
  // Cash Crops
  'cotton', 'sugarcane', 'tobacco', 'jute',
  // Vegetables
  'tomato', 'onion', 'potato', 'brinjal', 'cabbage', 'cauliflower', 'okra', 'chilli',
  'capsicum', 'carrot', 'radish', 'beetroot', 'spinach', 'peas', 'beans', 'cucumber',
  'bottle gourd', 'bitter gourd', 'pumpkin', 'garlic', 'ginger', 'turmeric', 'coriander',
  // Fruits
  'mango', 'banana', 'papaya', 'guava', 'pomegranate', 'grapes', 'watermelon', 'muskmelon',
  'orange', 'lemon', 'coconut', 'apple', 'litchi', 'sapota', 'custard apple',
  // Spices
  'cardamom', 'pepper', 'clove', 'cumin', 'fennel', 'fenugreek',
  // Flowers
  'marigold', 'rose', 'jasmine', 'chrysanthemum', 'tuberose',
  // Others
  'tea', 'coffee', 'rubber', 'arecanut', 'cashew',
];

/**
 * Props for CropTagInput component
 */
interface CropTagInputProps {
  value: string[];
  onChange: (crops: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * CropTagInput Component
 * Autocomplete input for adding crop tags with badges
 */
export function CropTagInput({
  value,
  onChange,
  placeholder = 'Add crops...',
  maxTags = 10,
  disabled = false,
  className,
}: CropTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = inputValue.trim()
    ? COMMON_INDIAN_CROPS.filter(
        (crop) =>
          crop.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(crop.toLowerCase())
      ).slice(0, 8) // Limit to 8 suggestions
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle adding a crop
  const addCrop = useCallback(
    (crop: string) => {
      const normalizedCrop = crop.toLowerCase().trim();
      if (
        normalizedCrop &&
        !value.includes(normalizedCrop) &&
        value.length < maxTags
      ) {
        onChange([...value, normalizedCrop]);
      }
      setInputValue('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [value, onChange, maxTags]
  );

  // Handle removing a crop
  const removeCrop = useCallback(
    (cropToRemove: string) => {
      onChange(value.filter((crop) => crop !== cropToRemove));
    },
    [value, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen && filteredSuggestions.length > 0) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else if (isOpen) {
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          addCrop(filteredSuggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          addCrop(inputValue);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          removeCrop(value[value.length - 1]);
        }
        break;
      case ',':
      case 'Tab':
        if (inputValue.trim()) {
          event.preventDefault();
          addCrop(inputValue);
        }
        break;
    }
  };

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setIsOpen(newValue.trim().length > 0 && filteredSuggestions.length > 0);
    setHighlightedIndex(-1);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const highlightedItem = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      highlightedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const canAddMore = value.length < maxTags;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 sm:gap-1.5 p-2 sm:p-2 min-h-[44px] sm:min-h-[42px]',
          'border rounded-lg bg-white dark:bg-gray-950',
          'border-gray-200 dark:border-gray-800',
          'transition-colors duration-150',
          isOpen && 'border-primary-500 dark:border-primary-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected crop badges - with touch-friendly remove buttons */}
        {value.map((crop) => (
          <Badge
            key={crop}
            variant="secondary"
            className={cn(
              'flex items-center gap-1 pl-2 pr-0.5 py-1 sm:py-0.5',
              'bg-primary-50 text-primary-700 border-primary-200',
              'dark:bg-primary-950 dark:text-primary-300 dark:border-primary-800',
              'min-h-[36px] sm:min-h-0' // Adequate touch height for badge
            )}
          >
            <IconSeedling size={14} className="sm:w-3 sm:h-3" />
            <span className="capitalize text-xs sm:text-xs">{crop}</span>
            {/* Remove button - touch-friendly target within badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCrop(crop);
              }}
              disabled={disabled}
              className={cn(
                'ml-0.5 rounded-full flex items-center justify-center',
                'min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 sm:p-0.5',
                'hover:bg-primary-200 dark:hover:bg-primary-800',
                'focus:outline-none focus:ring-1 focus:ring-primary-500',
                'active:scale-95 transition-transform'
              )}
              aria-label={`Remove ${crop}`}
            >
              <IconX size={14} className="sm:w-3 sm:h-3" />
            </button>
          </Badge>
        ))}

        {/* Input field - 16px font size to prevent iOS zoom, 44px min height */}
        {canAddMore && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (filteredSuggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={value.length === 0 ? placeholder : 'Add more...'}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[100px] min-h-[36px] sm:min-h-0 bg-transparent outline-none',
              'text-base sm:text-sm', // 16px on mobile prevents iOS zoom
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              disabled && 'cursor-not-allowed'
            )}
            aria-label="Add crop tag"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            role="combobox"
          />
        )}

        {/* Add button for custom entries - 44px touch target */}
        {inputValue.trim() && canAddMore && (
          <button
            type="button"
            onClick={() => addCrop(inputValue)}
            className={cn(
              'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1',
              'flex items-center justify-center rounded-full',
              'text-primary-600 hover:bg-primary-100',
              'dark:text-primary-400 dark:hover:bg-primary-900',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              'active:scale-95 transition-transform'
            )}
            aria-label="Add crop"
          >
            <IconPlus size={20} className="sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown - positioned above keyboard on mobile */}
      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 z-50 mt-1 w-full overflow-auto',
            'max-h-[40vh] sm:max-h-60', // Shorter on mobile to fit above keyboard
            'bg-white dark:bg-gray-950 border rounded-lg shadow-lg',
            'border-gray-200 dark:border-gray-800'
          )}
          style={{ top: '100%' }}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => addCrop(suggestion)}
              className={cn(
                'flex items-center gap-2 px-3 cursor-pointer',
                'py-3 sm:py-2 min-h-[44px] sm:min-h-0', // 44px touch target on mobile
                'text-sm sm:text-sm',
                'hover:bg-gray-50 dark:hover:bg-gray-900',
                'active:bg-gray-100 dark:active:bg-gray-800',
                highlightedIndex === index &&
                  'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              )}
            >
              <IconSeedling size={16} className="text-primary-500 sm:w-3.5 sm:h-3.5" />
              <span className="capitalize">{suggestion}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {value.length}/{maxTags} tags added. Press Enter or comma to add.
      </p>
    </div>
  );
}

/**
 * Export the list of common crops for external use
 */
export { COMMON_INDIAN_CROPS };

export default CropTagInput;
