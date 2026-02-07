'use client';

import React, { useState } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconGavel,
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconCircleNumber4,
  IconCircleNumber5,
  IconCircleNumber6,
  IconCircleNumber7,
  IconCircleNumber8,
  IconCircleNumber9,
  IconCircle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * GroupRules component props
 */
interface GroupRulesProps {
  /** List of rules */
  rules: string[];
  /** Maximum rules to show before collapse (default: 3) */
  initialVisible?: number;
  /** Whether to show all rules by default */
  defaultExpanded?: boolean;
  /** Title for the rules section */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Number icons for rules 1-9
 */
const numberIcons = [
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconCircleNumber4,
  IconCircleNumber5,
  IconCircleNumber6,
  IconCircleNumber7,
  IconCircleNumber8,
  IconCircleNumber9,
];

/**
 * Get number icon component for a rule index
 */
function getNumberIcon(index: number): React.ElementType {
  if (index < 9) {
    return numberIcons[index];
  }
  return IconCircle;
}

/**
 * GroupRules component
 * 
 * Expandable/collapsible rules display with numbered rules.
 * 
 * Features:
 * - Numbered rules with icons
 * - Collapsible with initial visible count
 * - Expand/collapse button
 * - Smooth height transition
 * - Accessible with proper ARIA
 * - Dark mode support
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupRules({
  rules,
  initialVisible = 3,
  defaultExpanded = false,
  title = 'Community Rules',
  className,
}: GroupRulesProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // If no rules, don't render
  if (!rules || rules.length === 0) {
    return null;
  }

  const hasMoreRules = rules.length > initialVisible;
  const visibleRules = isExpanded ? rules : rules.slice(0, initialVisible);
  const hiddenCount = rules.length - initialVisible;

  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <IconGavel className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-500" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          ({rules.length} {rules.length === 1 ? 'rule' : 'rules'})
        </span>
      </div>

      {/* Rules list */}
      <ul 
        className="space-y-2 sm:space-y-3"
        aria-label="Community rules"
      >
        {visibleRules.map((rule, index) => {
          const NumberIcon = getNumberIcon(index);
          
          return (
            <li
              key={index}
              className={cn(
                'flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg',
                'bg-gray-50 dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700',
                'transition-all duration-200',
                'hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {/* Number icon */}
              <div className="flex-shrink-0">
                {index < 9 ? (
                  <NumberIcon 
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6',
                      'text-primary-600 dark:text-primary-500'
                    )} 
                  />
                ) : (
                  <span 
                    className={cn(
                      'flex items-center justify-center',
                      'w-5 h-5 sm:w-6 sm:h-6 rounded-full',
                      'bg-primary-100 dark:bg-primary-900/50',
                      'text-xs sm:text-sm font-bold text-primary-700 dark:text-primary-300'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              
              {/* Rule text */}
              <p className="flex-grow text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {rule}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Expand/collapse button */}
      {hasMoreRules && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full min-h-[44px]',
            'text-sm',
            'text-primary-600 dark:text-primary-400',
            'hover:text-primary-700 dark:hover:text-primary-300',
            'hover:bg-primary-50 dark:hover:bg-primary-900/30',
            'active:scale-[0.98]'
          )}
          aria-expanded={isExpanded}
          aria-controls="rules-list"
        >
          {isExpanded ? (
            <>
              <IconChevronUp className="w-4 h-4 mr-2" />
              Show less
            </>
          ) : (
            <>
              <IconChevronDown className="w-4 h-4 mr-2" />
              Show {hiddenCount} more {hiddenCount === 1 ? 'rule' : 'rules'}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default GroupRules;
