'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  IconX,
  IconPhoto,
  IconMapPin,
  IconLoader2,
  IconAlertCircle,
  IconMicrophone,
  IconMicrophoneOff,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PostTypeSelector, type PostType } from './PostTypeSelector';
import { CategorySelector, type PostCategory } from './CategorySelector';
import { useCreatePost } from '@/hooks/useCreatePost';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Visibility options for posts
 */
type PostVisibility = 'public' | 'followers' | 'group';

interface VisibilityOption {
  value: PostVisibility;
  label: string;
  description: string;
}

const _VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can see this post',
  },
  {
    value: 'followers',
    label: 'Followers',
    description: 'Only your followers can see',
  },
  {
    value: 'group',
    label: 'Group',
    description: 'Only group members can see',
  },
];

/**
 * Maximum content length
 */
const MAX_CONTENT_LENGTH = 2000;

/**
 * Placeholder texts based on user role (untranslated fallback)
 */
const _PLACEHOLDER_BY_ROLE: Record<string, string> = {
  farmer: 'What challenge are you facing today?',
  student: 'What are you learning about?',
  business: 'Share your agricultural insights...',
  default: "What's on your mind about farming today?",
};

/**
 * User location interface
 */
interface UserLocation {
  state?: string;
  district?: string;
}

/**
 * Props for CreatePostModal component
 */
interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: unknown) => void;
  userRole?: string;
  userLocation?: UserLocation;
  className?: string;
}

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

/**
 * CreatePostModal Component
 * Full-featured post creation modal with text, images, post type, crops, and visibility
 */
