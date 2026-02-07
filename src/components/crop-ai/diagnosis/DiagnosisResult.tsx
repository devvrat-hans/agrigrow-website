'use client';

import { useState } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconBug,
  IconDroplet,
  IconShieldCheck,
  IconFirstAidKit,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DiagnosisResult as DiagnosisResultType, DiagnosisIssue } from '@/types/diagnosis';

/**
 * Props for DiagnosisResult component
 */
interface DiagnosisResultProps {
  /** The diagnosis result data */
  result: DiagnosisResultType;
  /** Callback when user wants to start a new diagnosis */
  onNewDiagnosis: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Get color based on health score
 */
function getHealthColor(score: number): {
  bg: string;
  text: string;
  stroke: string;
  label: string;
} {
  if (score >= 70) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      stroke: 'stroke-green-500',
      label: 'Good',
    };
  } else if (score >= 40) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      stroke: 'stroke-yellow-500',
      label: 'Fair',
    };
  } else {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      stroke: 'stroke-red-500',
      label: 'Poor',
    };
  }
}

/**
 * Get confidence color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-red-500';
  if (confidence >= 60) return 'bg-orange-500';
  if (confidence >= 40) return 'bg-yellow-500';
  return 'bg-gray-400';
}

/**
 * Circular Health Gauge Component
 */
function HealthGauge({ score }: { score: number }) {
  const colors = getHealthColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-32 h-32 sm:w-40 sm:h-40 -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={colors.stroke}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl sm:text-4xl font-bold', colors.text)}>
          {score}
        </span>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Health Score
        </span>
      </div>
    </div>
  );
}

/**
 * Expandable Issue Card Component
 */
function IssueCard({ issue, index }: { issue: DiagnosisIssue; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const confidenceColor = getConfidenceColor(issue.confidence);

  return (
    <div
      className={cn(
        'rounded-xl border',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        'overflow-hidden',
        'shadow-sm'
      )}
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between',
          'p-3 sm:p-4',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          'transition-colors duration-200'
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'flex items-center justify-center flex-shrink-0',
              'w-9 h-9 sm:w-10 sm:h-10 rounded-lg',
              'bg-red-100 dark:bg-red-900/30'
            )}
          >
            <IconBug className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          </div>
          <div className="text-left min-w-0 flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {issue.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {issue.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
          {/* Confidence badge */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={cn('w-2 h-2 rounded-full', confidenceColor)} />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
              {issue.confidence}%
            </span>
          </div>
          {isExpanded ? (
            <IconChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <IconChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          {/* Symptoms */}
          {issue.symptoms.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <IconAlertTriangle className="w-4 h-4 text-yellow-500" />
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Symptoms
                </h5>
              </div>
              <ul className="space-y-1 ml-6">
                {issue.symptoms.map((symptom, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 list-disc"
                  >
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Causes */}
          {issue.causes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <IconDroplet className="w-4 h-4 text-blue-500" />
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Possible Causes
                </h5>
              </div>
              <ul className="space-y-1 ml-6">
                {issue.causes.map((cause, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 list-disc"
                  >
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Treatment */}
          {issue.treatment.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <IconFirstAidKit className="w-4 h-4 text-green-500" />
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Treatment
                </h5>
              </div>
              <ul className="space-y-1 ml-6">
                {issue.treatment.map((treatment, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 list-disc"
                  >
                    {treatment}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prevention */}
          {issue.prevention.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <IconShieldCheck className="w-4 h-4 text-purple-500" />
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prevention
                </h5>
              </div>
              <ul className="space-y-1 ml-6">
                {issue.prevention.map((prevention, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 list-disc"
                  >
                    {prevention}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * DiagnosisResult Component
 * 
 * Displays the diagnosis analysis results including:
 * - Overall health score as a circular gauge
 * - List of possible issues as expandable cards
 * - General recommendations section
 * - Option to start a new diagnosis
 */
export function DiagnosisResult({
  result,
  onNewDiagnosis,
  className,
}: DiagnosisResultProps) {
  const healthColors = getHealthColor(result.overallHealthScore);

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2
          className={cn(
            'text-xl sm:text-2xl font-bold',
            'text-gray-900 dark:text-white',
            'mb-2'
          )}
        >
          Diagnosis Results
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          AI analysis of your crop health
        </p>
      </div>

      {/* Health Score Gauge */}
      <div
        className={cn(
          'flex flex-col items-center',
          'p-6 rounded-2xl',
          healthColors.bg,
          'mb-8'
        )}
      >
        <HealthGauge score={result.overallHealthScore} />
        <div className="mt-4 text-center">
          <span
            className={cn(
              'inline-flex items-center gap-2',
              'px-4 py-2 rounded-full',
              'text-sm font-medium',
              healthColors.text,
              'bg-white/60 dark:bg-gray-900/40'
            )}
          >
            {result.overallHealthScore >= 70 ? (
              <IconCheck className="w-4 h-4" />
            ) : (
              <IconAlertTriangle className="w-4 h-4" />
            )}
            {healthColors.label} Health Condition
          </span>
        </div>
      </div>

      {/* Possible Issues */}
      {result.possibleIssues.length > 0 && (
        <div className="mb-8">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-4'
            )}
          >
            Identified Issues ({result.possibleIssues.length})
          </h3>
          <div className="space-y-4">
            {result.possibleIssues.map((issue, index) => (
              <IssueCard key={index} issue={issue} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* General Recommendations */}
      {result.generalRecommendations.length > 0 && (
        <div className="mb-8">
          <h3
            className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-white',
              'mb-4'
            )}
          >
            General Recommendations
          </h3>
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-blue-50 dark:bg-blue-900/20',
              'border border-blue-100 dark:border-blue-800'
            )}
          >
            <ul className="space-y-2">
              {result.generalRecommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <IconCheck className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {rec}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* No Issues Found */}
      {result.possibleIssues.length === 0 && (
        <div
          className={cn(
            'p-6 rounded-xl text-center',
            'bg-green-50 dark:bg-green-900/20',
            'border border-green-100 dark:border-green-800',
            'mb-8'
          )}
        >
          <IconCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
            No Major Issues Detected
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300">
            Your crop appears to be healthy. Continue with regular care and monitoring.
          </p>
        </div>
      )}

      {/* New Diagnosis Button */}
      <div className="flex justify-center">
        <Button
          onClick={onNewDiagnosis}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <IconRefresh className="w-5 h-5" />
          Start New Diagnosis
        </Button>
      </div>
    </div>
  );
}

export type { DiagnosisResultProps };
