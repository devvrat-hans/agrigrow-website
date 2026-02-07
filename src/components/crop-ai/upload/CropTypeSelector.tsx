'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconPlant, IconSearch, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CropTypeChip } from './CropTypeChip';

// TYPES

export interface CropTypeSelectorProps {
  /** Current selected value */
  value?: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

// CROP DATA - Organized by category for Indian farmers

interface CropCategory {
  name: string;
  crops: { value: string; label: string; hindiName?: string }[];
}

const CROP_CATEGORIES: CropCategory[] = [
  {
    name: 'Cereals (अनाज)',
    crops: [
      { value: 'rice', label: 'Rice', hindiName: 'धान' },
      { value: 'wheat', label: 'Wheat', hindiName: 'गेहूं' },
      { value: 'maize', label: 'Maize', hindiName: 'मक्का' },
      { value: 'bajra', label: 'Bajra (Pearl Millet)', hindiName: 'बाजरा' },
      { value: 'jowar', label: 'Jowar (Sorghum)', hindiName: 'ज्वार' },
      { value: 'ragi', label: 'Ragi (Finger Millet)', hindiName: 'रागी' },
      { value: 'barley', label: 'Barley', hindiName: 'जौ' },
    ],
  },
  {
    name: 'Cash Crops (नकदी फसलें)',
    crops: [
      { value: 'cotton', label: 'Cotton', hindiName: 'कपास' },
      { value: 'sugarcane', label: 'Sugarcane', hindiName: 'गन्ना' },
      { value: 'jute', label: 'Jute', hindiName: 'जूट' },
      { value: 'tobacco', label: 'Tobacco', hindiName: 'तम्बाकू' },
      { value: 'rubber', label: 'Rubber', hindiName: 'रबड़' },
      { value: 'tea', label: 'Tea', hindiName: 'चाय' },
      { value: 'coffee', label: 'Coffee', hindiName: 'कॉफी' },
    ],
  },
  {
    name: 'Pulses (दालें)',
    crops: [
      { value: 'chickpea', label: 'Chickpea (Chana)', hindiName: 'चना' },
      { value: 'pigeon-pea', label: 'Pigeon Pea (Arhar)', hindiName: 'अरहर' },
      { value: 'green-gram', label: 'Green Gram (Moong)', hindiName: 'मूंग' },
      { value: 'black-gram', label: 'Black Gram (Urad)', hindiName: 'उड़द' },
      { value: 'lentil', label: 'Lentil (Masoor)', hindiName: 'मसूर' },
      { value: 'kidney-bean', label: 'Kidney Bean (Rajma)', hindiName: 'राजमा' },
      { value: 'peas', label: 'Peas (Matar)', hindiName: 'मटर' },
    ],
  },
  {
    name: 'Oilseeds (तिलहन)',
    crops: [
      { value: 'groundnut', label: 'Groundnut', hindiName: 'मूंगफली' },
      { value: 'mustard', label: 'Mustard', hindiName: 'सरसों' },
      { value: 'soybean', label: 'Soybean', hindiName: 'सोयाबीन' },
      { value: 'sunflower', label: 'Sunflower', hindiName: 'सूरजमुखी' },
      { value: 'sesame', label: 'Sesame (Til)', hindiName: 'तिल' },
      { value: 'castor', label: 'Castor', hindiName: 'अरंडी' },
      { value: 'linseed', label: 'Linseed', hindiName: 'अलसी' },
    ],
  },
  {
    name: 'Vegetables (सब्जियाँ)',
    crops: [
      { value: 'tomato', label: 'Tomato', hindiName: 'टमाटर' },
      { value: 'onion', label: 'Onion', hindiName: 'प्याज' },
      { value: 'potato', label: 'Potato', hindiName: 'आलू' },
      { value: 'brinjal', label: 'Brinjal (Eggplant)', hindiName: 'बैंगन' },
      { value: 'chilli', label: 'Chilli', hindiName: 'मिर्च' },
      { value: 'okra', label: 'Okra (Bhindi)', hindiName: 'भिंडी' },
      { value: 'cauliflower', label: 'Cauliflower', hindiName: 'फूलगोभी' },
      { value: 'cabbage', label: 'Cabbage', hindiName: 'पत्तागोभी' },
      { value: 'carrot', label: 'Carrot', hindiName: 'गाजर' },
      { value: 'spinach', label: 'Spinach (Palak)', hindiName: 'पालक' },
      { value: 'bottle-gourd', label: 'Bottle Gourd (Lauki)', hindiName: 'लौकी' },
      { value: 'bitter-gourd', label: 'Bitter Gourd (Karela)', hindiName: 'करेला' },
      { value: 'cucumber', label: 'Cucumber', hindiName: 'खीरा' },
      { value: 'pumpkin', label: 'Pumpkin', hindiName: 'कद्दू' },
    ],
  },
  {
    name: 'Fruits (फल)',
    crops: [
      { value: 'mango', label: 'Mango', hindiName: 'आम' },
      { value: 'banana', label: 'Banana', hindiName: 'केला' },
      { value: 'papaya', label: 'Papaya', hindiName: 'पपीता' },
      { value: 'guava', label: 'Guava', hindiName: 'अमरूद' },
      { value: 'grapes', label: 'Grapes', hindiName: 'अंगूर' },
      { value: 'pomegranate', label: 'Pomegranate', hindiName: 'अनार' },
      { value: 'citrus', label: 'Citrus (Orange/Lemon)', hindiName: 'संतरा/नींबू' },
      { value: 'apple', label: 'Apple', hindiName: 'सेब' },
      { value: 'watermelon', label: 'Watermelon', hindiName: 'तरबूज' },
    ],
  },
  {
    name: 'Spices (मसाले)',
    crops: [
      { value: 'turmeric', label: 'Turmeric', hindiName: 'हल्दी' },
      { value: 'ginger', label: 'Ginger', hindiName: 'अदरक' },
      { value: 'garlic', label: 'Garlic', hindiName: 'लहसुन' },
      { value: 'coriander', label: 'Coriander', hindiName: 'धनिया' },
      { value: 'cumin', label: 'Cumin', hindiName: 'जीरा' },
      { value: 'fenugreek', label: 'Fenugreek (Methi)', hindiName: 'मेथी' },
      { value: 'cardamom', label: 'Cardamom', hindiName: 'इलायची' },
      { value: 'black-pepper', label: 'Black Pepper', hindiName: 'काली मिर्च' },
    ],
  },
];

// Flatten all crops for search
const ALL_CROPS = CROP_CATEGORIES.flatMap((category) =>
  category.crops.map((crop) => ({
    ...crop,
    category: category.name,
  }))
);

// OTHER option value
const OTHER_VALUE = 'other';

// Popular crops for quick selection
const POPULAR_CROPS = [
  { value: 'rice', label: 'Rice' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'sugarcane', label: 'Sugarcane' },
  { value: 'maize', label: 'Maize' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'potato', label: 'Potato' },
  { value: 'onion', label: 'Onion' },
];

/**
 * CropTypeSelector Component
 * 
 * A searchable dropdown for selecting crop types, organized by category.
 * Includes common Indian crops with Hindi names for better accessibility.
 * 
 * @example
 * <CropTypeSelector 
 *   value={cropType} 
 *   onChange={(value) => setCropType(value)} 
 * />
 */
export function CropTypeSelector({
  value,
  onChange,
  className,
  placeholder = 'Select crop type',
  disabled = false,
}: CropTypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  // Filter crops based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CROP_CATEGORIES;

    const query = searchQuery.toLowerCase();
    
    return CROP_CATEGORIES.map((category) => ({
      ...category,
      crops: category.crops.filter(
        (crop) =>
          crop.label.toLowerCase().includes(query) ||
          crop.value.toLowerCase().includes(query) ||
          crop.hindiName?.toLowerCase().includes(query)
      ),
    })).filter((category) => category.crops.length > 0);
  }, [searchQuery]);

  // Get display label for selected value
  const selectedLabel = useMemo(() => {
    if (isOtherSelected && otherValue) {
      return otherValue;
    }
    const crop = ALL_CROPS.find((c) => c.value === value);
    return crop?.label || value;
  }, [value, isOtherSelected, otherValue]);

  // Handle value change
  const handleValueChange = useCallback((newValue: string) => {
    if (newValue === OTHER_VALUE) {
      setIsOtherSelected(true);
    } else {
      setIsOtherSelected(false);
      setOtherValue('');
      onChange(newValue);
    }
  }, [onChange]);

  // Handle other input change
  const handleOtherInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setOtherValue(newValue);
    if (newValue.trim()) {
      onChange(newValue.trim());
    }
  }, [onChange]);

  // Clear other selection
  const handleClearOther = useCallback(() => {
    setIsOtherSelected(false);
    setOtherValue('');
    onChange('');
  }, [onChange]);

  // Clear search when opening/closing dropdown
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSearchQuery('');
    }
  }, []);

  // If "Other" is selected, show text input
  if (isOtherSelected) {
    return (
      <div className={cn('relative', className)}>
        <div className="relative">
          <IconPlant className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            value={otherValue}
            onChange={handleOtherInputChange}
            placeholder="Enter crop name..."
            className="pl-10 pr-10"
            autoFocus
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleClearOther}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'p-1 rounded-full',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'transition-colors'
            )}
            aria-label="Cancel other crop input"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Type your crop name or{' '}
          <button
            type="button"
            onClick={handleClearOther}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            select from list
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Quick Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {POPULAR_CROPS.map((crop) => (
          <CropTypeChip
            key={crop.value}
            label={crop.label}
            selected={value === crop.value}
            onClick={() => handleValueChange(crop.value)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Full Dropdown for More Options */}
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        onOpenChange={handleOpenChange}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <IconPlant className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <SelectValue placeholder={placeholder}>
              {selectedLabel}
            </SelectValue>
          </div>
        </SelectTrigger>
        
        <SelectContent className="max-h-[300px]">
          {/* Search Input */}
          <div className="sticky top-0 px-2 pb-2 bg-popover z-10">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search crops..."
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Filtered Crop Categories */}
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <SelectGroup key={category.name}>
                <SelectLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category.name}
                </SelectLabel>
                {category.crops.map((crop) => (
                  <SelectItem
                    key={crop.value}
                    value={crop.value}
                    className="cursor-pointer"
                  >
                    <span className="flex items-center justify-between w-full gap-2">
                      <span>{crop.label}</span>
                      {crop.hindiName && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {crop.hindiName}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No crops found for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Other Option */}
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Custom
            </SelectLabel>
            <SelectItem value={OTHER_VALUE} className="cursor-pointer">
              <span className="text-primary-600 dark:text-primary-400">
                + Other (Enter manually)
              </span>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export default CropTypeSelector;
