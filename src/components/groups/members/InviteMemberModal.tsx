'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MemberRole } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconSearch,
  IconUserPlus,
  IconLink,
  IconCopy,
  IconCheck,
  IconLoader2,
  IconX,
  IconCalendar,
  IconUsers,
  IconSend,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';
import { getAssignableRoles } from './MemberRoleBadge';

interface InviteMemberModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole: MemberRole;
  /** Group name for display */
  groupName?: string;
  /** Callback when invitation is sent successfully */
  onInviteSent?: () => void;
}

interface SearchedUser {
  _id: string;
  fullName: string;
  profileImage?: string;
  phone?: string;
}

type InviteMode = 'search' | 'link';
type ExpiryOption = '1d' | '3d' | '7d' | '14d' | '30d' | 'never';

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '2 weeks' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never' },
];

const MAX_USES_OPTIONS = [1, 5, 10, 25, 50, 100];

/**
 * Calculate expiry date from option
 */
function getExpiryDate(option: ExpiryOption): Date | null {
  if (option === 'never') return null;
  
  const days = parseInt(option.replace('d', ''));
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * InviteMemberModal Component
 * 
 * Modal for inviting users to join a group:
 * - Search existing users by name/phone
 * - Generate shareable invite links
 * - Set expiry and max uses for link invites
 * 
 * @example
 * <InviteMemberModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   groupId="123"
 *   currentUserRole="admin"
 * />
 */
export function InviteMemberModal({
  open,
  onOpenChange,
  groupId,
  currentUserRole,
  groupName,
  onInviteSent,
}: InviteMemberModalProps) {
  // Mode: search users or generate link
  const [mode, setMode] = useState<InviteMode>('search');
  
  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchedUser[]>([]);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('member');
  const [message, setMessage] = useState('');
  
  // Link mode state
  const [linkExpiry, setLinkExpiry] = useState<ExpiryOption>('7d');
  const [linkMaxUses, setLinkMaxUses] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Sending state
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Assignable roles based on current user's role
  const assignableRoles = getAssignableRoles(currentUserRole);

  /**
   * Reset modal state
   */
  const resetState = useCallback(() => {
    setMode('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSelectedRole('member');
    setMessage('');
    setLinkExpiry('7d');
    setLinkMaxUses(null);
    setGeneratedLink(null);
    setLinkCopied(false);
    setSending(false);
    setSendError(null);
    setSendSuccess(false);
  }, []);

  /**
   * Reset on close
   */
  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(resetState, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, resetState]);

  /**
   * Search users
   */
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Search users API - this would be a user search endpoint
      const response = await apiClient.get<{ success: boolean; data: { users: SearchedUser[] } }>(
        `/api/user/search?query=${encodeURIComponent(query)}&limit=10`
      );

      if (response.data.success) {
        // Filter out already selected users
        const filtered = response.data.data.users.filter(
          (user: SearchedUser) => !selectedUsers.some((s) => s._id === user._id)
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }, [selectedUsers]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (mode === 'search' && searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, mode, searchUsers]);

  /**
   * Select a user
   */
  const handleSelectUser = (user: SearchedUser) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Remove a selected user
   */
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  /**
   * Send direct invitations
   */
  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setSending(true);
      setSendError(null);

      // Send invitation to each selected user
      const promises = selectedUsers.map((user) =>
        apiClient.post(`/groups/${groupId}/invitations`, {
          invitedUserId: user._id,
          role: selectedRole,
          message: message.trim() || undefined,
        })
      );

      await Promise.all(promises);

      setSendSuccess(true);
      onInviteSent?.();

      // Close after delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err: unknown) {
      console.error('Error sending invitations:', err);
      setSendError(
        err instanceof Error
          ? err.message
          : 'Failed to send invitations. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Generate invite link
   */
  const handleGenerateLink = async () => {
    try {
      setSending(true);
      setSendError(null);

      const expiryDate = getExpiryDate(linkExpiry);

      const response = await apiClient.post<{
        success: boolean;
        data: {
          shareLink: string;
          inviteCode: string;
        };
      }>(`/api/groups/${groupId}/invitations`, {
        maxUses: linkMaxUses,
        expiresAt: expiryDate?.toISOString(),
        role: selectedRole,
      });

      if (response.data.success) {
        setGeneratedLink(response.data.data.shareLink);
      }
    } catch (err: unknown) {
      console.error('Error generating invite link:', err);
      setSendError(
        err instanceof Error
          ? err.message
          : 'Failed to generate invite link. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUserPlus className="h-5 w-5 text-primary-600" />
            Invite Members
          </DialogTitle>
          <DialogDescription>
            Invite people to join {groupName || 'this group'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
          <Button
            variant={mode === 'search' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('search')}
            className="flex-1"
          >
            <IconSearch className="h-4 w-4 mr-2" />
            Find Users
          </Button>
          <Button
            variant={mode === 'link' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('link')}
            className="flex-1"
          >
            <IconLink className="h-4 w-4 mr-2" />
            Invite Link
          </Button>
        </div>

        {/* Success Message */}
        {sendSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            <IconCheck className="h-5 w-5" />
            <span>Invitations sent successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {sendError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
            <IconX className="h-5 w-5" />
            <span>{sendError}</span>
          </div>
        )}

        {!sendSuccess && (
          <>
            {/* Search Mode */}
            {mode === 'search' && (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searching && (
                    <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    {searchResults.map((user) => (
                      <button
                        key={user._id}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-md text-left',
                          'hover:bg-gray-100 dark:hover:bg-gray-800',
                          'transition-colors'
                        )}
                        onClick={() => handleSelectUser(user)}
                      >
                        <img
                          src={user.profileImage || getDefaultAvatar(user.fullName)}
                          alt={user.fullName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                          {user.fullName}
                        </span>
                        <IconUserPlus className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected ({selectedUsers.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <Badge
                          key={user._id}
                          variant="secondary"
                          className="pl-1 pr-1 py-1 flex items-center gap-1"
                        >
                          <img
                            src={user.profileImage || getDefaultAvatar(user.fullName)}
                            alt={user.fullName}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                          <span className="text-xs">{user.fullName}</span>
                          <button
                            onClick={() => handleRemoveUser(user._id)}
                            className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                          >
                            <IconX className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                {assignableRoles.length > 0 && selectedUsers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Invite as
                    </label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) => setSelectedRole(value as MemberRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Optional Message */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Message (optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="Add a personal message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Link Mode */}
            {mode === 'link' && (
              <div className="space-y-4">
                {!generatedLink ? (
                  <>
                    {/* Expiry Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <IconCalendar className="h-4 w-4" />
                        Link expires after
                      </label>
                      <Select
                        value={linkExpiry}
                        onValueChange={(value) => setLinkExpiry(value as ExpiryOption)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Max Uses Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <IconUsers className="h-4 w-4" />
                        Max number of uses
                      </label>
                      <Select
                        value={linkMaxUses?.toString() || 'unlimited'}
                        onValueChange={(value) =>
                          setLinkMaxUses(value === 'unlimited' ? null : parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unlimited">Unlimited</SelectItem>
                          {MAX_USES_OPTIONS.map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'use' : 'uses'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Role Selection */}
                    {assignableRoles.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          New members will join as
                        </label>
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setSelectedRole(value as MemberRole)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                ) : (
                  /* Generated Link Display */
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Share this link
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="text-sm bg-gray-50 dark:bg-gray-800"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="shrink-0"
                      >
                        {linkCopied ? (
                          <IconCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <IconCopy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {linkExpiry === 'never'
                        ? 'This link never expires'
                        : `This link expires in ${EXPIRY_OPTIONS.find((o) => o.value === linkExpiry)?.label}`}
                      {linkMaxUses && ` and can be used ${linkMaxUses} times`}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sendSuccess || generatedLink ? 'Close' : 'Cancel'}
          </Button>
          
          {!sendSuccess && mode === 'search' && selectedUsers.length > 0 && (
            <Button
              onClick={handleSendInvitations}
              disabled={sending}
            >
              {sending ? (
                <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <IconSend className="h-4 w-4 mr-2" />
              )}
              Send {selectedUsers.length === 1 ? 'Invitation' : `${selectedUsers.length} Invitations`}
            </Button>
          )}
          
          {!sendSuccess && mode === 'link' && !generatedLink && (
            <Button
              onClick={handleGenerateLink}
              disabled={sending}
            >
              {sending ? (
                <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <IconLink className="h-4 w-4 mr-2" />
              )}
              Generate Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberModal;
