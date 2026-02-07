import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ChatConversation from '@/models/ChatConversation';
import User from '@/models/User';
import mongoose from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ConversationListItem {
  _id: string;
  title: string;
  messageCount: number;
  lastMessagePreview?: string;
  cropsContext?: string[];
  updatedAt: Date;
  createdAt: Date;
}

interface ConversationListResponse {
  success: boolean;
  data?: {
    conversations: ConversationListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

interface ConversationDetailResponse {
  success: boolean;
  data?: {
    _id: string;
    title: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
      timestamp: Date;
    }>;
    cropsContext?: string[];
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

interface SaveConversationRequest {
  conversationId?: string;
  title?: string;
  messages: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp?: Date;
  }>;
  cropsContext?: string[];
}

interface SaveConversationResponse {
  success: boolean;
  data?: {
    conversationId: string;
    title: string;
  };
  error?: string;
}

interface DeleteConversationResponse {
  success: boolean;
  error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user ID from phone number
 */
async function getUserIdFromPhone(phone: string | null): Promise<mongoose.Types.ObjectId | null> {
  if (!phone) return null;
  
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();
    return user?._id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// ============================================
// GET - List conversations or get single conversation
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<ConversationListResponse | ConversationDetailResponse>> {
  try {
    await dbConnect();
    
    // Get user from header
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = await getUserIdFromPhone(userPhone);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if specific conversation requested
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (conversationId) {
      // Get specific conversation with full messages
      const conversation = await ChatConversation.findOne({
        _id: conversationId,
        userId,
        isArchived: false,
      }).lean();
      
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          _id: conversation._id.toString(),
          title: conversation.title,
          messages: conversation.messages,
          cropsContext: conversation.cropsContext,
          messageCount: conversation.messageCount,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    }
    
    // List conversations (without full message content)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search');
    
    let conversations;
    let total;
    
    if (search) {
      // Search conversations
      conversations = await ChatConversation.find({
        userId,
        isArchived: false,
        $text: { $search: search },
      })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('title messageCount lastMessagePreview cropsContext createdAt updatedAt')
        .lean();
      
      total = await ChatConversation.countDocuments({
        userId,
        isArchived: false,
        $text: { $search: search },
      });
    } else {
      // Get all conversations
      conversations = await ChatConversation.find({
        userId,
        isArchived: false,
      })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title messageCount lastMessagePreview cropsContext createdAt updatedAt')
        .lean();
      
      total = await ChatConversation.countDocuments({
        userId,
        isArchived: false,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversations: conversations.map(c => ({
          _id: c._id.toString(),
          title: c.title,
          messageCount: c.messageCount,
          lastMessagePreview: c.lastMessagePreview,
          cropsContext: c.cropsContext,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + conversations.length < total,
        },
      },
    });
    
  } catch (error) {
    console.error('[Chat History GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Save or update conversation
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<SaveConversationResponse>> {
  try {
    await dbConnect();
    
    // Get user from header
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = await getUserIdFromPhone(userPhone);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body: SaveConversationRequest = await request.json();
    const { conversationId, title, messages, cropsContext } = body;
    
    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages are required' },
        { status: 400 }
      );
    }
    
    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !['user', 'model'].includes(msg.role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid message role' },
          { status: 400 }
        );
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid message content' },
          { status: 400 }
        );
      }
    }
    
    let conversation;
    
    if (conversationId) {
      // Update existing conversation
      conversation = await ChatConversation.findOne({
        _id: conversationId,
        userId,
      });
      
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
      
      // Update messages
      conversation.messages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      
      if (title) {
        conversation.title = title;
      }
      
      if (cropsContext) {
        conversation.cropsContext = cropsContext;
      }
      
      await conversation.save();
      
    } else {
      // Create new conversation
      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const generatedTitle = title || ChatConversation.generateTitle(firstUserMessage?.content || '');
      
      conversation = await ChatConversation.create({
        userId,
        title: generatedTitle,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        })),
        cropsContext: cropsContext || [],
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation._id.toString(),
        title: conversation.title,
      },
    });
    
  } catch (error) {
    console.error('[Chat History POST] Error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete or archive conversation
// ============================================

export async function DELETE(request: NextRequest): Promise<NextResponse<DeleteConversationResponse>> {
  try {
    await dbConnect();
    
    // Get user from header
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = await getUserIdFromPhone(userPhone);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get conversation ID from query
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';
    
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID required' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const conversation = await ChatConversation.findOne({
      _id: conversationId,
      userId,
    });
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    if (permanent) {
      // Permanently delete
      await ChatConversation.deleteOne({ _id: conversationId });
    } else {
      // Soft delete (archive)
      conversation.isArchived = true;
      await conversation.save();
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Chat History DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
