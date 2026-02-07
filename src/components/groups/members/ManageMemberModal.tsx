'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GroupMemberData, MemberRole } from '@/types/group';
import { MemberRoleBadge, getAssignableRoles } from './MemberRoleBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  IconUserEdit,
  IconUserMinus,
  IconBan,
  IconLoader2,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconShield,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface ManageMemberModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Group ID */
  groupId: string;
  /** Member to manage */
  member: GroupMemberData | null;
  /** Current user's role in the group */
  currentUserRole: MemberRole;
  /** Action type: change-role, remove, or ban */
  action: 'change-role' | 'remove' | 'ban';
  /** Callback when member is updated */
  onMemberUpdated?: (member: GroupMemberData) => void;
  /** Callback when member is removed */
  onMemberRemoved?: (memberId: string) => void;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * ManageMemberModal Component
 * 
 * Modal for admins to manage group members:
 * - Change role (promote/demote)
 * - Remove member from group
 * - Ban member with reason input
 * 
 * Includes confirmation dialogs for destructive actions.
 * 
 * @example
 * <ManageMemberModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   groupId="123"
 *   member={selectedMember}
 *   currentUserRole="admin"
 *   action="change-role"
 * />
 */
export function ManageMemberModal({
  open,
  onOpenChange,
  groupId,
  member,
  currentUserRole,
  action,
  onMemberUpdated,
  onMemberRemoved,
}: ManageMemberModalProps) {
  // State
  const [newRole, setNewRole] = useState<MemberRole>('member');
  const [banReason, setBanReason] = useState('');
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Derived values
  const user = member?.user;
  const displayName = user?.fullName || 'Unknown User';
  const profileImage = user?.profileImage || getDefaultAvatar(displayName);
  const assignableRoles = getAssignableRoles(currentUserRole);
  
  /**
   * Reset state on member change or close
   */
  useEffect(() => {
    if (member) {
      setNewRole(member.role);
    }
    setBanReason('');
    setActionState('idle');
    setErrorMessage(null);
    setShowConfirmDialog(false);
  }, [member, open]);

  /**
   * Handle change role
   */
  const handleChangeRole = async () => {
    if (!member || newRole === member.role) return;

    try {
      setActionState('loading');
      setErrorMessage(null);

      const response = await apiClient.put<{
        success: boolean;
        data: GroupMemberData;
      }>(`/api/groups/${groupId}/members/${member.userId}/role`, {
        role: newRole,
      });

      if (response.data.success) {
        setActionState('success');
        onMemberUpdated?.({
          ...member,
          role: newRole,
        });

        // Close after delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (err: unknown) {
      console.error('Error changing role:', err);
      setActionState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to change role. Please try again.'
      );
    }
  };

  /**
   * Handle remove member
   */
  const handleRemoveMember = async () => {
    if (!member) return;

    try {
      setActionState('loading');
      setErrorMessage(null);
      setShowConfirmDialog(false);

      // Use DELETE with user ID in query or body
      const response = await apiClient.delete<{ success: boolean }>(
        `/api/groups/${groupId}/members/${member.userId}`
      );

      if (response.data.success) {
        setActionState('success');
        onMemberRemoved?.(member._id);

        // Close after delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (err: unknown) {
      console.error('Error removing member:', err);
      setActionState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to remove member. Please try again.'
      );
    }
  };

  /**
   * Handle ban member
   */
  const handleBanMember = async () => {
    if (!member) return;

    try {
      setActionState('loading');
      setErrorMessage(null);
      setShowConfirmDialog(false);

      const response = await apiClient.post<{
        success: boolean;
        data: GroupMemberData;
      }>(`/api/groups/${groupId}/members/ban`, {
        userId: member.userId,
        reason: banReason.trim() || undefined,
      });

      if (response.data.success) {
        setActionState('success');
        onMemberRemoved?.(member._id);

        // Close after delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (err: unknown) {
      console.error('Error banning member:', err);
      setActionState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to ban member. Please try again.'
      );
    }
  };

  /**
   * Handle primary action click
   */
  const handlePrimaryAction = () => {
    if (action === 'change-role') {
      handleChangeRole();
    } else {
      setShowConfirmDialog(true);
    }
  };

  /**
   * Handle confirmation
   */
  const handleConfirm = () => {
    if (action === 'remove') {
      handleRemoveMember();
    } else if (action === 'ban') {
      handleBanMember();
    }
  };

  /**
   * Get modal title
   */
  const getTitle = () => {
    switch (action) {
      case 'change-role':
        return 'Change Member Role';
      case 'remove':
        return 'Remove Member';
      case 'ban':
        return 'Ban Member';
      default:
        return 'Manage Member';
    }
  };

  /**
   * Get modal description
   */
  const getDescription = () => {
    switch (action) {
      case 'change-role':
        return `Update ${displayName}'s role in the group`;
      case 'remove':
        return `Remove ${displayName} from the group`;
      case 'ban':
        return `Ban ${displayName} from the group`;
      default:
        return '';
    }
  };

  /**
   * Get action icon
   */
  const getIcon = () => {
    switch (action) {
      case 'change-role':
        return <IconUserEdit className="h-5 w-5 text-primary-600" />;
      case 'remove':
        return <IconUserMinus className="h-5 w-5 text-orange-500" />;
      case 'ban':
        return <IconBan className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getIcon()}
              {getTitle()}
            </DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          {/* Member Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <img
              src={profileImage}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <MemberRoleBadge role={member.role} size="sm" />
                {user?.role && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Success Message */}
          {actionState === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              <IconCheck className="h-5 w-5" />
              <span>
                {action === 'change-role' && 'Role updated successfully!'}
                {action === 'remove' && 'Member removed successfully!'}
                {action === 'ban' && 'Member banned successfully!'}
              </span>
            </div>
          )}

          {/* Error Message */}
          {actionState === 'error' && errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              <IconX className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action-specific content */}
          {actionState !== 'success' && (
            <>
              {/* Change Role */}
              {action === 'change-role' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      New Role
                    </label>
                    <Select
                      value={newRole}
                      onValueChange={(value) => setNewRole(value as MemberRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem
                            key={role}
                            value={role}
                            disabled={role === member.role}
                          >
                            <div className="flex items-center gap-2">
                              <MemberRoleBadge role={role} size="sm" showLabel={false} />
                              <span>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                              {role === member.role && (
                                <span className="text-xs text-gray-400">(current)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role Description */}
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-start gap-2">
                      <IconShield className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {newRole === 'admin' && (
                          <span>Admins can manage members, edit settings, and moderate content.</span>
                        )}
                        {newRole === 'moderator' && (
                          <span>Moderators can approve posts, remove content, and manage basic members.</span>
                        )}
                        {newRole === 'member' && (
                          <span>Regular members can create posts and participate in discussions.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Remove Member */}
              {action === 'remove' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                    <IconAlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-orange-700 dark:text-orange-400">
                      <p className="font-medium">This action will:</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        <li>Remove {displayName} from the group</li>
                        <li>They will no longer see group content</li>
                        <li>They can rejoin if the group is public</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Ban Member */}
              {action === 'ban' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <IconAlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700 dark:text-red-400">
                      <p className="font-medium">This action will:</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        <li>Permanently ban {displayName} from the group</li>
                        <li>They cannot rejoin until unbanned</li>
                        <li>Their existing posts will remain</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason for ban (optional)
                    </label>
                    <Textarea
                      placeholder="Explain why this member is being banned..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-400 text-right">
                      {banReason.length}/500
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {actionState === 'success' ? 'Close' : 'Cancel'}
            </Button>
            
            {actionState !== 'success' && (
              <Button
                onClick={handlePrimaryAction}
                disabled={
                  actionState === 'loading' ||
                  (action === 'change-role' && newRole === member.role)
                }
                variant={action === 'ban' ? 'destructive' : 'default'}
              >
                {actionState === 'loading' && (
                  <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {action === 'change-role' && 'Update Role'}
                {action === 'remove' && 'Remove Member'}
                {action === 'ban' && 'Ban Member'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Remove/Ban */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'remove' ? 'Remove Member?' : 'Ban Member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'remove'
                ? `Are you sure you want to remove ${displayName} from this group? They can rejoin if the group is public.`
                : `Are you sure you want to ban ${displayName} from this group? They will not be able to rejoin until unbanned.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                action === 'ban' &&
                  'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              )}
            >
              {action === 'remove' ? 'Remove' : 'Ban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ManageMemberModal;
