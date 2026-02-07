'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  GroupType,
  GroupPrivacy,
  GroupRule,
  GroupSettings,
} from '@/types/group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconPlant,
  IconMapPin,
  IconBulb,
  IconTool,
  IconWorld,
  IconLock,
  IconUserPlus,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
  IconPlus,
  IconTrash,
  IconX,
  IconDeviceFloppy,
  IconPhoto,
  IconUpload,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';
import { useImageUpload, type SelectedImage, type ImageUploadError } from '@/hooks/useImageUpload';

// ============================================
// TYPES
// ============================================

interface FormData {
  groupType: GroupType | null;
  name: string;
  description: string;
  icon: string;
  coverImage?: string; // Base64 or URL
  privacy: GroupPrivacy;
  crops: string[];
  region: string;
  tags: string[];
  rules: GroupRule[];
  settings: GroupSettings;
}

/**
 * Extended props for steps that need image upload
 */
interface ImageStepProps extends StepProps {
  coverImages: SelectedImage[];
  coverImageUploading: boolean;
  coverImageErrors: ImageUploadError[];
  coverImageProgress: number;
  selectCoverImage: (files: FileList) => void;
  removeCoverImage: (id: string) => void;
  iconImages: SelectedImage[];
  iconImageUploading: boolean;
  iconImageErrors: ImageUploadError[];
  iconImageProgress: number;
  selectIconImage: (files: FileList) => void;
  removeIconImage: (id: string) => void;
  coverImageInputRef: React.RefObject<HTMLInputElement | null>;
  iconImageInputRef: React.RefObject<HTMLInputElement | null>;
}

interface StepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: Record<string, string>;
}

// ============================================
// CONSTANTS
// ============================================

const INITIAL_FORM_DATA: FormData = {
  groupType: null,
  name: '',
  description: '',
  icon: '🌾',
  privacy: 'public',
  crops: [],
  region: '',
  tags: [],
  rules: [],
  settings: {
    allowMemberPosts: true,
    requirePostApproval: false,
    allowPolls: true,
    allowImages: true,
  },
};

const GROUP_TYPES: {
  value: GroupType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'crop',
    label: 'Crop Based',
    description: 'Focus on specific crops like wheat, rice, cotton, etc.',
    icon: IconPlant,
  },
  {
    value: 'region',
    label: 'Region Based',
    description: 'Connect farmers from a specific geographic area',
    icon: IconMapPin,
  },
  {
    value: 'topic',
    label: 'Topic Based',
    description: 'Discuss specific agricultural topics and techniques',
    icon: IconBulb,
  },
  {
    value: 'practice',
    label: 'Practice Based',
    description: 'Share farming practices like organic, sustainable, etc.',
    icon: IconTool,
  },
];

const PRIVACY_OPTIONS: {
  value: GroupPrivacy;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can find and join this group',
    icon: IconWorld,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Anyone can find, but must request to join',
    icon: IconLock,
  },
  {
    value: 'invite-only',
    label: 'Invite Only',
    description: 'Only invited users can find and join',
    icon: IconUserPlus,
  },
];

const EMOJI_OPTIONS = [
  '🌾', '🌽', '🍚', '🌱', '🌿', '🥬', '🍅', '🥕',
  '🍇', '🍎', '🥭', '🌻', '🌳', '🐄', '🐔', '🚜',
  '💧', '☀️', '🌍', '👨‍🌾', '👩‍🌾', '📚', '💡', '🤝',
];

const CROPS_LIST = [
  'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean',
  'Groundnut', 'Mustard', 'Sunflower', 'Pulses', 'Millet',
  'Jowar', 'Bajra', 'Barley', 'Chickpea', 'Pigeon Pea',
  'Vegetables', 'Fruits', 'Spices', 'Tea', 'Coffee', 'Jute',
];

const REGIONS_LIST = [
  'North India', 'South India', 'East India', 'West India', 'Central India',
  'Punjab', 'Haryana', 'Uttar Pradesh', 'Bihar', 'West Bengal',
  'Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Tamil Nadu',
  'Karnataka', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Odisha',
];

