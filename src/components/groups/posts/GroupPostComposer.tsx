'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  IconPhoto,
  IconSend,
  IconX,
  IconMessageCircle,
  IconHelpCircle,
  IconSpeakerphone,
  IconChartBar,
  IconFileText,
  IconCheck,
  IconLoader2,
  IconChevronDown,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GroupPostType,
  POST_TYPE_LABELS,
  POST_TYPE_DESCRIPTIONS,
} from '@/types/group';

/**
 * Post type icons mapping
 */
const postTypeIcons: Record<GroupPostType, React.ReactNode> = {
  discussion: <IconMessageCircle className="w-4 h-4" />,
  question: <IconHelpCircle className="w-4 h-4" />,
  announcement: <IconSpeakerphone className="w-4 h-4" />,
  poll: <IconChartBar className="w-4 h-4" />,
  resource: <IconFileText className="w-4 h-4" />,
};

/**
 * Post type colors
 */
const postTypeColors: Record<GroupPostType, { bg: string; text: string }> = {
  discussion: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  question: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-700 dark:text-purple-300',
  },
  announcement: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  poll: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  resource: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

/**
 * Form data type
 */
interface PostFormData {
  content: string;
  postType: GroupPostType;
  images: File[];
}

/**
 * GroupPostComposer component props
 */
