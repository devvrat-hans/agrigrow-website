'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common';
import { cn } from '@/lib/utils';
import { IconLoader2 } from '@tabler/icons-react';
import { LANGUAGES } from '@/constants/languages';
import { useTranslation } from '@/hooks/useTranslation';

type OnboardingStep = 'language' | 'profile' | 'role' | 'location' | 'crops' | 'experience' | 'interests' | 'student_academic' | 'student_interests' | 'student_purpose' | 'business_type' | 'business_focus';

interface Role {
  id: 'farmer' | 'student' | 'business';
  name: string;
  description: string;
  icon: string;
}

interface Interest {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Degree {
  id: string;
  name: string;
}

interface YearOfStudy {
  id: string;
  name: string;
}

interface StudentBackground {
  id: string;
  name: string;
}

interface StudentInterest {
  id: string;
  name: string;
  icon: string;
}

interface StudentPurpose {
  id: string;
  name: string;
  icon: string;
}

interface OrganizationType {
  id: string;
  name: string;
  icon: string;
}

interface BusinessFocusArea {
  id: string;
  name: string;
  icon: string;
}

interface State {
  code: string;
  name: string;
}

interface Crop {
  id: string;
  name: string;
  icon: string;
}

interface ExperienceLevel {
  id: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  name: string;
  description: string;
}

/** Languages imported from shared constants */
const languages = LANGUAGES;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromParams = searchParams.get('phone') || '';
  const { t, setLanguage } = useTranslation();
  
