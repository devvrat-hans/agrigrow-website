'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  IconLeaf,
  IconTractor,
  IconFlask,
  IconPig,
  IconNews,
  IconClipboardCheck,
  IconCash,
  IconBuildingFactory,
  IconCategory,
} from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Post categories matching farmer interests from onboarding
 */
export type PostCategory =
  | 'organic_farming'
  | 'equipment_machinery'
  | 'fertilizer_pesticides'
  | 'animal_husbandry'
  | 'agri_business_news'
  | 'agriculture_practices'
  | 'market_prices'
  | 'food_processing'
  | 'general';

/**
 * Category configuration interface
 */
interface CategoryConfig {
  id: PostCategory;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
}

/**
 * Available post categories with icons and colors
 */
export const POST_CATEGORIES: CategoryConfig[] = [
  {
    id: 'general',
    name: 'General',
    icon: IconCategory,
    iconColor: 'text-gray-500',
  },
  {
    id: 'organic_farming',
    name: 'Organic Farming',
    icon: IconLeaf,
    iconColor: 'text-green-600',
  },
  {
    id: 'equipment_machinery',
    name: 'Equipment & Machinery',
    icon: IconTractor,
    iconColor: 'text-orange-600',
  },
  {
    id: 'fertilizer_pesticides',
    name: 'Fertilizer & Pesticides',
    icon: IconFlask,
    iconColor: 'text-purple-600',
  },
  {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    icon: IconPig,
    iconColor: 'text-amber-600',
  },
  {
    id: 'agri_business_news',
    name: 'Agri Business News',
    icon: IconNews,
    iconColor: 'text-blue-600',
  },
  {
    id: 'agriculture_practices',
    name: 'Agriculture Practices',
    icon: IconClipboardCheck,
    iconColor: 'text-teal-600',
  },
  {
    id: 'market_prices',
    name: 'Market Prices',
    icon: IconCash,
    iconColor: 'text-yellow-600',
  },
  {
    id: 'food_processing',
    name: 'Food Processing',
    icon: IconBuildingFactory,
    iconColor: 'text-rose-600',
  },
];

/**
 * Props interface for CategorySelector component
 */
interface CategorySelectorProps {
  value: PostCategory;
  onChange: (category: PostCategory) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * CategorySelector component - Dropdown select for post category
 * Mobile-optimized with touch-friendly sizing
 */
export function CategorySelector({
  value,
  onChange,
  disabled = false,
  className,
}: CategorySelectorProps) {
  const selectedCategory = POST_CATEGORIES.find((cat) => cat.id === value);
  const SelectedIcon = selectedCategory?.icon || IconCategory;

  return (
    <div className={cn('w-full', className)}>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as PostCategory)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full min-h-[44px]">
          <SelectValue placeholder="Select category">
            <div className="flex items-center gap-2">
              <SelectedIcon 
                size={16} 
                className={cn('flex-shrink-0', selectedCategory?.iconColor)} 
              />
              <span>{selectedCategory?.name || 'Select category'}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={4}
          align="start"
          className="z-[100] min-w-[200px] max-h-[300px]"
        >
          {POST_CATEGORIES.map((category) => {
            const IconComponent = category.icon;

            return (
              <SelectItem
                key={category.id}
                value={category.id}
                className="py-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <IconComponent 
                    size={16} 
                    className={cn('flex-shrink-0', category.iconColor)} 
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Get category configuration by ID
 */
export function getCategoryById(id: PostCategory): CategoryConfig | undefined {
  return POST_CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get category display name by ID
 */
export function getCategoryName(id: PostCategory): string {
  const category = getCategoryById(id);
  return category?.name ?? 'General';
}

export default CategorySelector;