export function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
  userRole = 'farmer',
  userLocation,
  className,
}: CreatePostModalProps) {
  // Form state
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('update');
  const [category, setCategory] = useState<PostCategory>('general');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [location, setLocation] = useState<UserLocation | undefined>(userLocation);
  const [showLocationInput, setShowLocationInput] = useState(false);
  
  // Voice-to-text state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Translation hook
  const { t } = useTranslation();

  // Build translated visibility options
  const translatedVisibilityOptions: VisibilityOption[] = [
    {
      value: 'public',
      label: t('feed.visibility.public'),
      description: t('feed.visibility.publicDesc'),
    },
    {
      value: 'followers',
      label: t('feed.visibility.followers'),
      description: t('feed.visibility.followersDesc'),
    },
    {
      value: 'group',
      label: t('feed.visibility.group'),
      description: t('feed.visibility.groupDesc'),
    },
  ];

  // Get translated placeholder by role
  const getTranslatedPlaceholder = (role: string): string => {
    switch (role) {
      case 'farmer': return t('feed.createPost.farmerPlaceholder');
      case 'student': return t('feed.createPost.studentPlaceholder');
      case 'business': return t('feed.createPost.businessPlaceholder');
      default: return t('feed.createPost.defaultPlaceholder');
    }
  };

  // Use image upload hook for base64 conversion
  const {
    selectedImages,
    uploading: imageUploading,
    errors: imageErrors,
    uploadProgress,
    selectImages,
    removeImage,
    clearAll: clearImages,
    getBase64Images,
  } = useImageUpload({
    maxImages: 5,
    maxSizePerImageMB: 5,
    compressionQuality: 0.8,
    maxWidth: 1920,
  });

  // File input ref for image selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if voice recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  // Use create post hook
  const {
    isSubmitting,
    error,
    progress,
    validationErrors,
    createPost,
    clearError,
    clearValidationErrors,
  } = useCreatePost();

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  /**
   * Toggle voice-to-text listening
   */
  const toggleVoiceToText = useCallback(() => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Start listening
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Set recognition language based on user's preference
    // Hindi users get Hindi transcription (Devanagari), others get English
    const userLang = localStorage.getItem('userLanguage') || 'en';
    recognition.lang = userLang === 'hi' ? 'hi-IN' : 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let _interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          _interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setContent(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setPostType('update');
      clearImages();
      setCategory('general');
      setVisibility('public');
      setLocation(userLocation);
      setShowLocationInput(false);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      clearError();
      clearValidationErrors();
    }
  }, [isOpen, userLocation, clearError, clearValidationErrors, clearImages]);

  // Check if form is valid for submission
  const isFormValid = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH && !imageUploading;

  // Character count and limit
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;

  // Get placeholder text based on role
  const placeholderText = getTranslatedPlaceholder(userRole);

  /**
   * Handle content change
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (validationErrors.content) {
      clearValidationErrors();
    }
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectImages(files);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  }, [selectImages]);

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback((newCategory: PostCategory) => {
    setCategory(newCategory);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    // Get base64 images from the hook
    const base64Images = getBase64Images();

    const input = {
      content: content.trim(),
      base64Images: base64Images.length > 0 ? base64Images : undefined,
      postType,
      category,
      visibility,
    };

    const result = await createPost(input);

    if (result) {
      // Success - close modal and notify parent
      onPostCreated?.(result);
      onClose();
    }
  };

  /**
   * Handle modal close with confirmation
   */
  const handleClose = () => {
    // Check if there's unsaved content
    const hasContent = content.trim().length > 0 || selectedImages.length > 0;
    
    if (hasContent && !isSubmitting) {
      // Could add a confirmation dialog here, for now just close
      onClose();
    } else {
      onClose();
    }
  };

  /**
   * Format location string
   */
  const locationString = location
    ? [location.district, location.state].filter(Boolean).join(', ')
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        variant="mobile-sheet"
        hideCloseButton
        className={cn(
          // Center popup sizing
          'max-h-[85dvh]',
          'sm:max-w-lg sm:max-h-[90vh]',
          'border border-gray-200 dark:border-gray-800',
          // Layout
          'flex flex-col',
          'bg-white dark:bg-gray-950',
          'overflow-hidden',
          className
        )}
      >
        {/* Header - responsive layout */}
        <DialogHeader className="flex-shrink-0 px-4 sm:px-4 pt-4 pb-3 sm:py-3 border-b border-gray-200 dark:border-gray-800">
          {/* Mobile layout: Title left, Close button right */}
          <div className="flex sm:hidden items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('feed.createPost.createPost')}
            </DialogTitle>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg',
                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                'transition-colors focus:outline-none',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'active:scale-95',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Close"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Desktop layout: Close button, Title, Post button */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className={cn(
                  'min-w-[44px] min-h-[44px] flex items-center justify-center',
                  'transition-colors focus:outline-none',
                  'active:scale-95 active:opacity-70',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Close"
              >
                <IconX size={24} />
              </button>
              <DialogTitle className="text-lg font-semibold">
                {t('feed.createPost.createPost')}
              </DialogTitle>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              size="sm"
              className={cn(
                'min-h-[44px] px-5 font-medium',
                'active:scale-95',
                isSubmitting && 'cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 size={16} className="mr-1.5 animate-spin" />
                  {progress > 0 ? `${progress}%` : t('feed.createPost.posting')}
                </>
              ) : (
                t('feed.createPost.post')
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-4 py-3 space-y-4">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <IconAlertCircle
                size={18}
                className="flex-shrink-0 mt-0.5 text-red-500"
              />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
                <button
                  onClick={clearError}
                  className="text-xs text-red-600 dark:text-red-400 underline mt-1"
                >
                  {t('feed.createPost.dismiss')}
                </button>
              </div>
            </div>
          )}

          {/* Content textarea with character counter */}
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder={placeholderText}
                disabled={isSubmitting}
                className={cn(
                  'min-h-[120px] resize-none text-base w-full',
                  'border border-gray-200 dark:border-gray-700 rounded-lg',
                  'focus-visible:ring-1 focus-visible:ring-primary-500',
                  'p-3 pr-12', // Add padding for text from border, extra on right for mic button
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'break-words overflow-wrap-anywhere',
                  validationErrors.content && 'border-red-500 text-red-500'
                )}
                style={{ 
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
                aria-label="Post content"
                maxLength={MAX_CONTENT_LENGTH + 100} // Allow slight over for feedback
              />
              {/* Voice-to-text button */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceToText}
                  disabled={isSubmitting}
                  className={cn(
                    'absolute right-2 top-2',
                    'min-w-[36px] min-h-[36px] flex items-center justify-center',
                    'rounded-full transition-all duration-200',
                    isListening
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-label={isListening ? t('feed.createPost.stopRecording') : t('feed.createPost.voiceInput')}
                  title={isListening ? t('feed.createPost.stopRecording') : t('feed.createPost.voiceInput')}
                >
                  {isListening ? (
                    <IconMicrophoneOff size={18} />
                  ) : (
                    <IconMicrophone size={18} />
                  )}
                </button>
              )}
            </div>
            {isListening && (
              <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                {t('feed.createPost.listeningSpeak')}
              </p>
            )}
            <div
              className={cn(
                'flex justify-end text-xs',
                isOverLimit
                  ? 'text-red-500'
                  : charCount > MAX_CONTENT_LENGTH * 0.9
                    ? 'text-yellow-500'
                    : 'text-gray-400'
              )}
            >
              {charCount}/{MAX_CONTENT_LENGTH}
            </div>
            {validationErrors.content && (
              <p className="text-xs text-red-500">{validationErrors.content}</p>
            )}
          </div>

          {/* Post Type Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300 block">
              {t('feed.createPost.postType')}
            </label>
            <div className="mt-2">
              <PostTypeSelector
                value={postType}
                onChange={setPostType}
                variant="chips"
                size="sm"
                disabled={isSubmitting}
              />
            </div>
            {validationErrors.postType && (
              <p className="text-xs text-red-500">{validationErrors.postType}</p>
            )}
          </div>

          {/* Image Upload Section - Using useImageUpload hook */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300 flex items-center gap-1">
              <IconPhoto size={16} />
              {t('feed.createPost.images')}
              {selectedImages.length > 0 && (
                <span className="text-xs text-gray-500 ml-1">
                  ({selectedImages.length}/5)
                </span>
              )}
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isSubmitting || imageUploading}
            />

            {/* Image previews grid */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {selectedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group"
                  >
                    <img
                      src={img.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      disabled={isSubmitting || imageUploading}
                      className={cn(
                        'absolute top-1 right-1 w-6 h-6 rounded-full',
                        'bg-black/60 text-white flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'hover:bg-black/80 active:scale-95',
                        (isSubmitting || imageUploading) && 'cursor-not-allowed'
                      )}
                      aria-label="Remove image"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}

                {/* Add more images button (if under limit) */}
                {selectedImages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || imageUploading}
                    className={cn(
                      'aspect-square rounded-lg border-2 border-dashed',
                      'border-gray-300 dark:border-gray-600',
                      'flex flex-col items-center justify-center gap-1',
                      'text-gray-400 dark:text-gray-500',
                      'hover:border-primary-400 hover:text-primary-500 transition-colors',
                      (isSubmitting || imageUploading) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <IconPhoto size={20} />
                    <span className="text-xs">{t('feed.createPost.add')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Upload progress bar */}
            {imageUploading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('feed.createPost.processingImages')} {uploadProgress}%
                </p>
              </div>
            )}

            {/* Empty state / Add button when no images */}
            {selectedImages.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || imageUploading}
                className={cn(
                  'w-full p-6 rounded-lg border-2 border-dashed',
                  'border-gray-300 dark:border-gray-600',
                  'flex flex-col items-center justify-center gap-2',
                  'text-gray-500 dark:text-gray-400',
                  'hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20',
                  'transition-colors cursor-pointer',
                  (isSubmitting || imageUploading) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <IconPhoto size={32} />
                <span className="text-sm font-medium">{t('feed.createPost.addImages')}</span>
                <span className="text-xs text-gray-400">
                  {t('feed.createPost.upTo5Images')}
                </span>
              </button>
            )}

            {/* Image errors from hook */}
            {imageErrors.length > 0 && (
              <div className="space-y-1">
                {imageErrors.map((error) => (
                  <p key={error.id} className="text-xs text-red-500 flex items-center gap-1">
                    <IconAlertCircle size={12} />
                    {error.filename ? `${error.filename}: ` : ''}{error.message}
                  </p>
                ))}
              </div>
            )}

            {validationErrors.images && (
              <p className="text-xs text-red-500">{validationErrors.images}</p>
            )}
          </div>

          {/* Post Category */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300 block">
              {t('feed.createPost.postCategory')}
            </label>
            <div className="mt-2">
              <CategorySelector
                value={category}
                onChange={handleCategoryChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Visibility Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300 block">
              {t('feed.createPost.whoCanSee')}
            </label>
            <div className="mt-2">
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as PostVisibility)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full min-h-[44px]">
                  <SelectValue placeholder={t('feed.createPost.selectVisibility')}>
                    {translatedVisibilityOptions.find(opt => opt.value === visibility)?.label || t('feed.createPost.selectVisibility')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  sideOffset={4} 
                  align="start"
                  className="z-[100] min-w-[200px]"
                >
                  {translatedVisibilityOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {validationErrors.visibility && (
              <p className="text-xs text-red-500">{validationErrors.visibility}</p>
            )}
          </div>

          {/* Location Display */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300 flex items-center gap-1">
              <IconMapPin size={16} />
              {t('feed.createPost.location')}
            </label>
            {!showLocationInput ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {locationString || t('feed.createPost.noLocationSet')}
                </span>
                <button
                  onClick={() => setShowLocationInput(true)}
                  disabled={isSubmitting}
                  className={cn(
                    'text-xs text-primary-600 dark:text-primary-400 hover:underline',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {t('feed.createPost.change')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={location?.district || ''}
                    onChange={(e) =>
                      setLocation((prev) => ({
                        ...prev,
                        district: e.target.value,
                      }))
                    }
                    placeholder={t('feed.createPost.district')}
                    disabled={isSubmitting}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border',
                      'border-gray-200 dark:border-gray-700',
                      'bg-white dark:bg-gray-950',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500'
                    )}
                  />
                  <input
                    type="text"
                    value={location?.state || ''}
                    onChange={(e) =>
                      setLocation((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    placeholder={t('feed.createPost.state')}
                    disabled={isSubmitting}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border',
                      'border-gray-200 dark:border-gray-700',
                      'bg-white dark:bg-gray-950',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500'
                    )}
                  />
                </div>
                <button
                  onClick={() => setShowLocationInput(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  {t('feed.createPost.done')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sticky Submit Button - 48px height, full width */}
        <div
          className={cn(
            'flex-shrink-0 sm:hidden',
            'sticky bottom-0 left-0 right-0',
            'px-3 py-3 bg-white dark:bg-gray-950',
            'border-t border-gray-200 dark:border-gray-800',
            'pb-[max(12px,env(safe-area-inset-bottom))]' // Account for home indicator
          )}
        >
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            size="lg"
            className={cn(
              'w-full min-h-[48px] font-semibold text-base',
              'active:scale-[0.98] transition-transform',
              isSubmitting && 'cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <IconLoader2 size={20} className="mr-2 animate-spin" />
                {progress > 0 ? `${t('feed.createPost.posting')} ${progress}%...` : t('feed.createPost.posting')}
              </>
            ) : (
              t('feed.createPost.post')
            )}
          </Button>
        </div>

        {/* Progress indicator during submission */}
        {isSubmitting && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 sm:block hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreatePostModal;
