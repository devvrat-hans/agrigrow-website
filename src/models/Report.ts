/**
 * Report Model
 * 
 * Tracks user reports on posts and comments for moderation.
 * Enables community-driven content quality control.
 */

import mongoose, { Schema, Document } from 'mongoose';
import type {
  ReportedItemType,
  ReportReason,
  ReportStatus,
} from '@/types/report';

// Re-export types and constants for backward compatibility with server-side imports
export {
  type ReportedItemType,
  type ReportReason,
  type ReportStatus,
  REPORT_REASON_LABELS,
  REPORT_REASON_DESCRIPTIONS,
} from '@/types/report';

/**
 * Report document interface
 */
export interface IReport extends Document {
  /** Type of item being reported */
  reportedItemType: ReportedItemType;
  /** ID of the reported item (Post or Comment) */
  itemId: mongoose.Types.ObjectId;
  /** User who submitted the report */
  reportedBy: mongoose.Types.ObjectId;
  /** Reason for the report */
  reason: ReportReason;
  /** Optional detailed description */
  description?: string;
  /** Current status of the report */
  status: ReportStatus;
  /** Timestamp when report was created */
  createdAt: Date;
  /** Timestamp when report was last updated */
  updatedAt: Date;
}

/**
 * Report Schema definition
 */
const ReportSchema = new Schema<IReport>(
  {
    reportedItemType: {
      type: String,
      enum: ['post', 'comment'] as ReportedItemType[],
      required: [true, 'Reported item type is required'],
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Item ID is required'],
      refPath: 'reportedItemType === "post" ? "Post" : "Comment"',
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter user ID is required'],
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'misinformation', 'harassment', 'other'] as ReportReason[],
      required: [true, 'Report reason is required'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'] as ReportStatus[],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Index for finding reports by item (to prevent duplicates and for moderation)
ReportSchema.index({ reportedItemType: 1, itemId: 1, reportedBy: 1 }, { unique: true });

// Index for moderation queue (find pending reports)
ReportSchema.index({ status: 1, createdAt: -1 });

// Index for finding reports by user (to detect serial reporters)
ReportSchema.index({ reportedBy: 1, createdAt: -1 });

// Index for finding all reports on a specific item
ReportSchema.index({ itemId: 1, reportedItemType: 1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Check if a user has already reported an item
 */
ReportSchema.statics.hasUserReported = async function(
  userId: mongoose.Types.ObjectId,
  itemId: mongoose.Types.ObjectId,
  itemType: ReportedItemType
): Promise<boolean> {
  const existingReport = await this.findOne({
    reportedBy: userId,
    itemId: itemId,
    reportedItemType: itemType,
  });
  return !!existingReport;
};

/**
 * Get pending report count for moderation dashboard
 */
ReportSchema.statics.getPendingCount = async function(): Promise<number> {
  return this.countDocuments({ status: 'pending' });
};

/**
 * Get reports for a specific item
 */
ReportSchema.statics.getReportsForItem = async function(
  itemId: mongoose.Types.ObjectId,
  itemType: ReportedItemType
): Promise<IReport[]> {
  return this.find({
    itemId: itemId,
    reportedItemType: itemType,
  })
    .populate('reportedBy', 'fullName profileImage')
    .sort({ createdAt: -1 });
};

// ============================================
// MODEL EXPORT
// ============================================

// Delete existing model in development to prevent OverwriteModelError
const Report = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;
