'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common';
import { cn } from '@/lib/utils';
import { IconLoader2 } from '@tabler/icons-react';
import { LANGUAGES } from '@/constants/languages';

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

const roles: Role[] = [
  { id: 'farmer', name: 'Farmer', description: 'I grow crops and manage farmland', icon: '🌾' },
  { id: 'student', name: 'Agriculture Student', description: 'I am studying agriculture', icon: '📚' },
  { id: 'business', name: 'Business/Organization', description: 'Agri-business, agency, or organization', icon: '🏢' },
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
  { id: 'rice', name: 'Rice', icon: '🌾' },
  { id: 'wheat', name: 'Wheat', icon: '🌾' },
  { id: 'cotton', name: 'Cotton', icon: '🧵' },
  { id: 'sugarcane', name: 'Sugarcane', icon: '🎋' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'pulses', name: 'Pulses', icon: '🫘' },
  { id: 'oilseeds', name: 'Oilseeds', icon: '🌻' },
  { id: 'spices', name: 'Spices', icon: '🌶️' },
  { id: 'millets', name: 'Millets', icon: '🌾' },
  { id: 'maize', name: 'Maize', icon: '🌽' },
  { id: 'other', name: 'Other', icon: '🌱' },
];

const experienceLevels: ExperienceLevel[] = [
  { id: 'beginner', name: 'Beginner', description: 'New to farming or just starting out' },
  { id: 'intermediate', name: 'Intermediate', description: '2-5 years of farming experience' },
  { id: 'experienced', name: 'Experienced', description: '5-10 years of farming experience' },
  { id: 'expert', name: 'Expert', description: 'More than 10 years of experience' },
];

const farmerInterests: Interest[] = [
  { id: 'organic_farming', name: 'Organic Farming', description: 'Natural farming methods', icon: '🌿' },
  { id: 'equipment_machinery', name: 'Equipment & Machinery', description: 'Farm equipment and tools', icon: '🚜' },
  { id: 'fertilizer_pesticides', name: 'Fertilizer & Pesticides', description: 'Crop protection and nutrition', icon: '🧪' },
  { id: 'animal_husbandry', name: 'Animal Husbandry', description: 'Livestock and dairy farming', icon: '🐄' },
  { id: 'agri_business_news', name: 'Agri Business News', description: 'Industry news and updates', icon: '📰' },
  { id: 'agriculture_practices', name: 'Agriculture Practices', description: 'Best farming practices', icon: '📋' },
  { id: 'market_prices', name: 'Market Prices', description: 'Crop prices and trends', icon: '💰' },
  { id: 'food_processing', name: 'Food Processing', description: 'Value addition and processing', icon: '🏭' },
];

const degrees: Degree[] = [
  { id: 'bsc_agriculture', name: 'B.Sc Agriculture' },
  { id: 'msc_agriculture', name: 'M.Sc Agriculture' },
  { id: 'phd', name: 'PhD' },
  { id: 'mba_abm', name: 'MBA (ABM)' },
  { id: 'diploma_other', name: 'Diploma / Other' },
];

const yearsOfStudy: YearOfStudy[] = [
  { id: 'final_year', name: 'Final Year' },
  { id: 'recently_graduated', name: 'Recently Graduated' },
  { id: 'alumni', name: 'Alumni' },
];

const studentBackgrounds: StudentBackground[] = [
  { id: 'farming_family', name: 'Farming Family' },
  { id: 'non_farming', name: 'Non-farming Background' },
];

const studentInterests: StudentInterest[] = [
  { id: 'crop_production', name: 'Crop Production', icon: '🌾' },
  { id: 'soil_science', name: 'Soil Science', icon: '🌱' },
  { id: 'plant_pathology', name: 'Plant Pathology', icon: '🔬' },
  { id: 'agribusiness_marketing', name: 'Agribusiness & Marketing', icon: '💼' },
  { id: 'agricultural_economics', name: 'Agricultural Economics', icon: '📊' },
  { id: 'precision_agriculture', name: 'Precision / Digital Agriculture', icon: '🤖' },
  { id: 'livestock_dairy', name: 'Livestock & Dairy', icon: '🐄' },
  { id: 'sustainability_climate', name: 'Sustainability & Climate', icon: '🌍' },
];

