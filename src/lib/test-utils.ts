/**
 * Test Utilities for Agrigrow Feed
 *
 * Provides helper functions for testing components:
 * - renderWithProviders for wrapping components in context
 * - createMockUser, createMockPost for specific test scenarios
 * - Custom matchers and utilities
 */

import React from 'react';
import { mockUser, mockPost, mockComment, mockAuthor, mockNotification } from './mock-data';
import type { MockUser, MockPost, MockComment, MockAuthor, MockNotification } from './mock-data';

// ============================================================================
// Types for Testing
// ============================================================================

/**
 * Props for render wrapper
 */
interface WrapperProps {
  children: React.ReactNode;
}

/**
 * Options for createMockUser
 */
export interface CreateMockUserOptions {
  /** Make user a post author */
  isPostAuthor?: boolean;
  /** Make user an expert */
  isExpert?: boolean;
  /** Make user a new user (beginner) */
  isNewUser?: boolean;
  /** Specific region */
  region?: string;
  /** Specific crops */
  crops?: string[];
}

/**
 * Options for createMockPost
 */
export interface CreateMockPostOptions {
  /** Make post have high engagement */
  highEngagement?: boolean;
  /** Make post have low engagement */
  lowEngagement?: boolean;
  /** Make post a question */
  isQuestion?: boolean;
  /** Make post a solution */
  isSolution?: boolean;
  /** Make post liked by current user */
  isLiked?: boolean;
  /** Make post saved by current user */
  isSaved?: boolean;
  /** Make post have images */
  hasImages?: boolean;
  /** Make post have no images */
  noImages?: boolean;
  /** Specific author */
  author?: MockAuthor;
  /** Make post old (more than 7 days) */
  isOld?: boolean;
  /** Make post very recent (within last hour) */
  isRecent?: boolean;
  /** Specific crop */
  crop?: string;
}

/**
 * Options for createMockComment
 */
export interface CreateMockCommentOptions {
  /** Make comment helpful */
  isHelpful?: boolean;
  /** Make comment liked */
  isLiked?: boolean;
  /** Make comment have replies */
  hasReplies?: boolean;
  /** Number of replies */
  repliesCount?: number;
  /** Specific author */
  author?: MockAuthor;
  /** Make comment edited */
  isEdited?: boolean;
}

// ============================================================================
// Mock Creation Utilities
// ============================================================================

/**
 * Create a mock user with specific test characteristics
 */
export function createMockUser(options: CreateMockUserOptions = {}): MockUser {
  const overrides: Partial<MockUser> = {};

  if (options.isExpert) {
    overrides.role = 'expert';
    overrides.experienceLevel = 'expert';
  }

  if (options.isNewUser) {
    overrides.experienceLevel = 'beginner';
    overrides.createdAt = new Date(); // Just joined
  }

  if (options.region) {
    overrides.region = options.region;
  }

  if (options.crops) {
    overrides.crops = options.crops;
  }

  return mockUser(overrides);
}

/**
 * Create a mock post with specific test characteristics
 */
export function createMockPost(options: CreateMockPostOptions = {}): MockPost {
  const overrides: Partial<MockPost> = {};

  // Engagement levels
  if (options.highEngagement) {
    overrides.likesCount = 500;
    overrides.commentsCount = 100;
    overrides.sharesCount = 50;
    overrides.viewsCount = 5000;
  }

  if (options.lowEngagement) {
    overrides.likesCount = 0;
    overrides.commentsCount = 0;
    overrides.sharesCount = 0;
    overrides.viewsCount = 5;
  }

  // Post types
  if (options.isQuestion) {
    overrides.postType = 'question';
    overrides.content = 'What is the best fertilizer for wheat in winter season?';
  }

  if (options.isSolution) {
    overrides.postType = 'solution';
    overrides.content = 'I solved this problem by using neem oil spray. Apply every 7 days.';
    overrides.isHelpful = true;
  }

  // User interactions
  if (options.isLiked !== undefined) {
    overrides.isLiked = options.isLiked;
  }

  if (options.isSaved !== undefined) {
    overrides.isSaved = options.isSaved;
  }

  // Images
  if (options.hasImages) {
    overrides.images = [
      '/images/crops/wheat-field.jpg',
      '/images/crops/harvest.jpg',
    ];
  }

  if (options.noImages) {
    overrides.images = [];
  }

  // Author
  if (options.author) {
    overrides.author = options.author;
  }

  // Timestamps
  if (options.isOld) {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 14);
    overrides.createdAt = oldDate;
    overrides.updatedAt = oldDate;
  }

  if (options.isRecent) {
    const recentDate = new Date();
    recentDate.setMinutes(recentDate.getMinutes() - 30);
    overrides.createdAt = recentDate;
    overrides.updatedAt = recentDate;
  }

  // Crop
  if (options.crop) {
    overrides.crop = options.crop;
  }

  return mockPost(overrides);
}

