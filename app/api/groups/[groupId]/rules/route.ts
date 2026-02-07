/**
 * Group Rules API Route
 * 
 * API endpoint for managing group rules.
 * 
 * Endpoints:
 * - GET /api/groups/[groupId]/rules - Get current rules
 * - PUT /api/groups/[groupId]/rules - Update rules (requires admin/owner)
 * 
 * Authentication:
 * - GET: Optional (for viewing rules)
 * - PUT: Required via x-user-phone header (must be admin or owner)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import User from '@/models/User';
import { GroupRule, MemberRole } from '@/types/group';

// ============================================
// CONSTANTS
// ============================================

const MAX_RULE_TITLE_LENGTH = 100;
const MAX_RULE_DESCRIPTION_LENGTH = 500;
const MAX_RULES_COUNT = 20;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(str: string): boolean {
  return mongoose.Types.ObjectId.isValid(str) && 
    new mongoose.Types.ObjectId(str).toString() === str;
}

/**
 * Get user from phone number
 */
async function getUserFromPhone(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  return User.findOne({ phone: cleanPhone });
}

/**
 * Check user's role in a group
 */
async function getUserGroupRole(
  groupId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<{ role: MemberRole | null; status: string | null }> {
  const membership = await GroupMembership.findOne({
    groupId,
    userId,
  }).lean();

  if (!membership) {
    return { role: null, status: null };
  }

  return {
    role: membership.role as MemberRole,
    status: membership.status,
  };
}

/**
 * Check if user has at least the required role
 */
function hasRequiredRole(userRole: MemberRole | null, requiredRole: MemberRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<MemberRole, number> = {
    member: 1,
    moderator: 2,
    admin: 3,
    owner: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Validate rules array
 */
function validateRules(rules: unknown): { valid: boolean; error?: string; rules?: GroupRule[] } {
  if (!Array.isArray(rules)) {
    return { valid: false, error: 'Rules must be an array' };
  }

  if (rules.length > MAX_RULES_COUNT) {
    return { valid: false, error: `Maximum ${MAX_RULES_COUNT} rules allowed` };
  }

  const validatedRules: GroupRule[] = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // Check title exists and is a string
    if (!rule.title || typeof rule.title !== 'string') {
      return { valid: false, error: `Rule ${i + 1}: Title is required` };
    }

    const trimmedTitle = rule.title.trim();
    
    // Check title length
    if (trimmedTitle.length === 0) {
      return { valid: false, error: `Rule ${i + 1}: Title cannot be empty` };
    }

    if (trimmedTitle.length > MAX_RULE_TITLE_LENGTH) {
      return { 
        valid: false, 
        error: `Rule ${i + 1}: Title cannot exceed ${MAX_RULE_TITLE_LENGTH} characters`,
      };
    }

    // Check description if provided
    let trimmedDescription = '';
    if (rule.description) {
      if (typeof rule.description !== 'string') {
        return { valid: false, error: `Rule ${i + 1}: Description must be a string` };
      }
      
      trimmedDescription = rule.description.trim();
      
      if (trimmedDescription.length > MAX_RULE_DESCRIPTION_LENGTH) {
        return { 
          valid: false, 
          error: `Rule ${i + 1}: Description cannot exceed ${MAX_RULE_DESCRIPTION_LENGTH} characters`,
        };
      }
    }

    validatedRules.push({
      title: trimmedTitle,
      description: trimmedDescription,
    });
  }

  return { valid: true, rules: validatedRules };
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RouteParams {
  params: Promise<{ groupId: string }>;
}

// ============================================
// GET /api/groups/[groupId]/rules
// ============================================

/**
 * GET /api/groups/[groupId]/rules
 * 
 * Get current group rules.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupRule[] }
 * 
 * Error Codes:
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Build query - support both ID and slug
    const query: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(query).select('rules isActive').lean();

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Return rules
    const rules: GroupRule[] = (group.rules || []).map(rule => ({
      title: rule.title || '',
      description: rule.description || '',
    }));

    return NextResponse.json({
      success: true,
      data: rules,
    });

  } catch (error) {
    console.error('Error fetching group rules:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch group rules',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/groups/[groupId]/rules
// ============================================

/**
 * PUT /api/groups/[groupId]/rules
 * 
 * Replace entire group rules array. Requires admin or owner role.
 * 
 * Path Parameters:
 * @param {string} groupId - Group ID (ObjectId) or slug
 * 
 * Headers:
 * @header {string} x-user-phone - Required for authentication
 * 
 * Request Body:
 * @body {Object[]} rules - Array of rule objects
 * @body {string} rules[].title - Rule title (required, max 100 chars)
 * @body {string} rules[].description - Rule description (optional, max 500 chars)
 * 
 * Response:
 * @returns {Object} { success: boolean, data: GroupRule[] }
 * 
 * Error Codes:
 * - 400: Validation error
 * - 401: Authentication required
 * - 403: Not authorized (not admin/owner)
 * - 404: Group not found
 * - 500: Server error
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { groupId } = await params;

    // Check authentication
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUser = await getUserFromPhone(authPhone);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Build query - support both ID and slug
    const query: Record<string, unknown> = isValidObjectId(groupId)
      ? { _id: new mongoose.Types.ObjectId(groupId) }
      : { slug: groupId };

    // Find group
    const group = await Group.findOne(query);

    if (!group || !group.isActive) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check user's role - must be admin or owner
    const { role: userRole, status: memberStatus } = await getUserGroupRole(
      group._id as mongoose.Types.ObjectId,
      currentUser._id as mongoose.Types.ObjectId
    );

    if (!hasRequiredRole(userRole, 'admin') || memberStatus !== 'active') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update group rules' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { rules } = body;

    // Validate rules
    const validation = validateRules(rules);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Update the group rules
    await Group.findByIdAndUpdate(
      group._id,
      { $set: { rules: validation.rules } },
      { runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Group rules updated successfully',
      data: validation.rules,
    });

  } catch (error) {
    console.error('Error updating group rules:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update group rules',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
