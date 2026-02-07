/**
 * Reports API Route
 * 
 * POST /api/reports - Create a new report for a post or comment
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report, { ReportReason, ReportedItemType } from '@/models/Report';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Valid report reasons
 */
const VALID_REASONS: ReportReason[] = [
  'spam',
  'inappropriate',
  'misinformation',
  'harassment',
  'other',
];

/**
 * Valid item types
 */
const VALID_ITEM_TYPES: ReportedItemType[] = ['post', 'comment'];

/**
 * POST /api/reports
 * Create a new report for a post or comment
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find user by phone
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { itemType, itemId, reason, description } = body;

    // Validate required fields
    if (!itemType || !itemId || !reason) {
      return NextResponse.json(
        { success: false, error: 'itemType, itemId, and reason are required' },
        { status: 400 }
      );
    }

    // Validate item type
    if (!VALID_ITEM_TYPES.includes(itemType)) {
      return NextResponse.json(
        { success: false, error: `Invalid item type. Must be one of: ${VALID_ITEM_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reason
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { success: false, error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate item ID format
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    // Validate that the item exists
    let item = null;
    if (itemType === 'post') {
      item = await Post.findById(itemObjectId);
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }
    } else if (itemType === 'comment') {
      item = await Comment.findById(itemObjectId);
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }
    }

    // Check if user is trying to report their own content
    const authorId = item?.author?.toString() || item?.authorPhone;
    if (authorId === user._id.toString() || authorId === userPhone) {
      return NextResponse.json(
        { success: false, error: 'You cannot report your own content' },
        { status: 400 }
      );
    }

    // Check for duplicate report
    const existingReport = await Report.findOne({
      reportedBy: user._id,
      itemId: itemObjectId,
      reportedItemType: itemType,
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    // Validate description if provided
    if (description && typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Description must be a string' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Create the report
    const report = await Report.create({
      reportedItemType: itemType,
      itemId: itemObjectId,
      reportedBy: user._id,
      reason,
      description: description?.trim() || undefined,
      status: 'pending',
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Report submitted successfully. Our team will review it shortly.',
        report: {
          id: report._id,
          itemType: report.reportedItemType,
          itemId: report.itemId,
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);

    // Handle duplicate key error (unique index violation)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to submit report. Please try again.' },
      { status: 500 }
    );
  }
}