  const [step, setStep] = useState<OnboardingStep>('language');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingOnboarded, setIsCheckingOnboarded] = useState(true);

  // Check if user is already onboarded
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Get phone from params or localStorage
      const phone = phoneFromParams || localStorage.getItem('userPhone');
      
      if (!phone) {
        // No phone found, redirect to signin
        router.push('/auth/signin');
        return;
      }

      try {
        const response = await fetch(`/api/user/me?phone=${phone}`);
        const data = await response.json();
        
        if (data.success && data.user && data.user.isOnboarded) {
          // User is already onboarded, redirect to home
          router.push('/home');
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
      
      setIsCheckingOnboarded(false);
    };

    checkOnboardingStatus();
  }, [phoneFromParams, router]);

  // Form data
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'student' | 'business' | ''>('');
  const [selectedState, setSelectedState] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<'beginner' | 'intermediate' | 'experienced' | 'expert' | ''>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Student specific fields
  const [studentDegree, setStudentDegree] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [studentBackground, setStudentBackground] = useState('');
  const [studentInterestsSelected, setStudentInterestsSelected] = useState<string[]>([]);
  const [studentPurposesSelected, setStudentPurposesSelected] = useState<string[]>([]);

  // Business specific fields
  const [organizationType, setOrganizationType] = useState('');
  const [businessFocusSelected, setBusinessFocusSelected] = useState<string[]>([]);

  // Translated data arrays
  const roles: Role[] = [
    { id: 'farmer', name: t('onboarding.farmer'), description: t('onboarding.farmerDesc'), icon: '🌾' },
    { id: 'student', name: t('onboarding.student'), description: t('onboarding.studentDesc'), icon: '📚' },
    { id: 'business', name: t('onboarding.business'), description: t('onboarding.businessDesc'), icon: '🏢' },
  ];

  const states: State[] = [
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CG', name: 'Chhattisgarh' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OD', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TS', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UK', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' },
  ];

  const crops: Crop[] = [
    { id: 'rice', name: t('onboarding.crops.rice'), icon: '🌾' },
    { id: 'wheat', name: t('onboarding.crops.wheat'), icon: '🌾' },
    { id: 'cotton', name: t('onboarding.crops.cotton'), icon: '🧵' },
    { id: 'sugarcane', name: t('onboarding.crops.sugarcane'), icon: '🎋' },
    { id: 'vegetables', name: t('onboarding.crops.vegetables'), icon: '🥬' },
    { id: 'fruits', name: t('onboarding.crops.fruits'), icon: '🍎' },
    { id: 'pulses', name: t('onboarding.crops.pulses'), icon: '🫘' },
    { id: 'oilseeds', name: t('onboarding.crops.oilseeds'), icon: '🌻' },
    { id: 'spices', name: t('onboarding.crops.spices'), icon: '🌶️' },
    { id: 'millets', name: t('onboarding.crops.millets'), icon: '🌾' },
    { id: 'maize', name: t('onboarding.crops.maize'), icon: '🌽' },
    { id: 'other', name: t('onboarding.crops.other'), icon: '🌱' },
  ];

  const experienceLevels: ExperienceLevel[] = [
    { id: 'beginner', name: t('onboarding.beginner'), description: t('onboarding.beginnerDesc') },
    { id: 'intermediate', name: t('onboarding.intermediate'), description: t('onboarding.intermediateDesc') },
    { id: 'experienced', name: t('onboarding.experienced'), description: t('onboarding.experiencedDesc') },
    { id: 'expert', name: t('onboarding.expert'), description: t('onboarding.expertDesc') },
  ];

  const farmerInterests: Interest[] = [
    { id: 'organic_farming', name: t('onboarding.interests.organicFarming'), description: t('onboarding.interests.organicFarmingDesc'), icon: '🌿' },
    { id: 'equipment_machinery', name: t('onboarding.interests.equipmentMachinery'), description: t('onboarding.interests.equipmentMachineryDesc'), icon: '🚜' },
    { id: 'fertilizer_pesticides', name: t('onboarding.interests.fertilizerPesticides'), description: t('onboarding.interests.fertilizerPesticidesDesc'), icon: '🧪' },
    { id: 'animal_husbandry', name: t('onboarding.interests.animalHusbandry'), description: t('onboarding.interests.animalHusbandryDesc'), icon: '🐄' },
    { id: 'agri_business_news', name: t('onboarding.interests.agriBusinessNews'), description: t('onboarding.interests.agriBusinessNewsDesc'), icon: '📰' },
    { id: 'agriculture_practices', name: t('onboarding.interests.agriculturePractices'), description: t('onboarding.interests.agriculturePracticesDesc'), icon: '📋' },
    { id: 'market_prices', name: t('onboarding.interests.marketPrices'), description: t('onboarding.interests.marketPricesDesc'), icon: '💰' },
    { id: 'food_processing', name: t('onboarding.interests.foodProcessing'), description: t('onboarding.interests.foodProcessingDesc'), icon: '🏭' },
  ];

  const degrees: Degree[] = [
    { id: 'bsc_agriculture', name: t('onboarding.degreeOptions.bscAgriculture') },
    { id: 'msc_agriculture', name: t('onboarding.degreeOptions.mscAgriculture') },
    { id: 'phd', name: t('onboarding.degreeOptions.phd') },
    { id: 'mba_abm', name: t('onboarding.degreeOptions.mbaAbm') },
    { id: 'diploma_other', name: t('onboarding.degreeOptions.diplomaOther') },
  ];

  const yearsOfStudy: YearOfStudy[] = [
    { id: 'final_year', name: t('onboarding.yearOptions.finalYear') },
    { id: 'recently_graduated', name: t('onboarding.yearOptions.recentlyGraduated') },
    { id: 'alumni', name: t('onboarding.yearOptions.alumni') },
  ];

  const studentBackgrounds: StudentBackground[] = [
    { id: 'farming_family', name: t('onboarding.backgroundOptions.farmingFamily') },
    { id: 'non_farming', name: t('onboarding.backgroundOptions.nonFarming') },
  ];

  const studentInterests: StudentInterest[] = [
    { id: 'crop_production', name: t('onboarding.studentInterestOptions.cropProduction'), icon: '🌾' },
    { id: 'soil_science', name: t('onboarding.studentInterestOptions.soilScience'), icon: '🌱' },
    { id: 'plant_pathology', name: t('onboarding.studentInterestOptions.plantPathology'), icon: '🔬' },
    { id: 'agribusiness_marketing', name: t('onboarding.studentInterestOptions.agribusinessMarketing'), icon: '💼' },
    { id: 'agricultural_economics', name: t('onboarding.studentInterestOptions.agriculturalEconomics'), icon: '📊' },
    { id: 'precision_agriculture', name: t('onboarding.studentInterestOptions.precisionAgriculture'), icon: '🤖' },
    { id: 'livestock_dairy', name: t('onboarding.studentInterestOptions.livestockDairy'), icon: '🐄' },
    { id: 'sustainability_climate', name: t('onboarding.studentInterestOptions.sustainabilityClimate'), icon: '🌍' },
  ];

  const studentPurposes: StudentPurpose[] = [
    { id: 'learn_from_farmers', name: t('onboarding.studentPurposeOptions.learnFromFarmers'), icon: '📚' },
    { id: 'share_research', name: t('onboarding.studentPurposeOptions.shareResearch'), icon: '📝' },
    { id: 'connect_experts', name: t('onboarding.studentPurposeOptions.connectExperts'), icon: '👨‍🔬' },
    { id: 'internship', name: t('onboarding.studentPurposeOptions.internship'), icon: '🎓' },
    { id: 'startup_innovation', name: t('onboarding.studentPurposeOptions.startupInnovation'), icon: '💡' },
  ];

  const organizationTypes: OrganizationType[] = [
    { id: 'agri_input', name: t('onboarding.orgTypes.agriInput'), icon: '🌱' },
    { id: 'agri_tech', name: t('onboarding.orgTypes.agriTech'), icon: '🤖' },
    { id: 'fpo', name: t('onboarding.orgTypes.fpo'), icon: '👥' },
    { id: 'ngo', name: t('onboarding.orgTypes.ngo'), icon: '🤝' },
    { id: 'government', name: t('onboarding.orgTypes.government'), icon: '🏛️' },
    { id: 'research', name: t('onboarding.orgTypes.research'), icon: '🔬' },
    { id: 'kvk', name: t('onboarding.orgTypes.kvk'), icon: '📖' },
    { id: 'food_processor', name: t('onboarding.orgTypes.foodProcessor'), icon: '🏭' },
  ];

  const businessFocusAreas: BusinessFocusArea[] = [
    { id: 'crop_advisory', name: t('onboarding.businessFocusOptions.cropAdvisory'), icon: '🌾' },
    { id: 'market_linkages', name: t('onboarding.businessFocusOptions.marketLinkages'), icon: '🔗' },
    { id: 'input_supply', name: t('onboarding.businessFocusOptions.inputSupply'), icon: '📦' },
    { id: 'financial_services', name: t('onboarding.businessFocusOptions.financialServices'), icon: '💰' },
    { id: 'training', name: t('onboarding.businessFocusOptions.training'), icon: '📚' },
    { id: 'research_trials', name: t('onboarding.businessFocusOptions.researchTrials'), icon: '🔬' },
    { id: 'policy', name: t('onboarding.businessFocusOptions.policy'), icon: '📋' },
  ];

  // Get dynamic steps based on role
  const getStepsForRole = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = ['language', 'profile', 'role'];
    
    if (selectedRole === 'farmer') {
      return [...baseSteps, 'location', 'crops', 'interests'];
    } else if (selectedRole === 'student') {
      return [...baseSteps, 'student_academic', 'location', 'student_interests', 'student_purpose'];
    } else if (selectedRole === 'business') {
      return [...baseSteps, 'business_type', 'location', 'business_focus'];
    }
    
    return baseSteps;
  };

  const steps = getStepsForRole();
  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleCropToggle = (cropId: string) => {
    setSelectedCrops(prev =>
      prev.includes(cropId)
        ? prev.filter(id => id !== cropId)
        : [...prev, cropId]
    );
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleStudentInterestToggle = (interestId: string) => {
    setStudentInterestsSelected(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleStudentPurposeToggle = (purposeId: string) => {
    setStudentPurposesSelected(prev =>
      prev.includes(purposeId)
        ? prev.filter(id => id !== purposeId)
        : [...prev, purposeId]
    );
  };

  const handleBusinessFocusToggle = (focusId: string) => {
    setBusinessFocusSelected(prev =>
      prev.includes(focusId)
        ? prev.filter(id => id !== focusId)
        : [...prev, focusId]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const userData: Record<string, unknown> = {
        phone: phoneFromParams,
        fullName,
        bio,
        role: selectedRole,
        language: selectedLanguage,
        state: selectedState,
        district,
      };

      // Add role-specific data
      if (selectedRole === 'farmer') {
        userData.crops = selectedCrops;
        userData.interests = selectedInterests;
        userData.experienceLevel = selectedExperience || 'beginner';
      } else if (selectedRole === 'student') {
        userData.studentDegree = studentDegree;
        userData.collegeName = collegeName;
        userData.yearOfStudy = yearOfStudy;
        userData.studentBackground = studentBackground;
        userData.studentInterests = studentInterestsSelected;
        userData.studentPurposes = studentPurposesSelected;
        userData.experienceLevel = 'beginner';
      } else if (selectedRole === 'business') {
        userData.organizationType = organizationType;
        userData.businessFocusAreas = businessFocusSelected;
        userData.experienceLevel = 'expert';
      }

      const response = await fetch('/api/user/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // Store language preference
        setLanguage(selectedLanguage as 'en' | 'hi');
        router.push('/home');
      } else {
        setError(data.error || 'Failed to save profile');
      }
    } catch {
      // For now, continue without backend
      console.log('Backend not connected, proceeding without save');
      router.push('/home');
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 'language':
        return !!selectedLanguage;
      case 'profile':
        return fullName.trim().length >= 2;
      case 'role':
        return !!selectedRole;
      case 'location':
        return !!selectedState;
      case 'crops':
        return selectedCrops.length > 0;
      case 'experience':
        return !!selectedExperience;
      case 'interests':
        return selectedInterests.length > 0;
      case 'student_academic':
        return !!studentDegree && !!collegeName && !!yearOfStudy && !!studentBackground;
      case 'student_interests':
        return studentInterestsSelected.length > 0;
      case 'student_purpose':
        return studentPurposesSelected.length > 0;
      case 'business_type':
        return !!organizationType;
      case 'business_focus':
        return businessFocusSelected.length > 0;
      default:
        return false;
    }
  };

  // Show loading state while checking if user is already onboarded
  if (isCheckingOnboarded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-border bg-background z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i <= currentStepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content - scrollable area between header and footer */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto">
          {/* Language Selection */}
          {step === 'language' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.chooseLanguage')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.chooseLanguageDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => {
                  const isAvailable = lang.status === 'available';
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedLanguage(lang.code);
                          setLanguage(lang.code as 'en' | 'hi');
                        }
                      }}
                      disabled={!isAvailable}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all relative",
                        isAvailable
                          ? isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 cursor-pointer"
                          : "border-border/50 opacity-60 cursor-not-allowed bg-muted/30"
                      )}
                    >
                      <p className={cn(
                        "font-medium",
                        isAvailable ? "text-foreground" : "text-muted-foreground"
                      )}>{lang.nativeName}</p>
                      <p className="text-sm text-muted-foreground">{lang.name}</p>
                      {isAvailable ? (
                        <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t('onboarding.available')}
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {t('onboarding.comingSoon')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile Details */}
          {step === 'profile' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.tellAboutYourself')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.tellAboutYourselfDesc')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.fullName')} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('onboarding.fullNamePlaceholder')}
                    maxLength={100}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.shortBio')} ({t('onboarding.optional')})
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('onboarding.shortBioPlaceholder')}
                    maxLength={500}
                    rows={4}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bio.length}/500 {t('onboarding.characters')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          {step === 'role' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.iAmA')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.iAmADesc')}
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4",
                      selectedRole === role.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-3xl">{role.icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Student Academic Details */}
          {step === 'student_academic' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.academicDetails')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.academicDetailsDesc')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.degree')} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={studentDegree}
                    onChange={(e) => setStudentDegree(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">{t('onboarding.selectDegree')}</option>
                    {degrees.map((degree) => (
                      <option key={degree.id} value={degree.id}>
                        {degree.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.collegeName')} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder={t('onboarding.collegeNamePlaceholder')}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.yearOfStudy')} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">{t('onboarding.selectYear')}</option>
                    {yearsOfStudy.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.background')} <span className="text-destructive">*</span>
                  </label>
                  <div className="space-y-2">
                    {studentBackgrounds.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setStudentBackground(bg.id)}
                        className={cn(
                          "w-full p-3 rounded-lg border-2 text-left transition-all",
                          studentBackground === bg.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-foreground">{bg.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Type Selection */}
          {step === 'business_type' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.organizationType')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.organizationTypeDesc')}
                </p>
              </div>

              <div className="space-y-3">
                {organizationTypes.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setOrganizationType(org.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4",
                      organizationType === org.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{org.icon}</span>
                    <p className="font-medium text-foreground">{org.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location Selection */}
          {step === 'location' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.whereLocated')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.whereLocatedDesc')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.state')} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">{t('onboarding.selectState')}</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('onboarding.district')} ({t('onboarding.optional')})
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={t('onboarding.enterDistrict')}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Crop Interests */}
          {step === 'crops' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.whatCrops')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.whatCropsDesc')}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {crops.map((crop) => (
                  <button
                    key={crop.id}
                    onClick={() => handleCropToggle(crop.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      selectedCrops.includes(crop.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl block mb-1">{crop.icon}</span>
                    <p className="text-sm font-medium text-foreground">{crop.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Experience Level */}
          {step === 'experience' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.experienceLevel')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.experienceLevelDesc')}
                </p>
              </div>

              <div className="space-y-3">
                {experienceLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedExperience(level.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all",
                      selectedExperience === level.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium text-foreground">{level.name}</p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {/* Farmer Interests */}
          {step === 'interests' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.whatInterests')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.whatInterestsDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {farmerInterests.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      selectedInterests.includes(interest.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">{interest.icon}</span>
                    </div>
                    <p className="font-medium text-foreground text-sm mb-1">{interest.name}</p>
                    <p className="text-xs text-muted-foreground">{interest.description}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {/* Student Interests */}
          {step === 'student_interests' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.areaOfInterest')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.areaOfInterestDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {studentInterests.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => handleStudentInterestToggle(interest.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      studentInterestsSelected.includes(interest.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{interest.icon}</span>
                      <p className="font-medium text-foreground text-sm">{interest.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {/* Student Purpose */}
          {step === 'student_purpose' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.purposeOnPlatform')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.purposeDesc')}
                </p>
              </div>

              <div className="space-y-3">
                {studentPurposes.map((purpose) => (
                  <button
                    key={purpose.id}
                    onClick={() => handleStudentPurposeToggle(purpose.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4",
                      studentPurposesSelected.includes(purpose.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{purpose.icon}</span>
                    <p className="font-medium text-foreground">{purpose.name}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {/* Business Focus Areas */}
          {step === 'business_focus' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.focusAreas')}
                </h1>
                <p className="text-muted-foreground">
                  {t('onboarding.focusAreasDesc')}
                </p>
              </div>

              <div className="space-y-3">
                {businessFocusAreas.map((focus) => (
                  <button
                    key={focus.id}
                    onClick={() => handleBusinessFocusToggle(focus.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4",
                      businessFocusSelected.includes(focus.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{focus.icon}</span>
                    <p className="font-medium text-foreground">{focus.name}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer - always visible at bottom */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-t border-border bg-background"
        style={{
          // Add safe area padding for devices with home indicators
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-2xl mx-auto flex gap-4">
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              {t('common.back')}
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || isLoading}
            className="flex-1"
            size="lg"
          >
            {currentStepIndex === steps.length - 1
              ? isLoading
                ? t('onboarding.settingUp')
                : t('onboarding.completeSetup')
              : t('common.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <IconLoader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

// Main export wrapped in Suspense
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}
