'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconLoader2, IconCamera, IconX, IconAlertCircle, IconUser } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { MobileBottomNav, PageHeader, LoadingSpinner, ResponsiveImage } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableDropdown, SingleSelectGroup } from '@/components/crop-ai/common';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/constants/indian-locations';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * User data interface for editing
 */
interface EditableUserData {
  fullName: string;
  bio: string;
  language: string;
  state: string;
  district: string;
  role: 'farmer' | 'student' | 'business';
  // Farmer fields
  crops?: string[];
  experienceLevel?: string;
  interests?: string[];
  // Student fields
  studentDegree?: string;
  collegeName?: string;
  yearOfStudy?: string;
  studentBackground?: string;
  studentInterests?: string[];
  studentPurposes?: string[];
  // Business fields
  organizationType?: string;
  businessFocusAreas?: string[];
}

/**
 * Form error interface
 */
interface FormErrors {
  fullName?: string;
  bio?: string;
  state?: string;
  district?: string;
  general?: string;
}

/**
 * Experience level options for farmers
 */
const EXPERIENCE_OPTIONS = [
  { value: 'beginner', labelKey: 'profile.edit.beginner', descriptionKey: 'profile.edit.beginnerDesc' },
  { value: 'intermediate', labelKey: 'profile.edit.intermediate', descriptionKey: 'profile.edit.intermediateDesc' },
  { value: 'experienced', labelKey: 'profile.edit.experienced', descriptionKey: 'profile.edit.experiencedDesc' },
  { value: 'expert', labelKey: 'profile.edit.expert', descriptionKey: 'profile.edit.expertDesc' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditableUserData>({
    fullName: '',
    bio: '',
    language: 'en',
    state: '',
    district: '',
    role: 'farmer',
  });

  // Profile image file input ref
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  // Use image upload hook for profile image (single image mode)
  const {
    selectedImages: selectedProfileImages,
    uploading: profileImageUploading,
    errors: profileImageErrors,
    uploadProgress: profileImageProgress,
    selectImages: selectProfileImage,
    removeImage: removeProfileImage,
    clearAll: _clearProfileImage,
    getBase64Images: getProfileImageBase64,
  } = useImageUpload({
    maxImages: 1,
    maxSizePerImageMB: 5,
    compressionQuality: 0.85,
    maxWidth: 800, // Smaller size for profile images
  });

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedPhone = localStorage.getItem('userPhone');

        if (!storedPhone) {
          router.push('/auth/signin');
          return;
        }

        const response = await fetch(`/api/user/me?phone=${storedPhone}`);
        const data = await response.json();

        if (data.success) {
          setFormData({
            fullName: data.user.fullName || '',
            bio: data.user.bio || '',
            language: data.user.language || 'en',
            state: data.user.state || '',
            district: data.user.district || '',
            role: data.user.role || 'farmer',
            crops: data.user.crops || [],
            experienceLevel: data.user.experienceLevel || 'beginner',
            interests: data.user.interests || [],
            studentDegree: data.user.studentDegree || '',
            collegeName: data.user.collegeName || '',
            yearOfStudy: data.user.yearOfStudy || '',
            studentBackground: data.user.studentBackground || '',
            studentInterests: data.user.studentInterests || [],
            studentPurposes: data.user.studentPurposes || [],
            organizationType: data.user.organizationType || '',
            businessFocusAreas: data.user.businessFocusAreas || [],
          });
          // Set current profile image if exists
          if (data.user.profileImage) {
            setCurrentProfileImage(data.user.profileImage);
          }
        } else {
          setErrors({ general: data.error || 'Failed to load profile' });
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setErrors({ general: 'Failed to load profile' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Get district options based on selected state
  const districtOptions = formData.state
    ? (STATE_DISTRICTS[formData.state] || []).map((d) => ({ value: d, label: d }))
    : [];

  // State options
  const stateOptions = INDIAN_STATES.map((s) => ({
    value: s.code,
    label: s.name,
    description: s.type === 'union_territory' ? 'Union Territory' : undefined,
  }));

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('profile.edit.fullNameRequired');
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = t('profile.edit.fullNameMinLength');
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = t('profile.edit.bioMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.fullName, formData.bio]);

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    // Don't save while profile image is uploading
    if (profileImageUploading) {
      setErrors({ general: t('profile.edit.waitForImage') });
      return;
    }

    setIsSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const storedPhone = localStorage.getItem('userPhone');

      if (!storedPhone) {
        router.push('/auth/signin');
        return;
      }

      // Get profile image base64 if a new image was selected
      const profileImageBase64 = getProfileImageBase64();
      const newProfileImage = profileImageBase64.length > 0 ? profileImageBase64[0] : undefined;

      const response = await fetch('/api/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: storedPhone,
          ...formData,
          // Include profile image if a new one was selected
          ...(newProfileImage && { profileImage: newProfileImage }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(t('profile.edit.profileUpdated'));
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
      } else {
        setErrors({ general: data.error || t('profile.edit.failedToUpdate') });
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrors({ general: t('profile.edit.failedToUpdateRetry') });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes
  const handleChange = (field: keyof EditableUserData, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Reset district when state changes
      ...(field === 'state' ? { district: '' } : {}),
    }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Header */}
      <PageHeader
        showBackButton
        title={t('profile.edit.title')}
        rightAction={
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="min-w-[44px] min-h-[44px] gap-2"
          >
            {isSaving ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconCheck className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{t('profile.edit.save')}</span>
          </Button>
        }
      />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-green-50 dark:bg-green-900/20',
              'border border-green-200 dark:border-green-800'
            )}
          >
            <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <IconCheck className="w-5 h-5" />
              {successMessage}
            </p>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div
            className={cn(
              'p-4 rounded-xl',
              'bg-red-50 dark:bg-red-900/20',
              'border border-red-200 dark:border-red-800'
            )}
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.general}
            </p>
          </div>
        )}

        {/* Profile Image Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('profile.edit.profilePhoto')}
          </h2>

          {/* Hidden file input */}
          <input
            ref={profileImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                selectProfileImage(files);
              }
              e.target.value = '';
            }}
            className="hidden"
            disabled={isSaving || profileImageUploading}
          />

          <div className="flex items-center gap-4">
            {/* Profile image preview */}
            <div className="relative">
              <div
                className={cn(
                  'w-24 h-24 rounded-full overflow-hidden',
                  'bg-gray-100 dark:bg-gray-800',
                  'border-2 border-gray-200 dark:border-gray-700',
                  'flex items-center justify-center'
                )}
              >
                {/* Show new selected image if available */}
                {selectedProfileImages.length > 0 ? (
                  <ResponsiveImage
                    src={selectedProfileImages[0].preview}
                    alt="New profile"
                    isAvatar
                    objectFit="cover"
                    fallbackComponent={
                      <IconUser className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    }
                  />
                ) : currentProfileImage ? (
                  <ResponsiveImage
                    src={currentProfileImage}
                    alt="Current profile"
                    isAvatar
                    objectFit="cover"
                    fallbackComponent={
                      <IconUser className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    }
                  />
                ) : (
                  <IconUser className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                )}
              </div>

              {/* Remove new image button */}
              {selectedProfileImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeProfileImage(selectedProfileImages[0].id)}
                  disabled={isSaving || profileImageUploading}
                  className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full',
                    'bg-red-500 text-white',
                    'flex items-center justify-center',
                    'hover:bg-red-600 active:scale-95',
                    'shadow-md',
                    (isSaving || profileImageUploading) && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label="Remove photo"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Change/Add photo button */}
            <div className="flex-1 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => profileImageInputRef.current?.click()}
                disabled={isSaving || profileImageUploading}
                className="min-h-[44px] gap-2"
              >
                <IconCamera className="w-4 h-4" />
                {selectedProfileImages.length > 0 || currentProfileImage
                  ? t('profile.edit.changePhoto')
                  : t('profile.edit.addPhoto')}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.edit.imageFormatNote')}
              </p>
            </div>
          </div>

          {/* Upload progress */}
          {profileImageUploading && profileImageProgress > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${profileImageProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('profile.edit.processingImage')} {profileImageProgress}%
              </p>
            </div>
          )}

          {/* Image upload errors */}
          {profileImageErrors.length > 0 && (
            <div className="space-y-1">
              {profileImageErrors.map((error) => (
                <p key={error.id} className="text-xs text-red-500 flex items-center gap-1">
                  <IconAlertCircle size={12} />
                  {error.message}
                </p>
              ))}
            </div>
          )}
        </section>

        {/* Basic Information Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('profile.edit.basicInformation')}
          </h2>

          {/* Full Name */}
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className={cn(
                'block text-sm font-medium',
                errors.fullName ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {t('profile.edit.fullName')} <span className="text-red-500">*</span>
            </label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder={t('profile.edit.enterFullName')}
              className={cn(
                'w-full min-h-[48px]',
                errors.fullName && 'border-red-500 focus:border-red-500'
              )}
            />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label
              htmlFor="bio"
              className={cn(
                'block text-sm font-medium',
                errors.bio ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {t('profile.edit.bio')} <span className="text-gray-400 text-xs">{t('profile.edit.bioOptional')}</span>
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder={t('profile.edit.bioPlaceholder')}
              rows={3}
              maxLength={500}
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-white dark:bg-gray-900',
                'border border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
                'resize-none',
                errors.bio && 'border-red-500 focus:border-red-500'
              )}
            />
            <div className="flex justify-between text-xs">
              {errors.bio ? (
                <p className="text-red-500">{errors.bio}</p>
              ) : (
                <span />
              )}
              <span className="text-gray-400">
                {formData.bio.length}/500
              </span>
            </div>
          </div>

        </section>

        {/* Location Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('profile.edit.location')}
          </h2>

          {/* State */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.edit.stateLabel')}
            </label>
            <SearchableDropdown
              options={stateOptions}
              value={formData.state}
              onChange={(value) => handleChange('state', value)}
              placeholder={t('profile.edit.selectState')}
            />
          </div>

          {/* District */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.edit.districtLabel')}
            </label>
            <SearchableDropdown
              options={districtOptions}
              value={formData.district}
              onChange={(value) => handleChange('district', value)}
              placeholder={
                formData.state
                  ? t('profile.edit.selectDistrict')
                  : t('profile.edit.selectStateFirst')
              }
              disabled={!formData.state}
            />
          </div>
        </section>

        {/* Role-specific sections */}
        {formData.role === 'farmer' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.edit.farmingDetails')}
            </h2>

            {/* Experience Level */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.experienceLevel')}
              </label>
              <SingleSelectGroup
                options={EXPERIENCE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey), description: t(opt.descriptionKey) }))}
                value={formData.experienceLevel || 'beginner'}
                onChange={(value) => handleChange('experienceLevel', value)}
                columns={2}
              />
            </div>
          </section>
        )}

        {formData.role === 'student' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.edit.educationDetails')}
            </h2>

            {/* College Name */}
            <div className="space-y-2">
              <label
                htmlFor="collegeName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('profile.edit.collegeLabel')}
              </label>
              <Input
                id="collegeName"
                type="text"
                value={formData.collegeName || ''}
                onChange={(e) => handleChange('collegeName', e.target.value)}
                placeholder={t('profile.edit.enterCollege')}
                className="w-full min-h-[48px]"
              />
            </div>

            {/* Degree */}
            <div className="space-y-2">
              <label
                htmlFor="studentDegree"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('profile.edit.degreeLabel')}
              </label>
              <Input
                id="studentDegree"
                type="text"
                value={formData.studentDegree || ''}
                onChange={(e) => handleChange('studentDegree', e.target.value)}
                placeholder={t('profile.edit.degreePlaceholder')}
                className="w-full min-h-[48px]"
              />
            </div>

            {/* Year of Study */}
            <div className="space-y-2">
              <label
                htmlFor="yearOfStudy"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('profile.edit.yearLabel')}
              </label>
              <Input
                id="yearOfStudy"
                type="text"
                value={formData.yearOfStudy || ''}
                onChange={(e) => handleChange('yearOfStudy', e.target.value)}
                placeholder={t('profile.edit.yearPlaceholder')}
                className="w-full min-h-[48px]"
              />
            </div>
          </section>
        )}

        {formData.role === 'business' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.edit.businessDetails')}
            </h2>

            {/* Organization Type */}
            <div className="space-y-2">
              <label
                htmlFor="organizationType"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('profile.edit.orgTypeLabel')}
              </label>
              <Input
                id="organizationType"
                type="text"
                value={formData.organizationType || ''}
                onChange={(e) => handleChange('organizationType', e.target.value)}
                placeholder={t('profile.edit.orgTypePlaceholder')}
                className="w-full min-h-[48px]"
              />
            </div>
          </section>
        )}

        {/* Save Button (Mobile) */}
        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full min-h-[48px] gap-2"
          >
            {isSaving ? (
              <>
                <IconLoader2 className="w-5 h-5 animate-spin" />
                {t('profile.edit.saving')}
              </>
            ) : (
              <>
                <IconCheck className="w-5 h-5" />
                {t('profile.edit.saveChanges')}
              </>
            )}
          </Button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
