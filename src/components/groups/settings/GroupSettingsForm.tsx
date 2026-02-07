'use client';

import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { GroupData, GroupType } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  IconUpload,
  IconPhoto,
  IconX,
  IconLoader2,
  IconCheck,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';
import { useImageUpload } from '@/hooks/useImageUpload';

interface GroupSettingsFormProps {
  /** Group data */
  group: GroupData;
  /** Callback when settings are saved */
  onSave?: (updatedGroup: GroupData) => void;
  /** Callback when there's an error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface FormValues {
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

/**
 * Group type labels for display
 */
const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  crop: 'Crop Based',
  region: 'Region Based',
  topic: 'Topic Based',
  practice: 'Practice Based',
};

/**
 * Common emoji options for group icons
 */
const EMOJI_OPTIONS = [
  '🌾', '🌽', '🍚', '🌱', '🌿', '🥬', '🍅', '🥕',
  '🍇', '🍎', '🥭', '🌻', '🌳', '🐄', '🐔', '🚜',
  '💧', '☀️', '🌍', '👨‍🌾', '👩‍🌾', '📚', '💡', '🤝',
];

/**
 * Popular tags for suggestions
 */
const POPULAR_TAGS = [
  'organic', 'sustainable', 'irrigation', 'pesticides',
  'fertilizers', 'harvesting', 'marketing', 'weather',
  'equipment', 'seeds', 'soil', 'livestock',
];

/**
 * GroupSettingsForm Component
 * 
 * Form to edit group name, description, cover image, icon picker, 
 * and tags editor. Group type is read-only.
 * 
 * @example
 * <GroupSettingsForm
 *   group={groupData}
 *   onSave={(updated) => handleUpdate(updated)}
 * />
 */