const STEPS = [
  { id: 'type', title: 'Group Type', shortTitle: 'Type' },
  { id: 'basic', title: 'Basic Info', shortTitle: 'Info' },
  { id: 'details', title: 'Details', shortTitle: 'Details' },
  { id: 'privacy', title: 'Privacy', shortTitle: 'Privacy' },
  { id: 'rules', title: 'Rules', shortTitle: 'Rules' },
  { id: 'review', title: 'Review', shortTitle: 'Review' },
];

const DRAFT_STORAGE_KEY = 'agrigrow_create_group_draft';

// ============================================
// STEP COMPONENTS
// ============================================

/**
 * Step 1: Group Type Selection
 */
function GroupTypeStep({ formData, updateFormData, errors }: StepProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          What type of group do you want to create?
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          This will help members find and understand your community
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {GROUP_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.groupType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => updateFormData({ groupType: type.value })}
              className={cn(
                'flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 text-left transition-all min-h-[44px]',
                'active:scale-[0.98]',
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-sm sm:text-base font-medium block',
                  isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                )}>
                  {type.label}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 block">
                  {type.description}
                </span>
              </div>
              {isSelected && (
                <IconCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {errors.groupType && (
        <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
          <IconAlertCircle className="h-4 w-4" />
          {errors.groupType}
        </p>
      )}
    </div>
  );
}

/**
 * Step 2: Basic Info
 */
function BasicInfoStep({ 
  formData, 
  updateFormData, 
  errors,
  coverImages,
  coverImageUploading,
  coverImageErrors,
  coverImageProgress,
  selectCoverImage,
  removeCoverImage,
  iconImages,
  iconImageUploading,
  iconImageErrors,
  iconImageProgress,
  selectIconImage,
  removeIconImage,
  coverImageInputRef,
  iconImageInputRef,
}: ImageStepProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Tell us about your group
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Give your group a name, icon, and cover image
        </p>
      </div>

      {/* Cover Image Upload */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Cover Image <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        
        {/* Hidden file input */}
        <input
          ref={coverImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              selectCoverImage(files);
            }
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Cover image preview */}
        {coverImages.length > 0 ? (
          <div className="relative aspect-[3/1] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={coverImages[0].preview}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeCoverImage(coverImages[0].id)}
              className={cn(
                'absolute top-2 right-2 w-8 h-8 rounded-full',
                'bg-black/60 text-white flex items-center justify-center',
                'hover:bg-black/80 active:scale-95',
                'transition-colors'
              )}
              aria-label="Remove cover image"
            >
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverImageInputRef.current?.click()}
            disabled={coverImageUploading}
            className={cn(
              'w-full aspect-[3/1] rounded-lg border-2 border-dashed',
              'border-gray-300 dark:border-gray-600',
              'flex flex-col items-center justify-center gap-2',
              'text-gray-500 dark:text-gray-400',
              'hover:border-primary-400 hover:text-primary-500',
              'hover:bg-primary-50/50 dark:hover:bg-primary-950/20',
              'transition-colors cursor-pointer',
              coverImageUploading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <IconPhoto size={32} />
            <span className="text-sm font-medium">Add Cover Image</span>
            <span className="text-xs text-gray-400">Recommended: 1200x400px, max 5MB</span>
          </button>
        )}

        {/* Cover image upload progress */}
        {coverImageUploading && coverImageProgress > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${coverImageProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">Processing... {coverImageProgress}%</p>
          </div>
        )}

        {/* Cover image errors */}
        {coverImageErrors.length > 0 && (
          <div className="space-y-1">
            {coverImageErrors.map((error) => (
              <p key={error.id} className="text-xs text-red-500 flex items-center gap-1">
                <IconAlertCircle size={12} />
                {error.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Group Icon - Emoji or Custom Image */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Group Icon
        </label>
        
        {/* Hidden icon file input */}
        <input
          ref={iconImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              selectIconImage(files);
            }
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="flex items-center gap-3">
          {/* Icon display/button */}
          {iconImages.length > 0 ? (
            <div className="relative">
              <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <img
                  src={iconImages[0].preview}
                  alt="Icon preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeIconImage(iconImages[0].id)}
                className={cn(
                  'absolute -top-1 -right-1 w-5 h-5 rounded-full',
                  'bg-red-500 text-white flex items-center justify-center',
                  'hover:bg-red-600 active:scale-95',
                  'shadow-md'
                )}
                aria-label="Remove icon"
              >
                <IconX size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                'w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-gray-200 dark:border-gray-700',
                'flex items-center justify-center text-2xl sm:text-3xl',
                'hover:border-primary-400 dark:hover:border-primary-500',
                'transition-colors min-h-[44px] active:scale-[0.95]'
              )}
            >
              {formData.icon}
            </button>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && iconImages.length === 0 && (
            <div className="p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      updateFormData({ icon: emoji });
                      setShowEmojiPicker(false);
                    }}
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                      'min-h-[36px] active:scale-[0.9]',
                      formData.icon === emoji && 'bg-primary-100 dark:bg-primary-900'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload custom icon button */}
          {iconImages.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => iconImageInputRef.current?.click()}
              disabled={iconImageUploading}
              className="min-h-[44px] gap-2"
            >
              <IconUpload size={16} />
              Upload Icon
            </Button>
          )}
        </div>

        {/* Icon upload progress */}
        {iconImageUploading && iconImageProgress > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${iconImageProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">Processing... {iconImageProgress}%</p>
          </div>
        )}

        {/* Icon errors */}
        {iconImageErrors.length > 0 && (
          <div className="space-y-1">
            {iconImageErrors.map((error) => (
              <p key={error.id} className="text-xs text-red-500 flex items-center gap-1">
                <IconAlertCircle size={12} />
                {error.message}
              </p>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Choose an emoji or upload a custom icon (recommended: square, max 2MB)
        </p>
      </div>

      {/* Group Name */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Group Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="E.g., Wheat Farmers Community"
          maxLength={100}
          className={cn('min-h-[44px]', errors.name ? 'border-red-500' : '')}
        />
        {errors.name ? (
          <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-4 w-4" />
            {errors.name}
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400">{formData.name.length}/100 characters</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Describe what your group is about..."
          rows={4}
          maxLength={500}
          className="resize-none min-h-[100px]"
        />
        <p className="text-xs sm:text-sm text-gray-400">{formData.description.length}/500 characters</p>
      </div>
    </div>
  );
}

/**
 * Step 3: Details (Crops or Region based on group type)
 */
function DetailsStep({ formData, updateFormData, errors }: StepProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || formData.tags.includes(tag) || formData.tags.length >= 10) return;
    updateFormData({ tags: [...formData.tags, tag] });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateFormData({ tags: formData.tags.filter((t) => t !== tagToRemove) });
  };

  const handleToggleCrop = (crop: string) => {
    const normalizedCrop = crop.toLowerCase();
    if (formData.crops.includes(normalizedCrop)) {
      updateFormData({ crops: formData.crops.filter((c) => c !== normalizedCrop) });
    } else {
      updateFormData({ crops: [...formData.crops, normalizedCrop] });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          {formData.groupType === 'crop' ? 'Select Crops' : 
           formData.groupType === 'region' ? 'Select Region' : 'Add Details'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Help members find your group more easily
        </p>
      </div>

      {/* Crop Selection (for crop type) */}
      {formData.groupType === 'crop' && (
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
            Select Crops <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {CROPS_LIST.map((crop) => {
              const isSelected = formData.crops.includes(crop.toLowerCase());
              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => handleToggleCrop(crop)}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors min-h-[36px] sm:min-h-[40px] active:scale-[0.95]',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {crop}
                </button>
              );
            })}
          </div>
          {errors.crops && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <IconAlertCircle className="h-4 w-4" />
              {errors.crops}
            </p>
          )}
        </div>
      )}

      {/* Region Selection (for region type) */}
      {formData.groupType === 'region' && (
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
            Select Region <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {REGIONS_LIST.map((region) => {
              const isSelected = formData.region === region;
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => updateFormData({ region })}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors min-h-[36px] sm:min-h-[40px] active:scale-[0.95]',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {region}
                </button>
              );
            })}
          </div>
          {errors.region && (
            <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
              <IconAlertCircle className="h-4 w-4" />
              {errors.region}
            </p>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="space-y-1.5 sm:space-y-2">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Tags (optional)
        </label>
        
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
            {formData.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 min-w-[24px] min-h-[24px] flex items-center justify-center"
                >
                  <IconX className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add a tag..."
            maxLength={30}
            className="flex-1 min-h-[44px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTag}
            disabled={!tagInput.trim() || formData.tags.length >= 10}
            className="min-h-[44px] min-w-[44px] active:scale-[0.95]"
          >
            <IconPlus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">{formData.tags.length}/10 tags</p>
      </div>
    </div>
  );
}

/**
 * Step 4: Privacy and Settings
 */
function PrivacyStep({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Set Privacy & Permissions
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Control who can join and what members can do
        </p>
      </div>

      {/* Privacy Level */}
      <div className="space-y-2 sm:space-y-3">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Privacy Level
        </label>
        {PRIVACY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = formData.privacy === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ privacy: option.value })}
              className={cn(
                'w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 text-left transition-all min-h-[44px]',
                'active:scale-[0.98]',
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <div className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center',
                isSelected
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              )}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-sm sm:text-base font-medium',
                  isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                )}>
                  {option.label}
                </span>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
              {isSelected && <IconCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500" />}
            </button>
          );
        })}
      </div>

      {/* Posting Settings */}
      <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Posting Permissions
        </label>

        <div className="flex items-center justify-between min-h-[44px]">
          <div>
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Allow Member Posts</span>
            <p className="text-xs sm:text-sm text-gray-500">Let members create posts</p>
          </div>
          <Switch
            checked={formData.settings.allowMemberPosts}
            onCheckedChange={(checked) =>
              updateFormData({
                settings: { ...formData.settings, allowMemberPosts: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <div>
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Require Post Approval</span>
            <p className="text-xs sm:text-sm text-gray-500">Posts need admin approval</p>
          </div>
          <Switch
            checked={formData.settings.requirePostApproval}
            onCheckedChange={(checked) =>
              updateFormData({
                settings: { ...formData.settings, requirePostApproval: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <div>
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Allow Polls</span>
            <p className="text-xs sm:text-sm text-gray-500">Members can create polls</p>
          </div>
          <Switch
            checked={formData.settings.allowPolls}
            onCheckedChange={(checked) =>
              updateFormData({
                settings: { ...formData.settings, allowPolls: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <div>
            <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Allow Images</span>
            <p className="text-xs sm:text-sm text-gray-500">Members can upload images</p>
          </div>
          <Switch
            checked={formData.settings.allowImages}
            onCheckedChange={(checked) =>
              updateFormData({
                settings: { ...formData.settings, allowImages: checked },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 5: Rules
 */
function RulesStep({ formData, updateFormData }: StepProps) {
  const [newRule, setNewRule] = useState({ title: '', description: '' });

  const handleAddRule = () => {
    if (!newRule.title.trim()) return;
    updateFormData({
      rules: [...formData.rules, { title: newRule.title.trim(), description: newRule.description.trim() }],
    });
    setNewRule({ title: '', description: '' });
  };

  const handleRemoveRule = (index: number) => {
    updateFormData({
      rules: formData.rules.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Set Group Rules
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Help maintain a healthy community (optional)
        </p>
      </div>

      {/* Existing Rules */}
      {formData.rules.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {formData.rules.map((rule, index) => (
            <div
              key={index}
              className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{rule.title}</h4>
                {rule.description && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{rule.description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRule(index)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 min-h-[36px] min-w-[36px] active:scale-[0.95]"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Rule */}
      {formData.rules.length < 15 && (
        <div className="p-3 sm:p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 space-y-2 sm:space-y-3">
          <Input
            value={newRule.title}
            onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
            placeholder="Rule title (e.g., Be Respectful)"
            maxLength={100}
            className="min-h-[44px]"
          />
          <Textarea
            value={newRule.description}
            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            maxLength={500}
            className="resize-none min-h-[80px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRule}
            disabled={!newRule.title.trim()}
            className="min-h-[44px] active:scale-[0.95]"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      )}

      {formData.rules.length === 0 && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-3 sm:py-4">
          No rules added yet. You can add them later from group settings.
        </p>
      )}
    </div>
  );
}

/**
 * Step 6: Review
 */
function ReviewStep({ formData }: StepProps) {
  const groupType = GROUP_TYPES.find((t) => t.value === formData.groupType);
  const privacy = PRIVACY_OPTIONS.find((p) => p.value === formData.privacy);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Review Your Group
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Make sure everything looks good before creating
        </p>
      </div>

      {/* Preview Card */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xl sm:text-2xl">
              {formData.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                {formData.name || 'Untitled Group'}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{groupType?.label}</Badge>
                <Badge variant="outline" className="text-xs">{privacy?.label}</Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {formData.description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {formData.description}
            </p>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            {formData.crops.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Crops:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.crops.join(', ')}
                </p>
              </div>
            )}
            {formData.region && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Region:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.region}
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Settings Summary */}
          <div className="pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-0.5 sm:space-y-1">
            <p>• {formData.settings.allowMemberPosts ? 'Members can post' : 'Only admins can post'}</p>
            <p>• {formData.settings.requirePostApproval ? 'Posts require approval' : 'Posts are published immediately'}</p>
            <p>• {formData.rules.length} rule{formData.rules.length !== 1 ? 's' : ''} set</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface CreateGroupFormProps {
  className?: string;
}

/**
 * CreateGroupForm Component
 * 
 * Multi-step form wizard for creating a new group.
 */
export function CreateGroupForm({ className }: CreateGroupFormProps) {
  const router = useRouter();
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(() => {
    // Try to load draft from localStorage
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        try {
          return { ...INITIAL_FORM_DATA, ...JSON.parse(draft) };
        } catch {
          // Invalid draft, ignore
        }
      }
    }
    return INITIAL_FORM_DATA;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File input refs for image uploads
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const iconImageInputRef = useRef<HTMLInputElement>(null);

  // Cover image upload hook
  const {
    selectedImages: coverImages,
    uploading: coverImageUploading,
    errors: coverImageErrors,
    uploadProgress: coverImageProgress,
    selectImages: selectCoverImage,
    removeImage: removeCoverImage,
    clearAll: _clearCoverImage,
    getBase64Images: getCoverImageBase64,
  } = useImageUpload({
    maxImages: 1,
    maxSizePerImageMB: 5,
    compressionQuality: 0.85,
    maxWidth: 1920,
  });

  // Icon image upload hook (smaller size for icons)
  const {
    selectedImages: iconImages,
    uploading: iconImageUploading,
    errors: iconImageErrors,
    uploadProgress: iconImageProgress,
    selectImages: selectIconImage,
    removeImage: removeIconImage,
    clearAll: _clearIconImage,
    getBase64Images: getIconImageBase64,
  } = useImageUpload({
    maxImages: 1,
    maxSizePerImageMB: 2,
    compressionQuality: 0.85,
    maxWidth: 512,
  });

  /**
   * Update form data
   */
  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear related errors
    Object.keys(data).forEach((key) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    });
  }, []);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  /**
   * Validate current step
   */
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Type
        if (!formData.groupType) {
          newErrors.groupType = 'Please select a group type';
        }
        break;
      case 1: // Basic
        if (!formData.name.trim()) {
          newErrors.name = 'Group name is required';
        } else if (formData.name.length < 3) {
          newErrors.name = 'Name must be at least 3 characters';
        }
        break;
      case 2: // Details
        if (formData.groupType === 'crop' && formData.crops.length === 0) {
          newErrors.crops = 'Please select at least one crop';
        }
        if (formData.groupType === 'region' && !formData.region) {
          newErrors.region = 'Please select a region';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  /**
   * Go to next step
   */
  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    saveDraft();
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [validateStep, saveDraft]);

  /**
   * Go to previous step
   */
  const handleBack = useCallback(() => {
    saveDraft();
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, [saveDraft]);

  /**
   * Submit form
   */
  const handleSubmit = async () => {
    if (!validateStep()) return;

    // Don't submit while images are uploading
    if (coverImageUploading || iconImageUploading) {
      setSubmitError('Please wait for images to finish processing');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Get base64 images from hooks
      const coverImageBase64 = getCoverImageBase64();
      const iconImageBase64 = getIconImageBase64();

      const response = await apiClient.post<{
        success: boolean;
        data: { _id: string; slug: string };
      }>('/api/groups', {
        name: formData.name,
        groupType: formData.groupType,
        description: formData.description || undefined,
        // Use custom icon image if uploaded, otherwise use emoji
        icon: iconImageBase64.length > 0 ? iconImageBase64[0] : formData.icon,
        // Include coverImage if uploaded
        coverImage: coverImageBase64.length > 0 ? coverImageBase64[0] : undefined,
        privacy: formData.privacy,
        crops: formData.crops.length > 0 ? formData.crops : undefined,
        region: formData.region || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        rules: formData.rules.length > 0 ? formData.rules : undefined,
        settings: formData.settings,
      });

      if (response.data.success) {
        clearDraft();
        // Redirect to new group page
        router.push(`/communities/${response.data.data.slug || response.data.data._id}`);
      }
    } catch (err: unknown) {
      console.error('Error creating group:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Failed to create group. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render current step content
   */
  const renderStep = () => {
    const stepProps: StepProps = {
      formData,
      updateFormData,
      errors,
    };

    switch (currentStep) {
      case 0:
        return <GroupTypeStep {...stepProps} />;
      case 1:
        return (
          <BasicInfoStep
            {...stepProps}
            coverImages={coverImages}
            coverImageUploading={coverImageUploading}
            coverImageErrors={coverImageErrors}
            coverImageProgress={coverImageProgress}
            selectCoverImage={selectCoverImage}
            removeCoverImage={removeCoverImage}
            iconImages={iconImages}
            iconImageUploading={iconImageUploading}
            iconImageErrors={iconImageErrors}
            iconImageProgress={iconImageProgress}
            selectIconImage={selectIconImage}
            removeIconImage={removeIconImage}
            coverImageInputRef={coverImageInputRef}
            iconImageInputRef={iconImageInputRef}
          />
        );
      case 2:
        return <DetailsStep {...stepProps} />;
      case 3:
        return <PrivacyStep {...stepProps} />;
      case 4:
        return <RulesStep {...stepProps} />;
      case 5:
        return <ReviewStep {...stepProps} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Progress Indicator */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors',
                    index < currentStep
                      ? 'bg-primary-500 text-white'
                      : index === currentStep
                      ? 'bg-primary-500 text-white ring-2 sm:ring-4 ring-primary-100 dark:ring-primary-900'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {index < currentStep ? (
                    <IconCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-500 dark:text-gray-400 hidden sm:block">
                  {step.shortTitle}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2',
                    index < currentStep
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6 sm:mb-8">{renderStep()}</div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-3 sm:mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
          <IconAlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 order-2 sm:order-1">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="min-h-[44px] active:scale-[0.95]">
              <IconChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={saveDraft} disabled={isSubmitting} className="min-h-[44px] active:scale-[0.95]">
            <IconDeviceFloppy className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>

        <Button
          onClick={isLastStep ? handleSubmit : handleNext}
          disabled={isSubmitting}
          className={cn(
            'order-1 sm:order-2',
            isLastStep
              ? 'min-h-[48px] w-full sm:w-auto text-base font-medium'
              : 'min-h-[44px]',
            'active:scale-[0.95]'
          )}
        >
          {isSubmitting && <IconLoader2 className="h-4 w-4 animate-spin mr-2" />}
          {isLastStep ? 'Create Group' : 'Next'}
          {!isLastStep && <IconChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

export default CreateGroupForm;
