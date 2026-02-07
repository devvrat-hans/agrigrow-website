'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconHistory, IconMessageCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { PageHeader, MobileBottomNav } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  FeatureSelection,
  DiagnosisWizard,
  DiagnosisResult,
  PlanningWizard,
  PlanningResult,
} from '@/components/crop-ai';
import type { DiagnosisResult as DiagnosisResultType } from '@/types/diagnosis';
import type { PlanningResult as PlanningResultType } from '@/types/planning';
import type { PlanningWizardFormValues } from '@/components/crop-ai/planning/PlanningWizard';

/**
 * Page modes for the Crop AI feature
 */
type PageMode = 
  | 'feature-selection'
  | 'diagnosis-wizard'
  | 'diagnosis-result'
  | 'planning-wizard'
  | 'planning-result';

/**
 * Get page title based on current mode
 */
function getPageTitle(mode: PageMode): string {
  switch (mode) {
    case 'feature-selection':
      return 'Crop AI';
    case 'diagnosis-wizard':
      return 'AI Crop Diagnosis';
    case 'diagnosis-result':
      return 'Diagnosis Results';
    case 'planning-wizard':
      return 'Crop Planning';
    case 'planning-result':
      return 'Crop Recommendations';
    default:
      return 'Crop AI';
  }
}

export default function CropAIPage() {
  // State
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>('feature-selection');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResultType | null>(null);
  const [planningResult, setPlanningResult] = useState<PlanningResultType | null>(null);
  const [planningInputData, setPlanningInputData] = useState<PlanningWizardFormValues | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle feature selection
  const handleSelectDiagnosis = useCallback(() => {
    setMode('diagnosis-wizard');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectPlanning = useCallback(() => {
    setMode('planning-wizard');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle diagnosis completion
  const handleDiagnosisComplete = useCallback((result: DiagnosisResultType) => {
    setDiagnosisResult(result);
    setMode('diagnosis-result');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle planning completion
  const handlePlanningComplete = useCallback((result: PlanningResultType, inputData: PlanningWizardFormValues) => {
    setPlanningResult(result);
    setPlanningInputData(inputData);
    setMode('planning-result');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle going back to feature selection
  const handleBackToSelection = useCallback(() => {
    setMode('feature-selection');
    setDiagnosisResult(null);
    setPlanningResult(null);
    setPlanningInputData(null);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle starting new diagnosis
  const handleNewDiagnosis = useCallback(() => {
    setDiagnosisResult(null);
    setMode('diagnosis-wizard');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle starting new planning
  const handleNewPlanning = useCallback(() => {
    setPlanningResult(null);
    setPlanningInputData(null);
    setMode('planning-wizard');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Navigate to Ask AI page
  const navigateToAskAI = useCallback(() => {
    router.push('/ask-ai');
  }, [router]);

  // Render main content based on mode
  const renderContent = () => {
    switch (mode) {
      case 'diagnosis-wizard':
        return (
          <DiagnosisWizard
            onComplete={handleDiagnosisComplete}
            onCancel={handleBackToSelection}
          />
        );

      case 'diagnosis-result':
        if (diagnosisResult) {
          return (
            <DiagnosisResult
              result={diagnosisResult}
              onNewDiagnosis={handleNewDiagnosis}
            />
          );
        }
        // Fall through to feature selection if no result
        return <FeatureSelection onSelectDiagnosis={handleSelectDiagnosis} onSelectPlanning={handleSelectPlanning} />;

      case 'planning-wizard':
        return (
          <PlanningWizard
            onComplete={handlePlanningComplete}
            onCancel={handleBackToSelection}
          />
        );

      case 'planning-result':
        if (planningResult && planningInputData) {
          return (
            <PlanningResult
              result={planningResult}
              inputData={planningInputData}
              onNewPlanning={handleNewPlanning}
            />
          );
        }
        // Fall through to feature selection if no result
        return <FeatureSelection onSelectDiagnosis={handleSelectDiagnosis} onSelectPlanning={handleSelectPlanning} />;

      case 'feature-selection':
      default:
        return (
          <FeatureSelection
            onSelectDiagnosis={handleSelectDiagnosis}
            onSelectPlanning={handleSelectPlanning}
          />
        );
    }
  };

  // Check if we need a back button
  const showBackButton = mode !== 'feature-selection';

  // Header right action - History button (only on feature selection)
  const headerRightAction = !showBackButton ? (
    <Button
      variant="ghost"
      size="sm"
      asChild
    >
      <a href="/crop-ai/history" className="flex items-center gap-2">
        <IconHistory className="w-4 h-4" />
        <span className="hidden sm:inline">History</span>
      </a>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      asChild
    >
      <a href="/crop-ai/history" className="flex items-center gap-2">
        <IconHistory className="w-4 h-4" />
      </a>
    </Button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Page Header - Standardized with back button or logo */}
      <PageHeader
        showBackButton={showBackButton}
        onBack={handleBackToSelection}
        title={showBackButton ? getPageTitle(mode) : undefined}
        rightAction={headerRightAction}
      />

      {/* Scrollable Main Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-20 md:pb-8"
      >
        <main className="max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6">
          {renderContent()}
        </main>
      </div>

      {/* Floating Action Button for Chat - Navigates to /ask-ai */}
      <button
        onClick={navigateToAskAI}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