interface GroupPostComposerProps {
  /** Group ID */
  groupId: string;
  /** Current user avatar URL */
  userAvatar?: string;
  /** Current user name (for fallback) */
  userName?: string;
  /** Callback when post is created */
  onPostCreated?: (post: unknown) => void;
  /** Allowed post types for this group */
  allowedPostTypes?: GroupPostType[];
  /** Whether images are allowed */
  allowImages?: boolean;
  /** Maximum content length */
  maxContentLength?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get first letter for avatar fallback
 */
function getInitial(name?: string): string {
  return name?.charAt(0).toUpperCase() || 'U';
}

/**
 * GroupPostComposer component
 * 
 * Inline post creation component shown at top of feed for members.
 * 
 * Features:
 * - User avatar display
 * - Expandable textarea that grows on focus
 * - Post type selector dropdown
 * - Image upload button (if allowed)
 * - Submit button with loading state
 * - Collapsed state with placeholder
 * - Character count indicator
 * - Success animation
 * - React Hook Form validation
 * - Mobile: full-screen modal when focused
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostComposer({
  groupId,
  userAvatar,
  userName,
  onPostCreated,
  allowedPostTypes = ['discussion', 'question'],
  allowImages = true,
  maxContentLength = 2000,
  className,
}: GroupPostComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors: _errors, isValid: _isValid },
  } = useForm<PostFormData>({
    defaultValues: {
      content: '',
      postType: allowedPostTypes[0] || 'discussion',
      images: [],
    },
    mode: 'onChange',
  });

  const content = watch('content');
  const postType: GroupPostType = watch('postType') || 'discussion';
  const contentLength = content?.length || 0;
  const isOverLimit = contentLength > maxContentLength;
  const hasContent = contentLength > 0;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Handle click outside to collapse (only on desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !isMobileFullscreen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !hasContent &&
        selectedImages.length === 0
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hasContent, selectedImages.length, isMobileFullscreen]);

  // Handle mobile fullscreen mode
  const handleFocus = () => {
    setIsExpanded(true);
    if (window.innerWidth < 768) {
      setIsMobileFullscreen(true);
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden';
    }
  };

  const handleCloseMobileFullscreen = () => {
    if (!hasContent && selectedImages.length === 0) {
      setIsExpanded(false);
    }
    setIsMobileFullscreen(false);
    document.body.style.overflow = '';
  };

  // Clean up body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );

    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles].slice(0, 4)); // Max 4 images
      
      // Create previews
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string].slice(0, 4));
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const onSubmit = async (data: PostFormData) => {
    if (isOverLimit || (!hasContent && selectedImages.length === 0)) return;

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const formData = new FormData();
      formData.append('groupId', groupId);
      formData.append('content', data.content);
      formData.append('postType', data.postType);
      selectedImages.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Reset form
        reset();
        setSelectedImages([]);
        setImagePreviews([]);
        setIsExpanded(false);
        setIsMobileFullscreen(false);
        document.body.style.overflow = '';
        
        // Callback
        if (onPostCreated) {
          onPostCreated({
            content: data.content,
            postType: data.postType,
            // Mock response
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeColors = postTypeColors[postType];

  // Mobile fullscreen modal
  if (isMobileFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseMobileFullscreen}
            className="min-h-[44px] min-w-[44px] active:scale-[0.95]"
          >
            <IconX className="w-5 h-5" />
          </Button>
          
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
            Create Post
          </h2>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isOverLimit || (!hasContent && selectedImages.length === 0)}
            className="min-h-[44px] px-4 text-sm active:scale-[0.95]"
          >
            {isSubmitting ? (
              <IconLoader2 className="w-5 h-5 animate-spin" />
            ) : showSuccess ? (
              <IconCheck className="w-5 h-5" />
            ) : (
              'Post'
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Post type selector */}
          <div className="mb-3 sm:mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'flex items-center gap-2 min-h-[44px]',
                    'text-sm',
                    typeColors.bg,
                    typeColors.text,
                    'border-0',
                    'active:scale-[0.95]'
                  )}
                >
                  {postTypeIcons[postType]}
                  {POST_TYPE_LABELS[postType]}
                  <IconChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {allowedPostTypes.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => setValue('postType', type)}
                    className="flex items-start gap-3 p-3"
                  >
                    <span className={cn('p-1.5 rounded', postTypeColors[type].bg)}>
                      {postTypeIcons[type]}
                    </span>
                    <div>
                      <p className="font-medium">{POST_TYPE_LABELS[type]}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {POST_TYPE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Textarea */}
          <Controller
            name="content"
            control={control}
            rules={{
              maxLength: {
                value: maxContentLength,
                message: `Content must be ${maxContentLength} characters or less`,
              },
            }}
            render={({ field }) => (
              <textarea
                {...field}
                ref={textareaRef}
                placeholder={
                  postType === 'question'
                    ? 'What would you like to ask?'
                    : postType === 'announcement'
                    ? 'Share your announcement...'
                    : 'Start a discussion...'
                }
                className={cn(
                  'w-full min-h-[150px] p-0 text-base sm:text-lg',
                  'bg-transparent border-none resize-none',
                  'focus:outline-none focus:ring-0',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-600'
                )}
                autoFocus
              />
            )}
          />

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className={cn(
                      'absolute top-2 right-2',
                      'p-1.5 rounded-full min-w-[32px] min-h-[32px]',
                      'bg-black/50 hover:bg-black/70',
                      'text-white',
                      'transition-colors',
                      'active:scale-[0.95]'
                    )}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {allowImages && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedImages.length >= 4}
                className="min-h-[44px] min-w-[44px] active:scale-[0.95]"
              >
                <IconPhoto className="w-5 h-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </>
          )}
          
          {/* Character count */}
          <span
            className={cn(
              'text-xs sm:text-sm',
              isOverLimit
                ? 'text-red-500'
                : contentLength > maxContentLength * 0.9
                ? 'text-amber-500'
                : 'text-gray-400'
            )}
          >
            {contentLength}/{maxContentLength}
          </span>
        </div>
      </div>
    );
  }

  // Collapsed state
  if (!isExpanded) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800 rounded-xl',
          'p-3 sm:p-4',
          'cursor-text',
          className
        )}
        onClick={() => setIsExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
        aria-label="Create a new post"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User avatar */}
          <div className="flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {getInitial(userName)}
                </span>
              </div>
            )}
          </div>
          
          {/* Placeholder */}
          <div className="flex-grow min-h-[44px] flex items-center py-2 sm:py-3 px-3 sm:px-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <span className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Start a discussion...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state (desktop)
  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-800 rounded-xl',
        'p-3 sm:p-4',
        'transition-all duration-200',
        showSuccess && 'ring-2 ring-emerald-500',
        className
      )}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-2 sm:gap-3">
          {/* User avatar */}
          <div className="flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                  {getInitial(userName)}
                </span>
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="flex-grow min-w-0">
            {/* Post type selector */}
            <div className="mb-2 sm:mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'flex items-center gap-2 min-h-[40px]',
                      'text-sm',
                      typeColors.bg,
                      typeColors.text,
                      'border-0',
                      'active:scale-[0.95]'
                    )}
                  >
                    {postTypeIcons[postType]}
                    {POST_TYPE_LABELS[postType]}
                    <IconChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {allowedPostTypes.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setValue('postType', type)}
                      className="flex items-start gap-3 p-3"
                    >
                      <span className={cn('p-1.5 rounded', postTypeColors[type].bg)}>
                        {postTypeIcons[type]}
                      </span>
                      <div>
                        <p className="font-medium">{POST_TYPE_LABELS[type]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {POST_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Textarea */}
            <Controller
              name="content"
              control={control}
              rules={{
                maxLength: {
                  value: maxContentLength,
                  message: `Content must be ${maxContentLength} characters or less`,
                },
              }}
              render={({ field }) => (
                <textarea
                  {...field}
                  ref={textareaRef}
                  onFocus={handleFocus}
                  placeholder={
                    postType === 'question'
                      ? 'What would you like to ask?'
                      : postType === 'announcement'
                      ? 'Share your announcement...'
                      : 'Start a discussion...'
                  }
                  className={cn(
                    'w-full min-h-[80px] p-2 sm:p-3',
                    'bg-gray-50 dark:bg-gray-800 rounded-lg',
                    'border border-gray-200 dark:border-gray-700',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                    'text-sm sm:text-base text-gray-900 dark:text-gray-100',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-600',
                    'resize-none'
                  )}
                />
              )}
            />

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className={cn(
                        'absolute top-1 right-1',
                        'p-1 rounded-full min-w-[28px] min-h-[28px]',
                        'bg-black/50 hover:bg-black/70',
                        'text-white',
                        'transition-colors',
                        'active:scale-[0.95]'
                      )}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between mt-2 sm:mt-3">
              <div className="flex items-center gap-2">
                {/* Image upload button */}
                {allowImages && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedImages.length >= 4}
                      className="min-h-[40px] min-w-[40px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 active:scale-[0.95]"
                    >
                      <IconPhoto className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </>
                )}

                {/* Character count */}
                <span
                  className={cn(
                    'text-xs sm:text-sm',
                    isOverLimit
                      ? 'text-red-500'
                      : contentLength > maxContentLength * 0.9
                      ? 'text-amber-500'
                      : 'text-gray-400'
                  )}
                >
                  {contentLength}/{maxContentLength}
                </span>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || isOverLimit || (!hasContent && selectedImages.length === 0)}
                className="min-h-[44px] px-4 text-sm active:scale-[0.95]"
              >
                {isSubmitting ? (
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : showSuccess ? (
                  <IconCheck className="w-4 h-4 mr-2" />
                ) : (
                  <IconSend className="w-4 h-4 mr-2" />
                )}
                {showSuccess ? 'Posted!' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default GroupPostComposer;
