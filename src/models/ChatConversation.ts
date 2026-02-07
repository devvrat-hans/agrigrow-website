import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Chat message in a conversation
 */
export interface IChatMessage {
  /** Message role */
  role: 'user' | 'model';
  /** Message content */
  content: string;
  /** When the message was sent */
  timestamp: Date;
}

/**
 * Chat conversation document interface
 */
export interface IChatConversation extends Document {
  /** Reference to the user */
  userId: mongoose.Types.ObjectId;
  /** Conversation title (auto-generated or custom) */
  title: string;
  /** Messages in the conversation */
  messages: IChatMessage[];
  /** Optional crops context for this conversation */
  cropsContext?: string[];
  /** Whether the conversation is archived */
  isArchived: boolean;
  /** Total number of messages */
  messageCount: number;
  /** Last message preview (first 100 chars of last AI response) */
  lastMessagePreview?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Chat conversation model static methods
 */
interface IChatConversationModel extends Model<IChatConversation> {
  findByUser(userId: string | mongoose.Types.ObjectId, options?: {
    limit?: number;
    skip?: number;
    includeArchived?: boolean;
  }): Promise<IChatConversation[]>;
  
  getRecentConversations(userId: string | mongoose.Types.ObjectId, limit?: number): Promise<IChatConversation[]>;
  
  searchConversations(userId: string | mongoose.Types.ObjectId, query: string): Promise<IChatConversation[]>;
  
  generateTitle(firstMessage: string): string;
  
  archiveConversation(conversationId: string | mongoose.Types.ObjectId): Promise<IChatConversation | null>;
}

// ============================================
// SCHEMA DEFINITION
// ============================================

/**
 * Chat message sub-schema
 */
const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'model'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000, // Allow longer AI responses
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Chat conversation schema
 */
const ChatConversationSchema = new Schema<IChatConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'New Conversation',
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
      validate: {
        validator: function(messages: IChatMessage[]) {
          // Limit to 100 messages per conversation
          return messages.length <= 100;
        },
        message: 'Conversation has too many messages (max 100)',
      },
    },
    cropsContext: [{
      type: String,
      trim: true,
    }],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessagePreview: {
      type: String,
      maxlength: 150,
    },
  },
  {
    timestamps: true,
    collection: 'chatconversations',
  }
);

// ============================================
// INDEXES
// ============================================

// Compound index for efficient user conversation queries
ChatConversationSchema.index({ userId: 1, updatedAt: -1 });

// Index for archived conversations cleanup
ChatConversationSchema.index({ userId: 1, isArchived: 1 });

// Text index for searching conversations
ChatConversationSchema.index({ title: 'text', 'messages.content': 'text' });

// TTL index - auto-delete archived conversations after 30 days
ChatConversationSchema.index(
  { updatedAt: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { isArchived: true }
  }
);

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

ChatConversationSchema.pre('save', function() {
  // Update message count
  this.messageCount = this.messages.length;
  
  // Generate preview from last AI message
  const lastAiMessage = [...this.messages].reverse().find(m => m.role === 'model');
  if (lastAiMessage) {
    this.lastMessagePreview = lastAiMessage.content.substring(0, 150);
    if (lastAiMessage.content.length > 150) {
      this.lastMessagePreview += '...';
    }
  }
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find conversations by user
 */
ChatConversationSchema.statics.findByUser = async function(
  userId: string | mongoose.Types.ObjectId,
  options: {
    limit?: number;
    skip?: number;
    includeArchived?: boolean;
  } = {}
): Promise<IChatConversation[]> {
  const { limit = 20, skip = 0, includeArchived = false } = options;
  
  const query: Record<string, unknown> = { userId };
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-messages.content') // Exclude message content for list view
    .lean();
};

/**
 * Get recent conversations with full content
 */
ChatConversationSchema.statics.getRecentConversations = async function(
  userId: string | mongoose.Types.ObjectId,
  limit: number = 10
): Promise<IChatConversation[]> {
  return this.find({ userId, isArchived: false })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Search conversations by text
 */
ChatConversationSchema.statics.searchConversations = async function(
  userId: string | mongoose.Types.ObjectId,
  query: string
): Promise<IChatConversation[]> {
  return this.find({
    userId,
    isArchived: false,
    $text: { $search: query },
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .select('-messages.content')
    .lean();
};

/**
 * Generate a title from the first user message
 */
ChatConversationSchema.statics.generateTitle = function(firstMessage: string): string {
  if (!firstMessage) return 'New Conversation';
  
  // Clean up the message
  let title = firstMessage.trim();
  
  // Remove common question starters
  const starters = [
    'what is', 'how do', 'how to', 'can you', 'please tell me',
    'tell me', 'i want to know', 'explain', 'help me',
    'मुझे बताओ', 'कैसे करें', 'क्या है', // Hindi
  ];
  
  for (const starter of starters) {
    if (title.toLowerCase().startsWith(starter)) {
      title = title.substring(starter.length).trim();
      break;
    }
  }
  
  // Take first sentence or first 50 chars
  const firstSentence = title.split(/[.!?।]/)[0] || title;
  title = firstSentence.length > 50 
    ? firstSentence.substring(0, 47) + '...'
    : firstSentence;
  
  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  return title || 'New Conversation';
};

/**
 * Archive a conversation
 */
ChatConversationSchema.statics.archiveConversation = async function(
  conversationId: string | mongoose.Types.ObjectId
): Promise<IChatConversation | null> {
  return this.findByIdAndUpdate(
    conversationId,
    { isArchived: true },
    { new: true }
  );
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add a message to the conversation
 */
ChatConversationSchema.methods.addMessage = async function(
  role: 'user' | 'model',
  content: string
): Promise<IChatConversation> {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
  });
  
  // Auto-generate title from first user message if still default
  if (this.title === 'New Conversation' && role === 'user' && this.messages.length === 1) {
    const ChatConversation = this.constructor as IChatConversationModel;
    this.title = ChatConversation.generateTitle(content);
  }
  
  return this.save();
};

/**
 * Get messages formatted for Gemini API
 */
ChatConversationSchema.methods.getMessagesForApi = function(): Array<{
  role: 'user' | 'model';
  parts: { text: string }[];
}> {
  return this.messages.map((msg: IChatMessage) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
};

// ============================================
// MODEL EXPORT
// ============================================

// Check if model already exists (for hot reloading in development)
const ChatConversation = (mongoose.models.ChatConversation as IChatConversationModel) || 
  mongoose.model<IChatConversation, IChatConversationModel>('ChatConversation', ChatConversationSchema);

export default ChatConversation;
