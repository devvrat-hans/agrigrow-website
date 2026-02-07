/**
 * Mock Data Utilities for Agrigrow Feed
 *
 * Provides functions to generate realistic mock data for:
 * - Development without backend
 * - Testing components
 * - Demonstrating features
 */

// ============================================================================
// Types
// ============================================================================

export interface MockUser {
  _id: string;
  fullName: string;
  phoneNumber: string;
  profileImage?: string;
  role: 'farmer' | 'student' | 'expert';
  region: string;
  language: string;
  crops: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockAuthor {
  _id: string;
  fullName: string;
  profileImage?: string;
  role?: string;
  region?: string;
}

export interface MockPost {
  _id: string;
  id?: string;
  author: MockAuthor;
  content: string;
  postType: 'crop_update' | 'question' | 'solution' | 'market_info' | 'weather_update' | 'general';
  crop?: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isHelpful?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MockComment {
  _id: string;
  content: string;
  author: MockAuthor;
  postId: string;
  parentComment?: string;
  likesCount: number;
  isLiked?: boolean;
  isHelpful?: boolean;
  isEdited?: boolean;
  repliesCount?: number;
  replies?: MockComment[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface MockNotification {
  _id: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'helpful' | 'share' | 'mention';
  title: string;
  message: string;
  read: boolean;
  relatedPost?: {
    _id: string;
    content: string;
  };
  relatedComment?: {
    _id: string;
    content: string;
  };
  actor?: MockAuthor;
  createdAt: Date | string;
}

// ============================================================================
// Data Constants
// ============================================================================

const FIRST_NAMES = [
  'Rajesh', 'Suresh', 'Mahesh', 'Ganesh', 'Ramesh',
  'Prakash', 'Dinesh', 'Lokesh', 'Mukesh', 'Naresh',
  'Amit', 'Vijay', 'Sanjay', 'Ajay', 'Ravi',
  'Sunita', 'Anita', 'Kavita', 'Savita', 'Lalita',
  'Priya', 'Sita', 'Gita', 'Radha', 'Laxmi',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Verma',
  'Reddy', 'Rao', 'Naidu', 'Patil', 'Kulkarni',
  'Deshmukh', 'More', 'Jadhav', 'Pawar', 'Shinde',
  'Yadav', 'Gupta', 'Agarwal', 'Jain', 'Mehta',
];

const REGIONS = [
  'Maharashtra', 'Gujarat', 'Punjab', 'Haryana', 'Uttar Pradesh',
  'Madhya Pradesh', 'Rajasthan', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh',
  'Telangana', 'West Bengal', 'Bihar', 'Odisha', 'Kerala',
];

const CROPS = [
  'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize',
  'Soybean', 'Groundnut', 'Mustard', 'Sunflower', 'Jowar',
  'Bajra', 'Pulses', 'Onion', 'Potato', 'Tomato',
  'Chili', 'Turmeric', 'Ginger', 'Banana', 'Mango',
];

const CROP_UPDATES = [
  'My wheat crop is looking healthy this season! Good rainfall has helped.',
  'Just completed the first irrigation for my cotton field.',
  'The rice transplanting is done. Now waiting for monsoon.',
  'Noticed some yellowing in my soybean leaves. Any suggestions?',
  'Harvested 40 quintals of wheat per acre this year!',
  'Applied organic manure to my onion crop today.',
  'The mango trees are flowering early this year.',
  'Successfully controlled the pest attack on my tomato plants.',
  'Used drip irrigation for the first time. Very efficient!',
  'My sugarcane is ready for harvest next month.',
];

const QUESTIONS = [
  'What is the best time to plant wheat in Northern India?',
  'How much water does cotton require per irrigation?',
  'Can anyone recommend good organic pesticides for vegetables?',
  'What is the ideal spacing for tomato plants?',
  'How to identify nitrogen deficiency in rice?',
  'Which variety of onion is best for Maharashtra climate?',
  'When should I apply urea to my wheat crop?',
  'How to control aphids in mustard without chemicals?',
  'What is the best crop rotation after rice?',
  'How many times should I irrigate my groundnut crop?',
];

const SOLUTIONS = [
  'For yellowing leaves, try applying zinc sulfate. It worked for my crop.',
  'The best organic pesticide is neem oil mixed with water. Spray every week.',
  'For pest control, try planting marigold around your vegetable garden.',
  'I solved my irrigation problem by installing rainwater harvesting system.',
  'Mulching with paddy straw reduced my water requirements by 30%.',
  'Use vermicompost instead of chemical fertilizers. My yield increased!',
  'For better germination, soak seeds in cow urine for 2 hours before sowing.',
  'Intercropping with legumes improved my soil fertility naturally.',
  'I use pheromone traps for controlling fruit flies. Very effective!',
  'Apply potash during flowering stage for better fruit setting.',
];

const MARKET_INFO = [
  'Cotton prices are ₹7,500 per quintal at Nagpur mandi today.',
  'Onion prices have increased to ₹2,500 per quintal in Nashik.',
  'Good news! Wheat MSP announced at ₹2,275 per quintal.',
  'Tomato prices crashed to ₹10/kg due to oversupply.',
  'Soybean prices steady at ₹4,800 per quintal in Indore.',
  'Government procurement of paddy started in Punjab mandis.',
  'Mango export orders are strong this season. Good prices expected.',
  'Urea available at ₹266 per bag in cooperative stores.',
  'Diesel prices up by ₹3. Transportation costs will increase.',
  'New cold storage facility opened in our district. Better prices expected.',
];

const GENERAL_POSTS = [
  'Proud to be a farmer! This is the most noble profession.',
  'Weather forecast shows good rainfall next week. Plan accordingly!',
  'Attended a workshop on organic farming today. Very informative.',
  'My father taught me everything about farming. Miss him.',
  'Started using smartphone apps for farming advice. Very helpful!',
  'Government should provide more support to small farmers.',
  'Celebrating a good harvest with family today!',
  'Planted trees on the farm boundary. Good for environment.',
  'Young generation should take interest in agriculture.',
  'Thanks to all farmers who feed the nation!',
];

const COMMENT_RESPONSES = [
  'Very helpful information! Thank you for sharing.',
  'I had the same problem. Your solution worked for me too.',
  'Can you share more details about this?',
  'Which variety did you use?',
  'Great advice! Will try this in my field.',
  'I agree with this approach.',
  'Thanks for the market update!',
  'Congratulations on the good harvest!',
  'I have a different experience. Let me share...',
  'This is very useful for new farmers like me.',
  'How much did you spend on this?',
  'Please share the contact of your supplier.',
  'Is this suitable for black soil?',
  'I follow similar practices on my farm.',
  'Well explained! Keep sharing such information.',
];

const PLACEHOLDER_IMAGES = [
  '/images/crops/wheat-field.jpg',
  '/images/crops/rice-paddy.jpg',
  '/images/crops/cotton-plant.jpg',
  '/images/crops/tomato-harvest.jpg',
  '/images/crops/onion-field.jpg',
  '/images/crops/sugarcane.jpg',
  '/images/crops/soybean.jpg',
  '/images/crops/mango-tree.jpg',
  '/images/crops/banana-plant.jpg',
  '/images/crops/vegetable-garden.jpg',
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Get random item from array
 */
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random items from array
 */
function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get random number between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random date within the last N days
 */
function randomRecentDate(daysBack: number = 30): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - randomInt(0, daysBack * 24 * 60 * 60 * 1000));
  return pastDate;
}

/**
 * Generate a random phone number
 */
function randomPhone(): string {
  return `+91${randomInt(7000000000, 9999999999)}`;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Create a mock user
 */
export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const createdAt = randomRecentDate(365);

  return {
    _id: generateId(),
    fullName: `${firstName} ${lastName}`,
    phoneNumber: randomPhone(),
    profileImage: Math.random() > 0.3 ? `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}` : undefined,
    role: randomItem(['farmer', 'student', 'expert'] as const),
    region: randomItem(REGIONS),
    language: randomItem(['en', 'hi', 'mr']),
    crops: randomItems(CROPS, randomInt(1, 4)),
    experienceLevel: randomItem(['beginner', 'intermediate', 'expert'] as const),
    isOnboarded: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

/**
 * Create a mock author (simplified user)
 */
export function mockAuthor(overrides: Partial<MockAuthor> = {}): MockAuthor {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);

  return {
    _id: generateId(),
    fullName: `${firstName} ${lastName}`,
    profileImage: Math.random() > 0.3 ? `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}` : undefined,
    role: randomItem(['farmer', 'student', 'expert']),
    region: randomItem(REGIONS),
    ...overrides,
  };
}

/**
 * Create a mock post
 */
export function mockPost(overrides: Partial<MockPost> = {}): MockPost {
  const postType = overrides.postType || randomItem([
    'crop_update', 'question', 'solution', 'market_info', 'general',
  ] as const);

  let content: string;
  switch (postType) {
    case 'crop_update':
      content = randomItem(CROP_UPDATES);
      break;
    case 'question':
      content = randomItem(QUESTIONS);
      break;
    case 'solution':
      content = randomItem(SOLUTIONS);
      break;
    case 'market_info':
      content = randomItem(MARKET_INFO);
      break;
    default:
      content = randomItem(GENERAL_POSTS);
  }

  const hasImages = Math.random() > 0.4;
  const likesCount = randomInt(0, 150);
  const commentsCount = randomInt(0, 30);
  const id = generateId();
  const createdAt = randomRecentDate(14);

  return {
    _id: id,
    id,
    author: mockAuthor(),
    content: overrides.content || content,
    postType,
    crop: Math.random() > 0.3 ? randomItem(CROPS) : undefined,
    images: hasImages ? randomItems(PLACEHOLDER_IMAGES, randomInt(1, 3)) : [],
    likesCount,
    commentsCount,
    sharesCount: randomInt(0, Math.floor(likesCount / 3)),
    viewsCount: randomInt(likesCount * 2, likesCount * 10),
    isLiked: Math.random() > 0.7,
    isSaved: Math.random() > 0.85,
    isHelpful: postType === 'solution' && Math.random() > 0.6,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

/**
 * Create multiple mock posts (feed)
 */
export function mockFeed(count: number = 10, overrides: Partial<MockPost> = {}): MockPost[] {
  const posts: MockPost[] = [];
  for (let i = 0; i < count; i++) {
    posts.push(mockPost(overrides));
  }
  // Sort by createdAt descending (newest first)
  return posts.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Create a mock comment
 */
export function mockComment(
  postId: string,
  overrides: Partial<MockComment> = {}
): MockComment {
  const id = generateId();
  const createdAt = randomRecentDate(7);

  return {
    _id: id,
    content: randomItem(COMMENT_RESPONSES),
    author: mockAuthor(),
    postId,
    likesCount: randomInt(0, 20),
    isLiked: Math.random() > 0.8,
    isHelpful: Math.random() > 0.9,
    isEdited: Math.random() > 0.95,
    repliesCount: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

/**
 * Create multiple mock comments with optional replies
 */
export function mockComments(
  postId: string,
  count: number = 5,
  includeReplies: boolean = true
): MockComment[] {
  const comments: MockComment[] = [];

  for (let i = 0; i < count; i++) {
    const comment = mockComment(postId);

    // Add replies to some comments
    if (includeReplies && Math.random() > 0.6) {
      const replyCount = randomInt(1, 3);
      comment.replies = [];
      comment.repliesCount = replyCount;

      for (let j = 0; j < replyCount; j++) {
        const reply = mockComment(postId, {
          parentComment: comment._id,
          createdAt: new Date(
            new Date(comment.createdAt).getTime() + randomInt(1, 24) * 60 * 60 * 1000
          ),
        });
        comment.replies.push(reply);
      }
    }

    comments.push(comment);
  }

  // Sort by createdAt descending
  return comments.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Create a mock notification
 */
export function mockNotification(overrides: Partial<MockNotification> = {}): MockNotification {
  const type = overrides.type || randomItem([
    'like', 'comment', 'reply', 'follow', 'helpful', 'share',
  ] as const);

  const actor = mockAuthor();
  let title: string;
  let message: string;

  switch (type) {
    case 'like':
      title = 'New Like';
      message = `${actor.fullName} liked your post`;
      break;
    case 'comment':
      title = 'New Comment';
      message = `${actor.fullName} commented on your post`;
      break;
    case 'reply':
      title = 'New Reply';
      message = `${actor.fullName} replied to your comment`;
      break;
    case 'follow':
      title = 'New Follower';
      message = `${actor.fullName} started following you`;
      break;
    case 'helpful':
      title = 'Helpful Mark';
      message = `${actor.fullName} marked your comment as helpful`;
      break;
    case 'share':
      title = 'Post Shared';
      message = `${actor.fullName} shared your post`;
      break;
    default:
      title = 'Notification';
      message = `${actor.fullName} interacted with your content`;
  }

  const id = generateId();
  const createdAt = randomRecentDate(7);

  return {
    _id: id,
    type,
    title,
    message,
    read: Math.random() > 0.5,
    relatedPost: type !== 'follow' ? {
      _id: generateId(),
      content: randomItem([...CROP_UPDATES, ...QUESTIONS, ...SOLUTIONS]).substring(0, 100),
    } : undefined,
    relatedComment: ['comment', 'reply', 'helpful'].includes(type) ? {
      _id: generateId(),
      content: randomItem(COMMENT_RESPONSES).substring(0, 50),
    } : undefined,
    actor,
    createdAt,
    ...overrides,
  };
}

/**
 * Create multiple mock notifications
 */
export function mockNotifications(count: number = 10): MockNotification[] {
  const notifications: MockNotification[] = [];

  for (let i = 0; i < count; i++) {
    notifications.push(mockNotification());
  }

  // Sort by createdAt descending (newest first)
  return notifications.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ============================================================================
// Development Mode Utilities (DISABLED)
// ============================================================================

/**
 * Check if mock data mode is enabled
 * @deprecated Mock data mode has been disabled
 */
export function isMockDataEnabled(): boolean {
  // Mock data mode is permanently disabled
  return false;
}

/**
 * Enable mock data mode
 * @deprecated Mock data mode has been disabled
 */
export function enableMockData(): void {
  // No-op - mock data mode is disabled
}

/**
 * Disable mock data mode
 * @deprecated Mock data mode has been disabled
 */
export function disableMockData(): void {
  // No-op - mock data mode is disabled
}

/**
 * Toggle mock data mode
 * @deprecated Mock data mode has been disabled
 */
export function toggleMockData(): boolean {
  // No-op - always returns false
  return false;
}

// ============================================================================
// Mock API Response Simulators
// ============================================================================

/**
 * Simulate API delay
 */
export function simulateDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate API response with pagination
 */
export async function mockFeedResponse(
  page: number = 1,
  limit: number = 10
): Promise<{
  success: boolean;
  data: MockPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}> {
  await simulateDelay(randomInt(200, 800));

  const total = 50;
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  const posts = mockFeed(limit);

  return {
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
      nextCursor: hasMore ? `cursor_${page + 1}` : null,
    },
  };
}

/**
 * Simulate comments API response
 */
export async function mockCommentsResponse(
  postId: string,
  limit: number = 10
): Promise<{
  success: boolean;
  data: MockComment[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  await simulateDelay(randomInt(200, 600));

  const comments = mockComments(postId, limit);

  return {
    success: true,
    data: comments,
    hasMore: Math.random() > 0.5,
    nextCursor: Math.random() > 0.5 ? `cursor_2` : null,
  };
}

/**
 * Simulate notifications API response
 */
export async function mockNotificationsResponse(
  limit: number = 10
): Promise<{
  success: boolean;
  data: MockNotification[];
  unreadCount: number;
  hasMore: boolean;
}> {
  await simulateDelay(randomInt(200, 500));

  const notifications = mockNotifications(limit);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    success: true,
    data: notifications,
    unreadCount,
    hasMore: Math.random() > 0.5,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // User generators
  mockUser,
  mockAuthor,

  // Post generators
  mockPost,
  mockFeed,

  // Comment generators
  mockComment,
  mockComments,

  // Notification generators
  mockNotification,
  mockNotifications,

  // Mock mode utilities
  isMockDataEnabled,
  enableMockData,
  disableMockData,
  toggleMockData,

  // API simulators
  simulateDelay,
  mockFeedResponse,
  mockCommentsResponse,
  mockNotificationsResponse,
};
