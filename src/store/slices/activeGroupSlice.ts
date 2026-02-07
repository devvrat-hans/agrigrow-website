/**
 * Active Group Redux Slice
 * 
 * Redux Toolkit slice for managing the currently viewed group's detailed state.
 * Handles group details, posts, members, and related interactions.
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import {
  GroupData,
  GroupMemberData,
  GroupPostData,
  GroupCommentData,
  MemberRole,
} from '@/types/group';
import apiClient from '@/lib/api-client';

// ============================================
// Types
// ============================================

export interface ActiveGroupPostsState {
  items: GroupPostData[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ActiveGroupMembersState {
  items: GroupMemberData[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ActiveGroupState {
  /** Currently viewed group data */
  group: GroupData | null;
  /** Current user's membership in this group */
  membership: GroupMemberData | null;
  /** Group posts */
  posts: ActiveGroupPostsState;
  /** Pinned posts */
  pinnedPosts: GroupPostData[];
  /** Group members */
  members: ActiveGroupMembersState;
  /** Whether group details are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Comments by post ID */
  comments: Record<string, GroupCommentData[]>;
  /** Comments loading state by post ID */
  commentsLoading: Record<string, boolean>;
}

// ============================================
// Initial State
// ============================================

const initialState: ActiveGroupState = {
  group: null,
  membership: null,
  posts: {
    items: [],
    page: 1,
    hasMore: true,
    isLoading: false,
    error: null,
  },
  pinnedPosts: [],
  members: {
    items: [],
    page: 1,
    hasMore: true,
    isLoading: false,
    error: null,
  },
  isLoading: false,
  error: null,
  comments: {},
  commentsLoading: {},
};

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch group details by ID or slug
 */
