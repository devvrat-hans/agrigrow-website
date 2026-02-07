'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconX, IconShare, IconTrash, IconAlertTriangle, IconVirus, IconDroplet, IconBug, IconCloud, IconSparkles, IconNotes } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CropAnalysisResult } from '@/types/crop-ai';
import { AnalysisSummary } from './AnalysisSummary';
import { DiseasesList } from './DiseasesList';
import { DeficienciesList } from './DeficienciesList';
import { PestsList } from './PestsList';
import { WeatherAlert } from './WeatherAlert';
import { YieldSuggestions } from './YieldSuggestions';
import { AnalysisTabs, TabPanel } from './tabs';

// TYPES

export interface AnalysisDetailProps {
  /** Full analysis result */
  analysis: CropAnalysisResult;
  /** Callback when close is triggered */
  onClose?: () => void;
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for delete action */
  onDelete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

type TabValue = 'issues' | 'weather' | 'recommendations';

interface TabConfigItem {
  id: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// TAB CONFIGURATIONS FOR NEW AnalysisTabs COMPONENT

const TAB_ITEMS: TabConfigItem[] = [
  { id: 'issues', label: 'Issues', icon: IconAlertTriangle },
  { id: 'weather', label: 'Weather', icon: IconCloud },
  { id: 'recommendations', label: 'Tips', icon: IconSparkles },
];

// DELETE CONFIRMATION MODAL

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ isOpen, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <IconTrash className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Delete Analysis?
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            This action cannot be undone. The analysis and all its data will be permanently removed.
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * AnalysisDetail Component
 * 
 * Full detail view of crop analysis with tabbed sections.
 * Composes AnalysisSummary, issues lists, weather, and recommendations.
 */
export function AnalysisDetail({
  analysis,
  onClose,
  onShare,
  onDelete,
  className,
}: AnalysisDetailProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('issues');
  const [userNotes, setUserNotes] = useState(analysis.userNotes || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handle tab change
  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab);
  }, []);

  // Handle notes change
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserNotes(e.target.value);
  }, []);

  // Handle delete
  const handleDeleteClick = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    onDelete?.();
  }, [onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  // Calculate issue counts for tab badges
  const issueCounts = useMemo(() => ({
    diseases: analysis.diseases?.length || 0,
    deficiencies: analysis.nutrientDeficiencies?.length || 0,
    pests: analysis.pests?.length || 0,
    total: (analysis.diseases?.length || 0) + 
           (analysis.nutrientDeficiencies?.length || 0) + 
           (analysis.pests?.length || 0),
  }), [analysis.diseases, analysis.nutrientDeficiencies, analysis.pests]);

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <IconX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Analysis Details
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="flex items-center gap-1.5"
            >
              <IconShare className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <IconTrash className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        <div className="p-3 sm:p-4">
          <AnalysisSummary
            analysis={analysis}
            showActions={false}
          />
        </div>

        {/* Tabs - Mobile Optimized with Horizontal Scroll */}
        <AnalysisTabs
          tabs={TAB_ITEMS.map((tab) => {
            let badge: number | undefined;
            if (tab.id === 'issues') {
              badge = issueCounts.total > 0 ? issueCounts.total : undefined;
            }
            return {
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              badge,
            };
          })}
          activeTab={activeTab}
          onTabChange={(id) => handleTabChange(id as TabValue)}
        />

        {/* Tab Content */}
        <div className="p-3 sm:p-4">
          {/* Issues Tab */}
          <TabPanel isActive={activeTab === 'issues'}>
            <div className="space-y-4 sm:space-y-6">
              {/* Diseases */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IconVirus className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Diseases
                  </h3>
                </div>
                <DiseasesList
                  diseases={analysis.diseases || []}
                  emptyMessage="No diseases detected"
                />
              </section>

              {/* Nutrient Deficiencies */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IconDroplet className="w-5 h-5 text-amber-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Nutrient Deficiencies
                  </h3>
                </div>
                <DeficienciesList
                  deficiencies={analysis.nutrientDeficiencies || []}
                  emptyMessage="No nutrient deficiencies detected"
                />
              </section>

              {/* Pests */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <IconBug className="w-5 h-5 text-orange-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Pests
                  </h3>
                </div>
                <PestsList
                  pests={analysis.pests || []}
                  emptyMessage="No pests detected"
                />
              </section>
            </div>
          </TabPanel>

          {/* Weather Tab */}
          <TabPanel isActive={activeTab === 'weather'}>
            <div>
              {analysis.weather ? (
                <WeatherAlert
                  weather={analysis.weather}
                  suggestions={analysis.weatherSuggestions || { current: [], upcoming: [], rainPreparation: [] }}
                />
              ) : (
                <Card className="p-6 sm:p-8 text-center">
                  <IconCloud className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Weather data not available for this analysis
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Add location to get weather-based recommendations
                  </p>
                </Card>
              )}
            </div>
          </TabPanel>

          {/* Recommendations Tab */}
          <TabPanel isActive={activeTab === 'recommendations'}>
            <div className="space-y-4 sm:space-y-6">
              {/* Yield Suggestions */}
              <YieldSuggestions
                suggestions={analysis.yieldSuggestions || []}
                cropType={analysis.cropType}
              />

              {/* User Notes */}
              <Card className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconNotes className="w-5 h-5 text-gray-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Personal Notes
                  </h3>
                </div>
                <textarea
                  value={userNotes}
                  onChange={handleNotesChange}
                  placeholder="Add your personal notes about this analysis..."
                  className={cn(
                    'w-full min-h-[100px] sm:min-h-[120px] p-3',
                    'text-sm text-gray-700 dark:text-gray-300',
                    'bg-gray-50 dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'rounded-lg',
                    'resize-y',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                  )}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Notes are saved locally
                </p>
              </Card>
            </div>
          </TabPanel>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

export default AnalysisDetail;