/**
 * Create a mock comment with specific test characteristics
 */
export function createMockComment(
  postId: string,
  options: CreateMockCommentOptions = {}
): MockComment {
  const overrides: Partial<MockComment> = {};

  if (options.isHelpful) {
    overrides.isHelpful = true;
  }

  if (options.isLiked) {
    overrides.isLiked = true;
    overrides.likesCount = 10;
  }

  if (options.isEdited) {
    overrides.isEdited = true;
  }

  if (options.author) {
    overrides.author = options.author;
  }

  const comment = mockComment(postId, overrides);

  // Add replies if requested
  if (options.hasReplies || options.repliesCount) {
    const replyCount = options.repliesCount || 3;
    comment.replies = [];
    comment.repliesCount = replyCount;

    for (let i = 0; i < replyCount; i++) {
      comment.replies.push(
        mockComment(postId, { parentComment: comment._id })
      );
    }
  }

  return comment;
}

/**
 * Create a mock notification with specific type
 */
export function createMockNotification(
  type: MockNotification['type'],
  read: boolean = false
): MockNotification {
  return mockNotification({ type, read });
}

// ============================================================================
// Test Scenario Builders
// ============================================================================

/**
 * Create a complete test scenario with user, posts, and comments
 */
export function createTestScenario() {
  const currentUser = createMockUser();
  const otherUser = createMockUser({ isExpert: true });

  const myPost = createMockPost({
    author: mockAuthor({
      _id: currentUser._id,
      fullName: currentUser.fullName,
      role: currentUser.role,
    }),
    highEngagement: true,
  });

  const otherUserPost = createMockPost({
    author: mockAuthor({
      _id: otherUser._id,
      fullName: otherUser.fullName,
      role: otherUser.role,
    }),
    isQuestion: true,
  });

  const myComment = createMockComment(otherUserPost._id, {
    author: mockAuthor({
      _id: currentUser._id,
      fullName: currentUser.fullName,
    }),
    isHelpful: true,
  });

  const otherUserComment = createMockComment(myPost._id, {
    author: mockAuthor({
      _id: otherUser._id,
      fullName: otherUser.fullName,
    }),
    hasReplies: true,
  });

  return {
    currentUser,
    otherUser,
    myPost,
    otherUserPost,
    myComment,
    otherUserComment,
  };
}

/**
 * Create a feed with specific characteristics for testing
 */
export function createTestFeed(options: {
  count?: number;
  allQuestions?: boolean;
  allSolutions?: boolean;
  allHighEngagement?: boolean;
  withCurrentUserPosts?: boolean;
  currentUserId?: string;
} = {}): MockPost[] {
  const count = options.count || 10;
  const posts: MockPost[] = [];

  for (let i = 0; i < count; i++) {
    const postOptions: CreateMockPostOptions = {};

    if (options.allQuestions) {
      postOptions.isQuestion = true;
    }

    if (options.allSolutions) {
      postOptions.isSolution = true;
    }

    if (options.allHighEngagement) {
      postOptions.highEngagement = true;
    }

    if (options.withCurrentUserPosts && options.currentUserId && i % 3 === 0) {
      postOptions.author = mockAuthor({ _id: options.currentUserId });
    }

    posts.push(createMockPost(postOptions));
  }

  return posts;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Check if a post matches expected characteristics
 */
export function expectPostToMatch(
  post: MockPost,
  expected: Partial<MockPost>
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (post[key as keyof MockPost] !== value) {
      console.error(`Post mismatch: ${key} expected ${value}, got ${post[key as keyof MockPost]}`);
      return false;
    }
  }
  return true;
}

