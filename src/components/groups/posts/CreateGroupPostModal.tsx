'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  IconX,
  IconPhoto,
  IconUpload,
  IconTrash,
  IconPlus,
  IconLoader2,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconMessageCircle,
  IconHelpCircle,
  IconSpeakerphone,
  IconChartBar,
  IconFileText,
  IconChevronDown,
  IconTag,
  IconCalendar,
  IconGripVertical,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GroupPostType,
  GroupPostData,
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
 * Poll option form data
 */
interface PollOptionFormData {
  id: string;
  text: string;
}

/**
 * Form data structure
 */
interface PostFormData {
  content: string;
  postType: GroupPostType;
  images: File[];
  pollQuestion: string;
  pollOptions: PollOptionFormData[];
  pollEndDate: string;
  tags: string[];
}

/**
 * CreateGroupPostModal component props
 */
interface CreateGroupPostModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Group ID */
  groupId: string;
  /** Allowed post types for this group */
  allowedPostTypes?: GroupPostType[];
  /** Whether polls are allowed */
  allowPolls?: boolean;
  /** Whether images are allowed */
  allowImages?: boolean;
  /** Maximum content length */
  maxContentLength?: number;
  /** Suggested tags for the group */
  suggestedTags?: string[];
  /** Callback on successful post creation */
  onSuccess?: (post: Partial<GroupPostData>) => void;
}

