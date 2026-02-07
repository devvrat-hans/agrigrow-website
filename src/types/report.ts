/**
 * Report Types for Client Components
 * 
 * These types and constants are separated from the Mongoose model
 * so they can be safely imported in client components.
 */

/**
 * Types of items that can be reported
 */
export type ReportedItemType = 'post' | 'comment';

/**
 * Report reason categories
 */
export type ReportReason = 
  | 'spam'
  | 'inappropriate'
  | 'misinformation'
  | 'harassment'
  | 'other';

/**
 * Report status for moderation workflow
 */
export type ReportStatus = 
  | 'pending'
  | 'reviewed'
  | 'resolved'
  | 'dismissed';

/**
 * Report reason labels for UI
 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam or misleading',
  inappropriate: 'Inappropriate content',
  misinformation: 'False information',
  harassment: 'Harassment or bullying',
  other: 'Other',
};

/**
 * Report reason descriptions for UI
 */
export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
  spam: 'Content that is promotional, repetitive, or misleading',
  inappropriate: 'Content that is offensive, explicit, or violates community guidelines',
  misinformation: 'Information that is factually incorrect or potentially harmful',
  harassment: 'Content that targets or intimidates individuals',
  other: 'Report for a reason not listed above',
};
