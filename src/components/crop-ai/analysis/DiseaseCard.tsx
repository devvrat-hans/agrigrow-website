'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconCircleCheck, IconShieldCheck, IconFlask, IconLeaf } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { DiseaseDetection, DiseaseSeverity } from '@/types/crop-ai';

// TYPES

export interface DiseaseCardProps {
  /** Disease detection data */
  disease: DiseaseDetection;
  /** Whether the card is expanded */
  expanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggle?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state (for uncontrolled usage) */
  defaultExpanded?: boolean;
}

type TreatmentTab = 'organic' | 'chemical';

// SEVERITY CONFIGURATIONS

const SEVERITY_CONFIG: Record<DiseaseSeverity, {
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  low: {
    iconColor: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  medium: {
    iconColor: 'text-yellow-500 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  high: {
    iconColor: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

/**
 * DiseaseCard Component
 * 
 * Expandable card showing disease details with symptoms, treatments, and prevention.
 * Supports both controlled and uncontrolled expand states.
 */
export function DiseaseCard({
  disease,
  expanded: controlledExpanded,
  onToggle,
  className,
  defaultExpanded = false,
}: DiseaseCardProps) {
  // Internal expanded state for uncontrolled usage
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<TreatmentTab>('organic');

  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [onToggle]);

  // Get severity config
  const severityConfig = useMemo(() => {
    return SEVERITY_CONFIG[disease.severity] || SEVERITY_CONFIG.medium;
  }, [disease.severity]);

  // Categorize treatments (simple heuristic: check for keywords)
  const categorizedTreatments = useMemo(() => {
    const organic: string[] = [];
    const chemical: string[] = [];

    const organicKeywords = ['neem', 'organic', 'natural', 'compost', 'manure', 'biological', 'bio', 'mulch', 'crop rotation', 'companion', 'garlic', 'chili', 'water', 'prune', 'remove'];
    const chemicalKeywords = ['spray', 'fungicide', 'pesticide', 'insecticide', 'chemical', 'copper', 'sulfur', 'carbaryl', 'malathion', 'chlorpyrifos', 'mancozeb', 'carbendazim'];

    disease.treatment.forEach((treatment) => {
      const lowerTreatment = treatment.toLowerCase();
      const isChemical = chemicalKeywords.some((kw) => lowerTreatment.includes(kw));
      const isOrganic = organicKeywords.some((kw) => lowerTreatment.includes(kw));

      if (isChemical && !isOrganic) {
        chemical.push(treatment);
      } else if (isOrganic && !isChemical) {
        organic.push(treatment);
      } else {
        // If unclear or both, add to organic (safer default)
        organic.push(treatment);
      }
    });

    return { organic, chemical };
  }, [disease.treatment]);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        severityConfig.borderColor,
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'p-3 sm:p-4',
          'text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20',
          'active:bg-gray-100 dark:active:bg-gray-800'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Severity Icon */}
          {disease.severity === 'high' && (
            <IconAlertTriangle
              className={cn('w-5 h-5 flex-shrink-0', severityConfig.iconColor)}
            />
          )}

          {/* Disease Name */}
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {disease.name}
            </h4>
            {disease.scientificName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                {disease.scientificName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Severity Badge */}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              disease.severity === 'low' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
              disease.severity === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
              disease.severity === 'high' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
            )}
          >
            {disease.severity.charAt(0).toUpperCase() + disease.severity.slice(1)}
          </span>
          
          {/* Expand Icon */}
          {isExpanded ? (
            <IconChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <IconChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Symptoms Section */}
          <div className={cn('p-3 sm:p-4', severityConfig.bgColor)}>
            <h5 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <IconCircleCheck className="w-4 h-4" />
              Symptoms
            </h5>
            <ul className="space-y-2">
              {disease.symptoms.map((symptom, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                >
                  <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                  {symptom}
                </li>
              ))}
            </ul>
          </div>

          {/* Treatment Section */}
          <div className="p-3 sm:p-4">
            <h5 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <IconFlask className="w-4 h-4" />
              Treatment
            </h5>

            {/* Treatment Tabs */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('organic')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                  'transition-colors duration-150',
                  activeTab === 'organic'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                <IconLeaf className="w-3.5 h-3.5" />
                Organic
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chemical')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                  'transition-colors duration-150',
                  activeTab === 'chemical'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                <IconFlask className="w-3.5 h-3.5" />
                Chemical
              </button>
            </div>

            {/* Treatment List */}
            <ul className="space-y-2">
              {(activeTab === 'organic' ? categorizedTreatments.organic : categorizedTreatments.chemical).length > 0 ? (
                (activeTab === 'organic' ? categorizedTreatments.organic : categorizedTreatments.chemical).map((treatment, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0',
                        activeTab === 'organic' ? 'bg-green-500' : 'bg-blue-500'
                      )}
                    />
                    {treatment}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No {activeTab} treatments available for this condition.
                </li>
              )}
            </ul>
          </div>

          {/* Prevention Section */}
          {disease.prevention && disease.prevention.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
              <h5 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <IconShieldCheck className="w-4 h-4" />
                Prevention Tips
              </h5>
              <ul className="space-y-2">
                {disease.prevention.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                  >
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default DiseaseCard;