/**
 * Generate unique ID for poll options
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * CreateGroupPostModal component
 * 
 * Full post creation modal with comprehensive features.
 * 
 * Features:
 * - Header with close button and post type selector
 * - Main textarea with formatting help
 * - Image upload zone (drag & drop or click)
 * - Poll creation UI (if poll type selected and allowed)
 * - Tags input with suggestions
 * - Preview toggle
 * - Submit button with loading state
 * - Content length validation
 * - Required fields validation for polls
 * - Accessible with proper focus management
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function CreateGroupPostModal({
  isOpen,
  onClose,
  groupId,
  allowedPostTypes = ['discussion', 'question', 'poll'],
  allowPolls = true,
  allowImages = true,
  maxContentLength = 5000,
  suggestedTags = [],
  onSuccess,
}: CreateGroupPostModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PostFormData>({
    defaultValues: {
      content: '',
      postType: allowedPostTypes[0] || 'discussion',
      images: [],
      pollQuestion: '',
      pollOptions: [
        { id: generateId(), text: '' },
        { id: generateId(), text: '' },
      ],
      pollEndDate: '',
      tags: [],
    },
    mode: 'onChange',
  });

  const { fields: pollOptionFields, append: appendPollOption, remove: removePollOption } = useFieldArray({
    control,
    name: 'pollOptions',
  });

  const content = watch('content');
  const postType: GroupPostType = watch('postType') || 'discussion';
  const pollQuestion = watch('pollQuestion');
  const pollOptions = watch('pollOptions');
  const tags = watch('tags') || [];
  
  const contentLength = content?.length || 0;
  const isOverLimit = contentLength > maxContentLength;
  const isPollType = postType === 'poll';
  const typeColors = postTypeColors[postType];

  // Validate poll options
  const validPollOptions = pollOptions?.filter((opt) => opt.text.trim().length > 0) || [];
  const isPollValid = !isPollType || (pollQuestion?.trim().length > 0 && validPollOptions.length >= 2);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedImages([]);
      setImagePreviews([]);
      setShowPreview(false);
      setTagInput('');
    }
  }, [isOpen, reset]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleImageFiles(files);
  };

  // Handle image files
  const handleImageFiles = (files: File[]) => {
    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    );

    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles].slice(0, 4));
      
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string].slice(0, 4));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleImageFiles(files);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle tags
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setValue('tags', [...tags, trimmedTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', tags.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestedTags.filter(
    (tag) => 
      tag.toLowerCase().includes(tagInput.toLowerCase()) && 
      !tags.includes(tag.toLowerCase())
  );

  // Handle form submission
  const onSubmit = async (data: PostFormData) => {
    if (isOverLimit || (isPollType && !isPollValid)) return;

    setIsSubmitting(true);

    try {
      // Prepare post data
      const postData: Partial<GroupPostData> = {
        groupId,
        content: data.content,
        postType: data.postType,
        tags: data.tags,
        images: [], // Will be populated after upload
      };

      // Add poll data if poll type
      if (isPollType) {
        postData.poll = {
          question: data.pollQuestion,
          options: validPollOptions.map((opt) => ({
            text: opt.text,
            votes: 0,
          })),
          endDate: data.pollEndDate || undefined,
          voterCount: 0,
        };
      }

      // TODO: Replace with actual API call
      // Upload images and create post
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        
        if (onSuccess) {
          onSuccess(postData);
        }
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add poll option
  const handleAddPollOption = () => {
    if (pollOptionFields.length < 6) {
      appendPollOption({ id: generateId(), text: '' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={modalRef}
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Create Post
            </DialogTitle>
            
            <div className="flex items-center gap-3">
              {/* Post type selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'flex items-center gap-2',
                      typeColors.bg,
                      typeColors.text,
                      'border-0'
                    )}
                  >
                    {postTypeIcons[postType]}
                    {POST_TYPE_LABELS[postType]}
                    <IconChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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

              {/* Preview toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="min-h-[36px]"
              >
                {showPreview ? (
                  <IconEyeOff className="w-4 h-4 mr-1" />
                ) : (
                  <IconEye className="w-4 h-4 mr-1" />
                )}
                {showPreview ? 'Edit' : 'Preview'}
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="min-h-[36px] min-w-[36px] p-0"
              >
                <IconX className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-post-form" onSubmit={handleSubmit(onSubmit)}>
            {showPreview ? (
              /* Preview Mode */
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Badge className={cn('mb-3', typeColors.bg, typeColors.text)}>
                    {postTypeIcons[postType]}
                    <span className="ml-1">{POST_TYPE_LABELS[postType]}</span>
                  </Badge>
                  <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                    {content || 'Your post content will appear here...'}
                  </p>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {isPollType && pollQuestion && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-medium mb-3">{pollQuestion}</p>
                      <div className="space-y-2">
                        {validPollOptions.map((option, _index) => (
                          <div
                            key={option.id}
                            className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                          >
                            {option.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Main content textarea */}
                <div>
                  <Controller
                    name="content"
                    control={control}
                    rules={{
                      required: !isPollType && 'Content is required',
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
                            ? 'What would you like to ask the community?'
                            : postType === 'announcement'
                            ? 'Share your announcement...'
                            : postType === 'poll'
                            ? 'Add context for your poll (optional)...'
                            : 'Share your thoughts with the community...'
                        }
                        className={cn(
                          'w-full min-h-[120px] p-3',
                          'bg-gray-50 dark:bg-gray-800 rounded-lg',
                          'border border-gray-200 dark:border-gray-700',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                          'text-gray-900 dark:text-gray-100',
                          'placeholder:text-gray-400 dark:placeholder:text-gray-600',
                          'resize-none text-base'
                        )}
                      />
                    )}
                  />
                  
                  {/* Character count */}
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tip: Use @ to mention other members
                    </p>
                    <span
                      className={cn(
                        'text-sm',
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
                  {errors.content && (
                    <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
                  )}
                </div>

                {/* Poll creation UI */}
                {isPollType && allowPolls && (
                  <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <IconChartBar className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                      Poll Settings
                    </h3>

                    {/* Poll question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Question *
                      </label>
                      <Controller
                        name="pollQuestion"
                        control={control}
                        rules={{ required: isPollType && 'Poll question is required' }}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Ask a question..."
                            className="w-full"
                          />
                        )}
                      />
                      {errors.pollQuestion && (
                        <p className="text-sm text-red-500 mt-1">{errors.pollQuestion.message}</p>
                      )}
                    </div>

                    {/* Poll options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Options (min. 2, max. 6) *
                      </label>
                      <div className="space-y-2">
                        {pollOptionFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2">
                            <IconGripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <Controller
                              name={`pollOptions.${index}.text`}
                              control={control}
                              render={({ field: inputField }) => (
                                <Input
                                  {...inputField}
                                  placeholder={`Option ${index + 1}`}
                                  className="flex-grow"
                                />
                              )}
                            />
                            {pollOptionFields.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePollOption(index)}
                                className="flex-shrink-0 text-gray-400 hover:text-red-500"
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {pollOptionFields.length < 6 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddPollOption}
                          className="mt-2"
                        >
                          <IconPlus className="w-4 h-4 mr-1" />
                          Add option
                        </Button>
                      )}
                    </div>

                    {/* Poll end date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <IconCalendar className="w-4 h-4 inline mr-1" />
                        End date (optional)
                      </label>
                      <Controller
                        name="pollEndDate"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="datetime-local"
                            className="w-full max-w-xs"
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Image upload zone */}
                {allowImages && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <IconPhoto className="w-4 h-4 inline mr-1" />
                      Images (up to 4)
                    </label>
                    
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
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
                                'p-1.5 rounded-full',
                                'bg-black/50 hover:bg-black/70',
                                'text-white',
                                'opacity-0 group-hover:opacity-100 transition-opacity'
                              )}
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {selectedImages.length < 4 && (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          'border-2 border-dashed rounded-lg p-6',
                          'flex flex-col items-center justify-center gap-2',
                          'cursor-pointer transition-colors',
                          isDraggingOver
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        )}
                      >
                        <IconUpload className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Drag & drop images or click to upload
                        </p>
                        <p className="text-xs text-gray-400">
                          Max 5MB per image • PNG, JPG, GIF
                        </p>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>
                )}

                {/* Tags input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <IconTag className="w-4 h-4 inline mr-1" />
                    Tags (up to 5)
                  </label>
                  
                  {/* Selected tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-500"
                          >
                            <IconX className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Tag input */}
                  {tags.length < 5 && (
                    <div className="relative">
                      <Input
                        type="text"
                        value={tagInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setTagInput(e.target.value);
                          setShowTagSuggestions(true);
                        }}
                        onKeyDown={handleTagInputKeyDown}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                        placeholder="Type a tag and press Enter..."
                        className="w-full"
                      />
                      
                      {/* Tag suggestions */}
                      {showTagSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          {filteredSuggestions.slice(0, 5).map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleAddTag(suggestion)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
                            >
                              #{suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isPollType && !isPollValid && (
                <span className="text-amber-500">
                  Poll requires a question and at least 2 options
                </span>
              )}
            </p>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-post-form"
                disabled={isSubmitting || isOverLimit || (isPollType && !isPollValid) || (!content?.trim() && !isPollType && selectedImages.length === 0)}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : showSuccess ? (
                  <IconCheck className="w-4 h-4 mr-2" />
                ) : null}
                {showSuccess ? 'Posted!' : isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateGroupPostModal;