/**
 * Check if engagement counts are reasonable
 */
export function expectValidEngagement(post: MockPost): boolean {
  const errors: string[] = [];

  if (post.likesCount < 0) {
    errors.push('likesCount should not be negative');
  }

  if (post.commentsCount < 0) {
    errors.push('commentsCount should not be negative');
  }

  if (post.sharesCount < 0) {
    errors.push('sharesCount should not be negative');
  }

  if (post.viewsCount < post.likesCount) {
    errors.push('viewsCount should be at least as high as likesCount');
  }

  if (errors.length > 0) {
    console.error('Engagement validation failed:', errors);
    return false;
  }

  return true;
}

/**
 * Check if dates are valid
 */
export function expectValidDates(post: MockPost): boolean {
  const createdAt = new Date(post.createdAt);
  const updatedAt = new Date(post.updatedAt);
  const now = new Date();

  if (isNaN(createdAt.getTime())) {
    console.error('Invalid createdAt date');
    return false;
  }

  if (isNaN(updatedAt.getTime())) {
    console.error('Invalid updatedAt date');
    return false;
  }

  if (createdAt > now) {
    console.error('createdAt is in the future');
    return false;
  }

  if (updatedAt < createdAt) {
    console.error('updatedAt is before createdAt');
    return false;
  }

  return true;
}

// ============================================================================
// Mock Storage
// ============================================================================

/**
 * Mock localStorage for testing
 */
export class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Setup mock localStorage for tests
 */
export function setupMockStorage(): MockStorage {
  const mockStorage = new MockStorage();

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  }

  return mockStorage;
}

// ============================================================================
// Provider Wrapper for Testing
// ============================================================================

/**
 * Create a wrapper component with all providers needed for testing
 * Note: This is a placeholder that can be extended with actual providers
 */
export function createTestWrapper() {
  return function TestWrapper({ children }: WrapperProps) {
    // Add providers here as needed (Redux, etc.)
    return React.createElement(React.Fragment, null, children);
  };
}

/**
 * Helper to render with providers (for use with testing libraries)
 */
export function renderWithProviders(ui: React.ReactElement) {
  const Wrapper = createTestWrapper();
  return {
    wrapper: Wrapper,
    ui,
  };
}

// ============================================================================
// Event Helpers
// ============================================================================

/**
 * Create a mock touch event
 */
export function createMockTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientX: number = 0,
  clientY: number = 0
): Partial<TouchEvent> {
  const touch = { clientX, clientY, identifier: 0 } as Touch;
  const touchList = {
    length: 1,
    item: (index: number) => index === 0 ? touch : null,
    [0]: touch,
    [Symbol.iterator]: function* () { yield touch; },
  } as unknown as TouchList;
  
  const emptyTouchList = {
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  } as unknown as TouchList;

  return {
    type,
    touches: type !== 'touchend' ? touchList : emptyTouchList,
    changedTouches: touchList,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

/**
 * Create a mock mouse event
 */
export function createMockMouseEvent(
  type: 'click' | 'mousedown' | 'mouseup' | 'mousemove',
  clientX: number = 0,
  clientY: number = 0
): Partial<MouseEvent> {
  return {
    type,
    clientX,
    clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

// ============================================================================
// Time Helpers
// ============================================================================

/**
 * Fast-forward time for testing animations/timers
 */
export async function advanceTimers(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`waitFor timed out after ${timeout}ms`);
    }
    await advanceTimers(interval);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Mock creators
  createMockUser,
  createMockPost,
  createMockComment,
  createMockNotification,

  // Scenario builders
  createTestScenario,
  createTestFeed,

  // Assertions
  expectPostToMatch,
  expectValidEngagement,
  expectValidDates,

  // Mock storage
  MockStorage,
  setupMockStorage,

  // Providers
  createTestWrapper,
  renderWithProviders,

  // Event helpers
  createMockTouchEvent,
  createMockMouseEvent,

  // Time helpers
  advanceTimers,
  waitFor,
};
