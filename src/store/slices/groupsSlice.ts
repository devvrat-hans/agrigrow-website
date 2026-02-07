/**
 * Groups Redux Slice
 * 
 * Redux Toolkit slice for managing groups list state.
 * Handles fetching, creating, joining, and leaving groups.
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { GroupData, GroupType, GroupPrivacy } from '@/types/group';
import apiClient from '@/lib/api-client';

// ============================================
// Types
// ============================================

export interface GroupsFilters {
  groupType?: GroupType | null;
  crop?: string | null;
  region?: string | null;
  sortBy?: 'popular' | 'recent' | 'alphabetical';
  search?: string;
}

export interface GroupsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GroupsState {
  /** Normalized groups by ID */
  groups: Record<string, GroupData>;
  /** Ordered list of group IDs for display */
  groupsList: string[];
  /** IDs of groups the current user is a member of */
  myGroups: string[];
  /** Whether groups are loading */
  isLoading: boolean;
  /** Whether my groups are loading */
  isLoadingMyGroups: boolean;
  /** Error message if any */
  error: string | null;
  /** Pagination state */
  pagination: GroupsPagination;
  /** Current filters */
  filters: GroupsFilters;
}

// ============================================
// Initial State
// ============================================

const initialState: GroupsState = {
  groups: {},
  groupsList: [],
  myGroups: [],
  isLoading: false,
  isLoadingMyGroups: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: true,
  },
  filters: {
    groupType: null,
    crop: null,
    region: null,
    sortBy: 'popular',
    search: '',
  },
};

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch groups with filtering and pagination
 */
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (
    { page = 1, append = false }: { page?: number; append?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { groups: GroupsState };
      const { filters, pagination } = state.groups;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.groupType) params.append('groupType', filters.groupType);
      if (filters.crop) params.append('crop', filters.crop);
      if (filters.region) params.append('region', filters.region);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get(`/groups?${params.toString()}`);

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch groups');
      }

      return {
        groups: response.data.data.groups as GroupData[],
        pagination: response.data.data.pagination as GroupsPagination,
        append,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch groups'
      );
    }
  }
);

/**
 * Fetch groups the current user is a member of
 */
export const fetchMyGroups = createAsyncThunk(
  'groups/fetchMyGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/groups/my-groups');

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to fetch my groups');
      }

      return response.data.data.groups as GroupData[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch my groups'
      );
    }
  }
);

/**
 * Create a new group
 */
export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (
    groupData: {
      name: string;
      description?: string;
      groupType: GroupType;
      privacy: GroupPrivacy;
      icon?: string;
      crops?: string[];
      region?: string;
      tags?: string[];
      rules?: { title: string; description: string }[];
      settings?: {
        allowMemberPosts?: boolean;
        requirePostApproval?: boolean;
        allowPolls?: boolean;
        allowImages?: boolean;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post('/groups', groupData);

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to create group');
      }

      return response.data.data as GroupData;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create group'
      );
    }
  }
);

/**
 * Join a group
 */
export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/groups/${groupId}/members`);

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to join group');
      }

      return {
        groupId,
        membership: response.data.data.membership,
        isPending: response.data.data.isPending || false,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to join group'
      );
    }
  }
);

/**
 * Leave a group
 */
export const leaveGroup = createAsyncThunk(
  'groups/leaveGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/groups/${groupId}/members`);

      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to leave group');
      }

      return groupId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to leave group'
      );
    }
  }
);