const studentPurposes: StudentPurpose[] = [
  { id: 'learn_from_farmers', name: 'Learn from Farmers', icon: '📚' },
  { id: 'share_research', name: 'Share Research / Field Learnings', icon: '📝' },
  { id: 'connect_experts', name: 'Connect with Experts (KVKs, Scientists)', icon: '👨‍🔬' },
  { id: 'internship', name: 'Internship / Field Exposure', icon: '🎓' },
  { id: 'startup_innovation', name: 'Startup / Innovation', icon: '💡' },
];

const organizationTypes: OrganizationType[] = [
  { id: 'agri_input', name: 'Agri-Input Company (Seeds, Fertilizers, Pesticides)', icon: '🌱' },
  { id: 'agri_tech', name: 'Agri-Tech Startup', icon: '🤖' },
  { id: 'fpo', name: 'FPO / Farmer Producer Organization', icon: '👥' },
  { id: 'ngo', name: 'NGO', icon: '🤝' },
  { id: 'government', name: 'Government Agency', icon: '🏛️' },
  { id: 'research', name: 'Research Institute / University', icon: '🔬' },
  { id: 'kvk', name: 'KVK / Extension Body', icon: '📖' },
  { id: 'food_processor', name: 'Food Processor / Buyer', icon: '🏭' },
];

const businessFocusAreas: BusinessFocusArea[] = [
  { id: 'crop_advisory', name: 'Crop Advisory', icon: '🌾' },
  { id: 'market_linkages', name: 'Market Linkages', icon: '🔗' },
  { id: 'input_supply', name: 'Input Supply', icon: '📦' },
  { id: 'financial_services', name: 'Financial Services', icon: '💰' },
  { id: 'training', name: 'Training & Capacity Building', icon: '📚' },
  { id: 'research_trials', name: 'Research & Trials', icon: '🔬' },
  { id: 'policy', name: 'Policy & Scheme Implementation', icon: '📋' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromParams = searchParams.get('phone') || '';
  
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
        // Store language preference for voice recognition
        localStorage.setItem('userLanguage', selectedLanguage);
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
          <p className="text-sm text-muted-foreground">Loading...</p>
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
                  Choose your language
                </h1>
                <p className="text-muted-foreground">
                  Select your preferred language for the app
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => {
                  const isAvailable = lang.status === 'available';
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => isAvailable && setSelectedLanguage(lang.code)}
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
                          Available
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Coming Soon
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
                  Tell us about yourself
                </h1>
                <p className="text-muted-foreground">
                  This helps other farmers know who you are
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    maxLength={100}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Short Bio (Optional)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a bit about yourself, your farm, or your interests..."
                    maxLength={500}
                    rows={4}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bio.length}/500 characters
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
                  I am a...
                </h1>
                <p className="text-muted-foreground">
                  This helps us personalize your experience
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
                  Academic Details
                </h1>
                <p className="text-muted-foreground">
                  Tell us about your educational background
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Degree <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={studentDegree}
                    onChange={(e) => setStudentDegree(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select your degree</option>
                    {degrees.map((degree) => (
                      <option key={degree.id} value={degree.id}>
                        {degree.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    College / University Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter your college/university name"
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Year of Study <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select year</option>
                    {yearsOfStudy.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Background <span className="text-destructive">*</span>
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
                  Organization Type
                </h1>
                <p className="text-muted-foreground">
                  Select the type of organization you represent
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
                  Where are you located?
                </h1>
                <p className="text-muted-foreground">
                  This helps us show you relevant content and connect you with nearby farmers
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    State <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select your state</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    District (Optional)
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Enter your district"
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
                  What crops interest you?
                </h1>
                <p className="text-muted-foreground">
                  Select all that apply. You can change this later.
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
                  What&apos;s your experience level?
                </h1>
                <p className="text-muted-foreground">
                  This helps us tailor content to your needs
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
                  What interests you?
                </h1>
                <p className="text-muted-foreground">
                  Select topics you want to learn more about. You can change this later.
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
                  Area of Interest
                </h1>
                <p className="text-muted-foreground">
                  Select your specialization areas. You can select multiple.
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
                  Purpose on Platform
                </h1>
                <p className="text-muted-foreground">
                  What do you want to achieve here? Select all that apply.
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
                  Focus Areas
                </h1>
                <p className="text-muted-foreground">
                  What areas does your organization focus on? Select all that apply.
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
              Back
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
                ? 'Setting up...'
                : 'Complete Setup'
              : 'Continue'}
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