export function GroupSettingsForm({
  group,
  onSave,
  onError,
  className,
}: GroupSettingsFormProps) {
  // State
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [iconType, setIconType] = useState<'emoji' | 'image'>(
    group.icon?.startsWith('data:image') ? 'image' : 'emoji'
  );
  
  // Refs
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const iconImageInputRef = useRef<HTMLInputElement>(null);

  // Image upload hooks
  const {
    selectedImages: coverImages,
    uploading: coverImageUploading,
    errors: coverImageErrors,
    uploadProgress: coverImageProgress,
    selectImages: selectCoverImage,
    removeImage: removeCoverImage,
    clearAll: clearCoverImage,
  } = useImageUpload({
    maxImages: 1,
    maxSizePerImageMB: 5,
    compressionQuality: 0.8,
    maxWidth: 1920,
  });

  const {
    selectedImages: iconImages,
    uploading: iconImageUploading,
    errors: iconImageErrors,
    uploadProgress: _iconImageProgress,
    selectImages: selectIconImage,
    removeImage: removeIconImage,
    clearAll: clearIconImage,
  } = useImageUpload({
    maxImages: 1,
    maxSizePerImageMB: 2,
    compressionQuality: 0.8,
    maxWidth: 512,
  });

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: group.name,
      description: group.description || '',
      icon: group.icon || '🌾',
      tags: group.tags || [],
    },
  });

  const watchedTags = watch('tags');
  const _watchedIcon = watch('icon');

  // Track if cover image was removed (existing image cleared, no new uploaded)
  const coverImageRemoved = !coverImages.length && group.coverImage && !coverImages.some(img => img.base64);
  // Determine current cover image preview
  const coverImagePreview = coverImages.length > 0 
    ? coverImages[0].preview 
    : group.coverImage || '';

  // Determine current icon image preview
  const iconImagePreview = iconImages.length > 0
    ? iconImages[0].preview
    : (iconType === 'image' && group.icon?.startsWith('data:image') ? group.icon : '');

  /**
   * Handle cover image file selection
   */
  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectCoverImage(files);
    }
    // Reset input
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  /**
   * Handle icon image file selection
   */
  const handleIconImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectIconImage(files);
      setIconType('image');
    }
    // Reset input
    if (iconImageInputRef.current) {
      iconImageInputRef.current.value = '';
    }
  };

  /**
   * Handle removing cover image
   */
  const handleRemoveCoverImage = () => {
    if (coverImages.length > 0) {
      removeCoverImage(coverImages[0].id);
    }
    clearCoverImage();
  };

  /**
   * Handle removing icon image
   */
  const handleRemoveIconImage = () => {
    if (iconImages.length > 0) {
      removeIconImage(iconImages[0].id);
    }
    clearIconImage();
    setIconType('emoji');
  };

  /**
   * Add a tag
   */
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    if (watchedTags.includes(tag)) {
      setTagInput('');
      return;
    }
    if (watchedTags.length >= 10) {
      onError?.('Maximum 10 tags allowed');
      return;
    }
    setValue('tags', [...watchedTags, tag], { shouldDirty: true });
    setTagInput('');
  };

  /**
   * Remove a tag
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      watchedTags.filter((t) => t !== tagToRemove),
      { shouldDirty: true }
    );
  };

  /**
   * Handle tag input keydown
   */
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: FormValues) => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Prepare cover image - new base64, existing, or removed
      let coverImageValue: string | undefined;
      if (coverImages.length > 0 && coverImages[0].base64) {
        // New cover image uploaded
        coverImageValue = coverImages[0].base64;
      } else if (coverImageRemoved) {
        // Cover was explicitly removed
        coverImageValue = '';
      } else {
        // Keep existing
        coverImageValue = group.coverImage;
      }

      // Prepare icon - new base64 image, emoji, or existing
      let iconValue: string | undefined;
      if (iconType === 'image' && iconImages.length > 0 && iconImages[0].base64) {
        // New icon image uploaded
        iconValue = iconImages[0].base64;
      } else if (iconType === 'emoji') {
        // Using emoji
        iconValue = data.icon;
      } else if (iconType === 'image' && group.icon?.startsWith('data:image')) {
        // Keep existing image icon
        iconValue = group.icon;
      } else {
        iconValue = data.icon;
      }

      // Update group via API
      const response = await apiClient.put<{ success: boolean; data: GroupData }>(
        `/api/groups/${group._id}`,
        {
          name: data.name,
          description: data.description || undefined,
          icon: iconValue,
          coverImage: coverImageValue,
          tags: data.tags,
        }
      );

      if (response.data.success) {
        setSaveSuccess(true);
        onSave?.(response.data.data);

        // Clear success message after delay
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: unknown) {
      console.error('Error saving group settings:', err);
      onError?.(
        err instanceof Error
          ? err.message
          : 'Failed to save settings. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-6', className)}
    >
      {/* Cover Image */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Cover Image
        </label>
        <div
          className={cn(
            'relative rounded-lg overflow-hidden border-2 border-dashed',
            'border-gray-300 dark:border-gray-600',
            'hover:border-primary-400 dark:hover:border-primary-500',
            'transition-colors cursor-pointer',
            coverImagePreview ? 'h-40' : 'h-32'
          )}
          onClick={() => coverImageInputRef.current?.click()}
        >
          {coverImagePreview ? (
            <>
              <img
                src={coverImagePreview}
                alt="Cover preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    coverImageInputRef.current?.click();
                  }}
                >
                  <IconPhoto className="h-4 w-4 mr-1" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCoverImage();
                  }}
                >
                  <IconX className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
              {coverImageUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-white text-sm flex flex-col items-center">
                    <IconLoader2 className="h-6 w-6 animate-spin mb-2" />
                    Processing... {coverImageProgress}%
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              {coverImageUploading ? (
                <>
                  <IconLoader2 className="h-8 w-8 mb-2 animate-spin" />
                  <span className="text-sm">Processing... {coverImageProgress}%</span>
                </>
              ) : (
                <>
                  <IconUpload className="h-8 w-8 mb-2" />
                  <span className="text-sm">Click to upload cover image</span>
                  <span className="text-xs mt-1">Max 5MB, recommended 1200x400</span>
                </>
              )}
            </div>
          )}
        </div>
        <input
          ref={coverImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverImageSelect}
          className="hidden"
        />
        {coverImageErrors.length > 0 && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-4 w-4" />
            {coverImageErrors[0].message}
          </p>
        )}
      </div>

      {/* Group Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Group Name <span className="text-red-500">*</span>
        </label>
        <Input
          {...register('name', {
            required: 'Group name is required',
            minLength: { value: 3, message: 'Name must be at least 3 characters' },
            maxLength: { value: 100, message: 'Name must be less than 100 characters' },
          })}
          placeholder="Enter group name"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-4 w-4" />
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Group Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <Textarea
          {...register('description', {
            maxLength: { value: 500, message: 'Description must be less than 500 characters' },
          })}
          placeholder="Describe what this group is about..."
          rows={4}
          className={cn('resize-none', errors.description ? 'border-red-500' : '')}
        />
        {errors.description && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-4 w-4" />
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Group Icon */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Group Icon
        </label>
        
        {/* Icon Type Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={iconType === 'emoji' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIconType('emoji')}
          >
            Emoji
          </Button>
          <Button
            type="button"
            variant={iconType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIconType('image')}
          >
            Image
          </Button>
        </div>

        {/* Icon Selection */}
        <div className="flex items-center gap-3">
          {iconType === 'emoji' ? (
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn(
                      'w-14 h-14 rounded-lg border-2 border-gray-200 dark:border-gray-700',
                      'flex items-center justify-center text-3xl',
                      'hover:border-primary-400 dark:hover:border-primary-500',
                      'transition-colors'
                    )}
                  >
                    {field.value || '🌾'}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-10 top-16 left-0 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              field.onChange(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className={cn(
                              'w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                              field.value === emoji && 'bg-primary-100 dark:bg-primary-900'
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            />
          ) : (
            <div className="relative">
              <div
                className={cn(
                  'w-14 h-14 rounded-lg border-2 border-dashed cursor-pointer',
                  'border-gray-300 dark:border-gray-600',
                  'hover:border-primary-400 dark:hover:border-primary-500',
                  'transition-colors overflow-hidden',
                  'flex items-center justify-center'
                )}
                onClick={() => iconImageInputRef.current?.click()}
              >
                {iconImagePreview ? (
                  <img
                    src={iconImagePreview}
                    alt="Icon preview"
                    className="w-full h-full object-cover"
                  />
                ) : iconImageUploading ? (
                  <IconLoader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  <IconPhoto className="h-6 w-6 text-gray-400" />
                )}
              </div>
              {iconImagePreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveIconImage();
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <IconX className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {iconType === 'emoji' ? 'Click to change icon' : 'Click to upload icon image (max 2MB)'}
          </span>
        </div>
        
        {/* Hidden icon image input */}
        <input
          ref={iconImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleIconImageSelect}
          className="hidden"
        />
        {iconImageErrors.length > 0 && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-4 w-4" />
            {iconImageErrors[0].message}
          </p>
        )}
      </div>

      {/* Group Type (Read-only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Group Type
        </label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            {GROUP_TYPE_LABELS[group.groupType]}
          </Badge>
          <span className="text-xs text-gray-400">
            (Cannot be changed)
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags
        </label>
        <div className="space-y-3">
          {/* Current Tags */}
          {watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {watchedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tag Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag..."
              maxLength={30}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || watchedTags.length >= 10}
            >
              <IconPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Suggested Tags */}
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-400 mr-1">Suggestions:</span>
            {POPULAR_TAGS.filter((t) => !watchedTags.includes(t))
              .slice(0, 6)
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (watchedTags.length < 10) {
                      setValue('tags', [...watchedTags, tag], { shouldDirty: true });
                    }
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  +{tag}
                </button>
              ))}
          </div>

          <p className="text-xs text-gray-400">
            {watchedTags.length}/10 tags
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {saveSuccess && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <IconCheck className="h-4 w-4" />
            Settings saved successfully!
          </span>
        )}
        <div className="ml-auto">
          <Button
            type="submit"
            disabled={saving || coverImageUploading || iconImageUploading || (!isDirty && !coverImages.length && !iconImages.length)}
          >
            {(saving || coverImageUploading || iconImageUploading) && (
              <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default GroupSettingsForm;