export const fetchGroupDetails = createAsyncThunk(
  'activeGroup/fetchGroupDetails',
  async (groupIdOrSlug: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/groups/${groupIdOrSlug}`);

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch group details');
      }

      return {
        group: response.data.data.group as GroupData,
        membership: response.data.data.membership as GroupMemberData | null,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch group details'
      );
    }
  }
);

/**
 * Fetch group posts with pagination
 */
export const fetchGroupPosts = createAsyncThunk(
  'activeGroup/fetchGroupPosts',
  async (
    {
      groupId,
      page = 1,
      append = false,
      postType,
    }: {
      groupId: string;
      page?: number;
      append?: boolean;
      postType?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (postType) params.append('postType', postType);

      const response = await apiClient.get(
        `/api/groups/${groupId}/posts?${params.toString()}`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch group posts');
      }

      const { posts, pinnedPosts, pagination } = response.data.data;

      return {
        posts: posts as GroupPostData[],
        pinnedPosts: (pinnedPosts || []) as GroupPostData[],
        pagination: pagination as { page: number; hasMore: boolean },
        append,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch group posts'
      );
    }
  }
);

/**
 * Fetch group members with pagination
 */
export const fetchGroupMembers = createAsyncThunk(
  'activeGroup/fetchGroupMembers',
  async (
    {
      groupId,
      page = 1,
      append = false,
      role,
      status,
    }: {
      groupId: string;
      page?: number;
      append?: boolean;
      role?: MemberRole;
      status?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
      });

      if (role) params.append('role', role);
      if (status) params.append('status', status);

      const response = await apiClient.get(
        `/api/groups/${groupId}/members?${params.toString()}`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch group members');
      }

      const { members, pagination } = response.data.data;

      return {
        members: members as GroupMemberData[],
        pagination: pagination as { page: number; hasMore: boolean },
        append,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch group members'
      );
    }
  }
);

/**
 * Create a new post in the group
 */
export const createGroupPost = createAsyncThunk(
  'activeGroup/createGroupPost',
  async (
    {
      groupId,
      content,
      postType = 'discussion',
      images = [],
      poll,
      tags = [],
    }: {
      groupId: string;
      content: string;
      postType?: string;
      images?: string[];
      poll?: { question: string; options: string[]; endDate?: string };
      tags?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(`/groups/${groupId}/posts`, {
        content,
        postType,
        images,
        poll,
        tags,
      });

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to create post');
      }

      return response.data.data.post as GroupPostData;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create post'
      );
    }
  }
);

/**
 * Like a post
 */
export const likeGroupPost = createAsyncThunk(
  'activeGroup/likeGroupPost',
  async (
    { groupId, postId }: { groupId: string; postId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(
        `/api/groups/${groupId}/posts/${postId}/like`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to like post');
      }

      return {
        postId,
        isLiked: response.data.data.isLiked as boolean,
        likesCount: response.data.data.likesCount as number,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to like post'
      );
    }
  }
);

/**
 * Unlike a post
 */
export const unlikeGroupPost = createAsyncThunk(
  'activeGroup/unlikeGroupPost',
  async (
    { groupId, postId }: { groupId: string; postId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.delete(
        `/api/groups/${groupId}/posts/${postId}/like`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to unlike post');
      }

      return {
        postId,
        isLiked: response.data.data.isLiked as boolean,
        likesCount: response.data.data.likesCount as number,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to unlike post'
      );
    }
  }
);

/**
 * Delete a post
 */
export const deleteGroupPost = createAsyncThunk(
  'activeGroup/deleteGroupPost',
  async (
    { groupId, postId }: { groupId: string; postId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.delete(
        `/api/groups/${groupId}/posts/${postId}`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to delete post');
      }

      return postId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete post'
      );
    }
  }
);

/**
 * Pin/unpin a post
 */
export const togglePinPost = createAsyncThunk(
  'activeGroup/togglePinPost',
  async (
    { groupId, postId, isPinned }: { groupId: string; postId: string; isPinned: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.patch(
        `/api/groups/${groupId}/posts/${postId}`,
        { isPinned: !isPinned }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to update post');
      }

      return {
        postId,
        isPinned: !isPinned,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update post'
      );
    }
  }
);

/**
 * Fetch comments for a post
 */
export const fetchPostComments = createAsyncThunk(
  'activeGroup/fetchPostComments',
  async (
    { groupId, postId }: { groupId: string; postId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.get(
        `/api/groups/${groupId}/posts/${postId}/comments`
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch comments');
      }

      return {
        postId,
        comments: response.data.data.comments as GroupCommentData[],
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch comments'
      );
    }
  }
);

/**
 * Add a comment to a post
 */
export const addPostComment = createAsyncThunk(
  'activeGroup/addPostComment',
  async (
    {
      groupId,
      postId,
      content,
      parentId,
    }: {
      groupId: string;
      postId: string;
      content: string;
      parentId?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(
        `/api/groups/${groupId}/posts/${postId}/comments`,
        { content, parentId }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to add comment');
      }

      return {
        postId,
        comment: response.data.data.comment as GroupCommentData,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to add comment'
      );
    }
  }
);

/**
 * Vote on a poll
 */
export const voteOnPoll = createAsyncThunk(
  'activeGroup/voteOnPoll',
  async (
    { groupId, postId, optionIndex }: { groupId: string; postId: string; optionIndex: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(
        `/api/groups/${groupId}/posts/${postId}/vote`,
        { optionIndex }
      );

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to vote');
      }

      return {
        postId,
        poll: response.data.data.poll,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to vote'
      );
    }
  }
);

// ============================================
// Slice
// ============================================

const activeGroupSlice = createSlice({
  name: 'activeGroup',
  initialState,
  reducers: {
    /**
     * Set the active group
     */
    setActiveGroup: (state, action: PayloadAction<GroupData | null>) => {
      state.group = action.payload;
    },

    /**
     * Set membership
     */
    setMembership: (state, action: PayloadAction<GroupMemberData | null>) => {
      state.membership = action.payload;
    },

    /**
     * Update group data
     */
    updateActiveGroup: (state, action: PayloadAction<Partial<GroupData>>) => {
      if (state.group) {
        state.group = { ...state.group, ...action.payload };
      }
    },

    /**
     * Set posts directly
     */
    setPosts: (state, action: PayloadAction<GroupPostData[]>) => {
      state.posts.items = action.payload;
    },

    /**
     * Add a post to the beginning
     */
    addPost: (state, action: PayloadAction<GroupPostData>) => {
      state.posts.items.unshift(action.payload);
      if (state.group) {
        state.group.postCount += 1;
      }
    },

    /**
     * Update a post
     */
    updatePost: (
      state,
      action: PayloadAction<{ postId: string; updates: Partial<GroupPostData> }>
    ) => {
      const { postId, updates } = action.payload;
      const index = state.posts.items.findIndex((p) => p._id === postId);
      if (index !== -1) {
        state.posts.items[index] = { ...state.posts.items[index], ...updates };
      }
      const pinnedIndex = state.pinnedPosts.findIndex((p) => p._id === postId);
      if (pinnedIndex !== -1) {
        state.pinnedPosts[pinnedIndex] = { ...state.pinnedPosts[pinnedIndex], ...updates };
      }
    },

    /**
     * Remove a post
     */
    removePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      state.posts.items = state.posts.items.filter((p) => p._id !== postId);
      state.pinnedPosts = state.pinnedPosts.filter((p) => p._id !== postId);
      delete state.comments[postId];
      if (state.group) {
        state.group.postCount = Math.max(0, state.group.postCount - 1);
      }
    },

    /**
     * Set pinned posts
     */
    setPinnedPosts: (state, action: PayloadAction<GroupPostData[]>) => {
      state.pinnedPosts = action.payload;
    },

    /**
     * Set members
     */
    setMembers: (state, action: PayloadAction<GroupMemberData[]>) => {
      state.members.items = action.payload;
    },

    /**
     * Add a member
     */
    addMember: (state, action: PayloadAction<GroupMemberData>) => {
      state.members.items.unshift(action.payload);
      if (state.group) {
        state.group.memberCount += 1;
      }
    },

    /**
     * Update a member
     */
    updateMember: (
      state,
      action: PayloadAction<{ memberId: string; updates: Partial<GroupMemberData> }>
    ) => {
      const { memberId, updates } = action.payload;
      const index = state.members.items.findIndex((m) => m._id === memberId);
      if (index !== -1) {
        state.members.items[index] = { ...state.members.items[index], ...updates };
      }
    },

    /**
     * Remove a member
     */
    removeMember: (state, action: PayloadAction<string>) => {
      state.members.items = state.members.items.filter((m) => m._id !== action.payload);
      if (state.group) {
        state.group.memberCount = Math.max(0, state.group.memberCount - 1);
      }
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Set posts loading
     */
    setPostsLoading: (state, action: PayloadAction<boolean>) => {
      state.posts.isLoading = action.payload;
    },

    /**
     * Set members loading
     */
    setMembersLoading: (state, action: PayloadAction<boolean>) => {
      state.members.isLoading = action.payload;
    },

    /**
     * Set comments for a post
     */
    setComments: (
      state,
      action: PayloadAction<{ postId: string; comments: GroupCommentData[] }>
    ) => {
      state.comments[action.payload.postId] = action.payload.comments;
    },

    /**
     * Add a comment to a post
     */
    addComment: (
      state,
      action: PayloadAction<{ postId: string; comment: GroupCommentData }>
    ) => {
      const { postId, comment } = action.payload;
      if (!state.comments[postId]) {
        state.comments[postId] = [];
      }
      state.comments[postId].push(comment);

      // Update post comment count
      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      if (postIndex !== -1) {
        state.posts.items[postIndex].commentsCount += 1;
      }
    },

    /**
     * Reset posts pagination
     */
    resetPostsPagination: (state) => {
      state.posts = initialState.posts;
    },

    /**
     * Reset members pagination
     */
    resetMembersPagination: (state) => {
      state.members = initialState.members;
    },

    /**
     * Clear active group state
     */
    clearActiveGroup: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchGroupDetails
    builder
      .addCase(fetchGroupDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupDetails.fulfilled, (state, action) => {
        state.group = action.payload.group;
        state.membership = action.payload.membership;
        state.isLoading = false;
      })
      .addCase(fetchGroupDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchGroupPosts
    builder
      .addCase(fetchGroupPosts.pending, (state) => {
        state.posts.isLoading = true;
        state.posts.error = null;
      })
      .addCase(fetchGroupPosts.fulfilled, (state, action) => {
        const { posts, pinnedPosts, pagination, append } = action.payload;

        if (append) {
          state.posts.items = [...state.posts.items, ...posts];
        } else {
          state.posts.items = posts;
          state.pinnedPosts = pinnedPosts;
        }

        state.posts.page = pagination.page;
        state.posts.hasMore = pagination.hasMore;
        state.posts.isLoading = false;
      })
      .addCase(fetchGroupPosts.rejected, (state, action) => {
        state.posts.isLoading = false;
        state.posts.error = action.payload as string;
      });

    // fetchGroupMembers
    builder
      .addCase(fetchGroupMembers.pending, (state) => {
        state.members.isLoading = true;
        state.members.error = null;
      })
      .addCase(fetchGroupMembers.fulfilled, (state, action) => {
        const { members, pagination, append } = action.payload;

        if (append) {
          state.members.items = [...state.members.items, ...members];
        } else {
          state.members.items = members;
        }

        state.members.page = pagination.page;
        state.members.hasMore = pagination.hasMore;
        state.members.isLoading = false;
      })
      .addCase(fetchGroupMembers.rejected, (state, action) => {
        state.members.isLoading = false;
        state.members.error = action.payload as string;
      });

    // createGroupPost
    builder
      .addCase(createGroupPost.fulfilled, (state, action) => {
        const post = action.payload;
        // Only add if approved or user is the author
        if (post.isApproved) {
          state.posts.items.unshift(post);
          if (state.group) {
            state.group.postCount += 1;
          }
        }
      })
      .addCase(createGroupPost.rejected, (state, action) => {
        state.posts.error = action.payload as string;
      });

    // likeGroupPost
    builder.addCase(likeGroupPost.fulfilled, (state, action) => {
      const { postId, isLiked, likesCount } = action.payload;
      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      if (postIndex !== -1) {
        state.posts.items[postIndex].isLiked = isLiked;
        state.posts.items[postIndex].likesCount = likesCount;
      }
      const pinnedIndex = state.pinnedPosts.findIndex((p) => p._id === postId);
      if (pinnedIndex !== -1) {
        state.pinnedPosts[pinnedIndex].isLiked = isLiked;
        state.pinnedPosts[pinnedIndex].likesCount = likesCount;
      }
    });

    // unlikeGroupPost
    builder.addCase(unlikeGroupPost.fulfilled, (state, action) => {
      const { postId, isLiked, likesCount } = action.payload;
      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      if (postIndex !== -1) {
        state.posts.items[postIndex].isLiked = isLiked;
        state.posts.items[postIndex].likesCount = likesCount;
      }
      const pinnedIndex = state.pinnedPosts.findIndex((p) => p._id === postId);
      if (pinnedIndex !== -1) {
        state.pinnedPosts[pinnedIndex].isLiked = isLiked;
        state.pinnedPosts[pinnedIndex].likesCount = likesCount;
      }
    });

    // deleteGroupPost
    builder.addCase(deleteGroupPost.fulfilled, (state, action) => {
      const postId = action.payload;
      state.posts.items = state.posts.items.filter((p) => p._id !== postId);
      state.pinnedPosts = state.pinnedPosts.filter((p) => p._id !== postId);
      delete state.comments[postId];
      if (state.group) {
        state.group.postCount = Math.max(0, state.group.postCount - 1);
      }
    });

    // togglePinPost
    builder.addCase(togglePinPost.fulfilled, (state, action) => {
      const { postId, isPinned } = action.payload;

      // Find the post
      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      const post = postIndex !== -1 ? state.posts.items[postIndex] : null;

      if (post) {
        if (isPinned) {
          // Move to pinned
          state.posts.items.splice(postIndex, 1);
          state.pinnedPosts.unshift({ ...post, isPinned: true });
        } else {
          // Already in items, just update
          state.posts.items[postIndex].isPinned = false;
        }
      }

      // Also check pinned posts
      const pinnedIndex = state.pinnedPosts.findIndex((p) => p._id === postId);
      if (pinnedIndex !== -1) {
        if (!isPinned) {
          // Move from pinned to regular
          const unpinnedPost = state.pinnedPosts[pinnedIndex];
          state.pinnedPosts.splice(pinnedIndex, 1);
          state.posts.items.unshift({ ...unpinnedPost, isPinned: false });
        } else {
          state.pinnedPosts[pinnedIndex].isPinned = true;
        }
      }
    });

    // fetchPostComments
    builder
      .addCase(fetchPostComments.pending, (state, action) => {
        const postId = action.meta.arg.postId;
        state.commentsLoading[postId] = true;
      })
      .addCase(fetchPostComments.fulfilled, (state, action) => {
        const { postId, comments } = action.payload;
        state.comments[postId] = comments;
        state.commentsLoading[postId] = false;
      })
      .addCase(fetchPostComments.rejected, (state, action) => {
        const postId = action.meta.arg.postId;
        state.commentsLoading[postId] = false;
      });

    // addPostComment
    builder.addCase(addPostComment.fulfilled, (state, action) => {
      const { postId, comment } = action.payload;
      if (!state.comments[postId]) {
        state.comments[postId] = [];
      }
      state.comments[postId].push(comment);

      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      if (postIndex !== -1) {
        state.posts.items[postIndex].commentsCount += 1;
      }
    });

    // voteOnPoll
    builder.addCase(voteOnPoll.fulfilled, (state, action) => {
      const { postId, poll } = action.payload;
      const postIndex = state.posts.items.findIndex((p) => p._id === postId);
      if (postIndex !== -1 && state.posts.items[postIndex].poll) {
        state.posts.items[postIndex].poll = poll;
      }
      const pinnedIndex = state.pinnedPosts.findIndex((p) => p._id === postId);
      if (pinnedIndex !== -1 && state.pinnedPosts[pinnedIndex].poll) {
        state.pinnedPosts[pinnedIndex].poll = poll;
      }
    });
  },
});

// ============================================
// Actions Export
// ============================================

export const {
  setActiveGroup,
  setMembership,
  updateActiveGroup,
  setPosts,
  addPost,
  updatePost,
  removePost,
  setPinnedPosts,
  setMembers,
  addMember,
  updateMember,
  removeMember,
  setLoading,
  setError,
  setPostsLoading,
  setMembersLoading,
  setComments,
  addComment,
  resetPostsPagination,
  resetMembersPagination,
  clearActiveGroup,
} = activeGroupSlice.actions;

// ============================================
// Selectors
// ============================================

/** Type for root state with activeGroup slice */
type RootStateWithActiveGroup = { activeGroup: ActiveGroupState };

/** Select the active group state */
const selectActiveGroupState = (state: RootStateWithActiveGroup) => state.activeGroup;

/** Select the current group */
export const selectActiveGroup = createSelector(
  [selectActiveGroupState],
  (state) => state.group
);

/** Select the user's membership */
export const selectActiveMembership = createSelector(
  [selectActiveGroupState],
  (state) => state.membership
);

/** Select the user's role in the active group */
export const selectActiveUserRole = createSelector(
  [selectActiveGroupState],
  (state) => state.membership?.role || null
);

/** Select whether user is a moderator or higher */
export const selectIsModeratorOrHigher = createSelector(
  [selectActiveUserRole],
  (role) => role === 'moderator' || role === 'admin' || role === 'owner'
);

/** Select whether user is an admin or owner */
export const selectIsAdminOrOwner = createSelector(
  [selectActiveUserRole],
  (role) => role === 'admin' || role === 'owner'
);

/** Select all posts */
export const selectActivePosts = createSelector(
  [selectActiveGroupState],
  (state) => state.posts.items
);

/** Select pinned posts */
export const selectActivePinnedPosts = createSelector(
  [selectActiveGroupState],
  (state) => state.pinnedPosts
);

/** Select posts with pinned first */
export const selectAllPostsWithPinned = createSelector(
  [selectActivePinnedPosts, selectActivePosts],
  (pinned, posts) => [...pinned, ...posts]
);

/** Select posts loading state */
export const selectPostsLoading = createSelector(
  [selectActiveGroupState],
  (state) => state.posts.isLoading
);

/** Select posts has more */
export const selectPostsHasMore = createSelector(
  [selectActiveGroupState],
  (state) => state.posts.hasMore
);

/** Select posts error */
export const selectPostsError = createSelector(
  [selectActiveGroupState],
  (state) => state.posts.error
);

/** Select all members */
export const selectActiveMembers = createSelector(
  [selectActiveGroupState],
  (state) => state.members.items
);

/** Select members loading state */
export const selectMembersLoading = createSelector(
  [selectActiveGroupState],
  (state) => state.members.isLoading
);

/** Select members has more */
export const selectMembersHasMore = createSelector(
  [selectActiveGroupState],
  (state) => state.members.hasMore
);

/** Select members error */
export const selectMembersError = createSelector(
  [selectActiveGroupState],
  (state) => state.members.error
);

/** Select loading state */
export const selectActiveGroupLoading = createSelector(
  [selectActiveGroupState],
  (state) => state.isLoading
);

/** Select error */
export const selectActiveGroupError = createSelector(
  [selectActiveGroupState],
  (state) => state.error
);

/** Select comments for a post */
export const selectPostComments = createSelector(
  [
    selectActiveGroupState,
    (_: RootStateWithActiveGroup, postId: string) => postId,
  ],
  (state, postId) => state.comments[postId] || []
);

/** Select comments loading for a post */
export const selectCommentsLoading = createSelector(
  [
    selectActiveGroupState,
    (_: RootStateWithActiveGroup, postId: string) => postId,
  ],
  (state, postId) => state.commentsLoading[postId] || false
);

/** Select a post by ID */
export const selectPostById = createSelector(
  [
    selectActiveGroupState,
    (_: RootStateWithActiveGroup, postId: string) => postId,
  ],
  (state, postId) => {
    const found = state.posts.items.find((p) => p._id === postId);
    if (found) return found;
    return state.pinnedPosts.find((p) => p._id === postId) || null;
  }
);

// ============================================
// Reducer Export
// ============================================

export default activeGroupSlice.reducer;