// ============================================
// Slice
// ============================================

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    /**
     * Set groups directly (for SSR or manual updates)
     */
    setGroups: (
      state,
      action: PayloadAction<{ groups: GroupData[]; replace?: boolean }>
    ) => {
      const { groups, replace = true } = action.payload;

      if (replace) {
        state.groups = {};
        state.groupsList = [];
      }

      groups.forEach((group) => {
        state.groups[group._id] = group;
        if (!state.groupsList.includes(group._id)) {
          state.groupsList.push(group._id);
        }
      });
    },

    /**
     * Add a single group
     */
    addGroup: (state, action: PayloadAction<GroupData>) => {
      const group = action.payload;
      state.groups[group._id] = group;
      if (!state.groupsList.includes(group._id)) {
        state.groupsList.unshift(group._id);
      }
    },

    /**
     * Update an existing group
     */
    updateGroup: (
      state,
      action: PayloadAction<{ groupId: string; updates: Partial<GroupData> }>
    ) => {
      const { groupId, updates } = action.payload;
      if (state.groups[groupId]) {
        state.groups[groupId] = { ...state.groups[groupId], ...updates };
      }
    },

    /**
     * Remove a group from state
     */
    removeGroup: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      delete state.groups[groupId];
      state.groupsList = state.groupsList.filter((id) => id !== groupId);
      state.myGroups = state.myGroups.filter((id) => id !== groupId);
    },

    /**
     * Set user's groups
     */
    setMyGroups: (state, action: PayloadAction<string[]>) => {
      state.myGroups = action.payload;
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Update filters
     */
    setFilters: (state, action: PayloadAction<Partial<GroupsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    /**
     * Reset filters to default
     */
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },

    /**
     * Reset pagination
     */
    resetPagination: (state) => {
      state.pagination = initialState.pagination;
      state.groupsList = [];
    },

    /**
     * Clear all groups state
     */
    clearGroups: (_state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchGroups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        const { groups, pagination, append } = action.payload;

        if (!append) {
          state.groups = {};
          state.groupsList = [];
        }

        groups.forEach((group) => {
          state.groups[group._id] = group;
          if (!state.groupsList.includes(group._id)) {
            state.groupsList.push(group._id);
          }
        });

        state.pagination = pagination;
        state.isLoading = false;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchMyGroups
    builder
      .addCase(fetchMyGroups.pending, (state) => {
        state.isLoadingMyGroups = true;
        state.error = null;
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        const groups = action.payload;

        groups.forEach((group) => {
          state.groups[group._id] = group;
        });

        state.myGroups = groups.map((g) => g._id);
        state.isLoadingMyGroups = false;
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.isLoadingMyGroups = false;
        state.error = action.payload as string;
      });

    // createGroup
    builder
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        const group = action.payload;
        state.groups[group._id] = group;
        state.groupsList.unshift(group._id);
        state.myGroups.unshift(group._id);
        state.isLoading = false;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // joinGroup
    builder
      .addCase(joinGroup.fulfilled, (state, action) => {
        const { groupId, isPending } = action.payload;

        if (state.groups[groupId]) {
          state.groups[groupId] = {
            ...state.groups[groupId],
            isJoined: !isPending,
            userMembershipStatus: isPending ? 'pending' : 'active',
            memberCount: state.groups[groupId].memberCount + (isPending ? 0 : 1),
          };
        }

        if (!isPending && !state.myGroups.includes(groupId)) {
          state.myGroups.push(groupId);
        }
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // leaveGroup
    builder
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const groupId = action.payload;

        if (state.groups[groupId]) {
          state.groups[groupId] = {
            ...state.groups[groupId],
            isJoined: false,
            userRole: undefined,
            userMembershipStatus: undefined,
            memberCount: Math.max(0, state.groups[groupId].memberCount - 1),
          };
        }

        state.myGroups = state.myGroups.filter((id) => id !== groupId);
      })
      .addCase(leaveGroup.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

// ============================================
// Actions Export
// ============================================

export const {
  setGroups,
  addGroup,
  updateGroup,
  removeGroup,
  setMyGroups,
  setLoading,
  setError,
  setFilters,
  resetFilters,
  resetPagination,
  clearGroups,
} = groupsSlice.actions;

// ============================================
// Selectors
// ============================================

/** Type for root state with groups slice */
type RootStateWithGroups = { groups: GroupsState };

/** Select the groups state */
const selectGroupsState = (state: RootStateWithGroups) => state.groups;

/** Select a single group by ID */
export const selectGroupById = createSelector(
  [selectGroupsState, (_: RootStateWithGroups, groupId: string) => groupId],
  (groupsState, groupId) => groupsState.groups[groupId] || null
);

/** Select all groups as an array (in list order) */
export const selectAllGroups = createSelector(
  [selectGroupsState],
  (groupsState) =>
    groupsState.groupsList.map((id) => groupsState.groups[id]).filter(Boolean)
);

/** Select user's groups as an array */
export const selectMyGroups = createSelector(
  [selectGroupsState],
  (groupsState) =>
    groupsState.myGroups.map((id) => groupsState.groups[id]).filter(Boolean)
);

/** Select loading state */
export const selectGroupsLoading = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.isLoading
);

/** Select my groups loading state */
export const selectMyGroupsLoading = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.isLoadingMyGroups
);

/** Select error state */
export const selectGroupsError = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.error
);

/** Select pagination state */
export const selectGroupsPagination = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.pagination
);

/** Select filters */
export const selectGroupsFilters = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.filters
);

/** Select whether more groups can be loaded */
export const selectHasMoreGroups = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.pagination.hasMore
);

/** Select groups count */
export const selectGroupsCount = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.groupsList.length
);

/** Select my groups count */
export const selectMyGroupsCount = createSelector(
  [selectGroupsState],
  (groupsState) => groupsState.myGroups.length
);

// ============================================
// Reducer Export
// ============================================

export default groupsSlice.reducer;
