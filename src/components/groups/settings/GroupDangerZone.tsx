'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GroupData, MemberRole } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  IconAlertTriangle,
  IconUserShare,
  IconTrash,
  IconLoader2,
  IconCheck,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface GroupDangerZoneProps {
  /** Group data */
  group: GroupData;
  /** Current user's role in the group (must be owner for this component) */
  userRole: MemberRole;
  /** Callback when ownership is transferred */
  onOwnershipTransferred?: (newOwnerId: string) => void;
  /** Callback when group is deleted */
  onGroupDeleted?: () => void;
  /** Callback when there's an error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface AdminUser {
  _id: string;
  fullName: string;
  profileImage?: string;
}

/**
 * Get default avatar URL
 */
function getDefaultAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`;
}

/**
 * GroupDangerZone Component
 * 
 * Danger zone section for group settings. Only visible to owner.
 * Contains:
 * - Transfer ownership option
 * - Delete group button with confirmation
 * 
 * @example
 * <GroupDangerZone
 *   group={groupData}
 *   userRole="owner"
 *   onGroupDeleted={() => router.push('/communities')}
 * />
 */
export function GroupDangerZone({
  group,
  userRole,
  onOwnershipTransferred,
  onGroupDeleted,
  onError,
  className,
}: GroupDangerZoneProps) {
  // Only show for owners
  if (userRole !== 'owner') {
    return null;
  }

  // State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // The group name that must be typed for confirmation
  const confirmationText = group.name;

  /**
   * Fetch admins when opening transfer modal
   */
  const handleOpenTransferModal = async () => {
    setShowTransferModal(true);
    setLoadingAdmins(true);

    try {
      // Fetch group members who are admins
      const response = await apiClient.get<{
        success: boolean;
        data: { members: Array<{ userId: string; user: AdminUser }> };
      }>(`/api/groups/${group._id}/members?role=admin&limit=50`);

      if (response.data.success) {
        const adminUsers = response.data.data.members
          .map((m) => m.user)
          .filter((u): u is AdminUser => u !== undefined);
        setAdmins(adminUsers);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      onError?.('Failed to load admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

  /**
   * Transfer ownership to selected admin
   */
  const handleTransferOwnership = async () => {
    if (!selectedAdmin) return;

    try {
      setTransferring(true);

      const response = await apiClient.post<{ success: boolean }>(
        `/api/groups/${group._id}/transfer-ownership`,
        { newOwnerId: selectedAdmin._id }
      );

      if (response.data.success) {
        setShowTransferModal(false);
        onOwnershipTransferred?.(selectedAdmin._id);
      }
    } catch (err: unknown) {
      console.error('Error transferring ownership:', err);
      onError?.(
        err instanceof Error
          ? err.message
          : 'Failed to transfer ownership. Please try again.'
      );
    } finally {
      setTransferring(false);
    }
  };

  /**
   * Delete the group
   */
  const handleDeleteGroup = async () => {
    try {
      setDeleting(true);

      const response = await apiClient.delete<{ success: boolean }>(
        `/api/groups/${group._id}`
      );

      if (response.data.success) {
        setShowDeleteDialog(false);
        onGroupDeleted?.();
      }
    } catch (err: unknown) {
      console.error('Error deleting group:', err);
      onError?.(
        err instanceof Error
          ? err.message
          : 'Failed to delete group. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        'space-y-4 p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <IconAlertTriangle className="h-5 w-5 text-red-500" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
          Danger Zone
        </h3>
      </div>

      <p className="text-sm text-red-600 dark:text-red-400">
        These actions are irreversible. Please proceed with caution.
      </p>

      {/* Actions */}
      <div className="space-y-3">
        {/* Transfer Ownership */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Transfer Ownership
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transfer group ownership to another admin
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleOpenTransferModal}
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <IconUserShare className="h-4 w-4 mr-2" />
            Transfer
          </Button>
        </div>

        {/* Delete Group */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Delete Group
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Permanently delete this group and all its content
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <IconTrash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserShare className="h-5 w-5 text-amber-500" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              Select an admin to transfer ownership to. You will become an admin after transfer.
            </DialogDescription>
          </DialogHeader>

          {/* Admin List */}
          <div className="py-4">
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No other admins available</p>
                <p className="text-xs mt-1">Promote a member to admin first</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {admins.map((admin) => (
                  <button
                    key={admin._id}
                    onClick={() => setSelectedAdmin(admin)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors',
                      selectedAdmin?._id === admin._id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    )}
                  >
                    <img
                      src={admin.profileImage || getDefaultAvatar(admin.fullName)}
                      alt={admin.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
                      {admin.fullName}
                    </span>
                    {selectedAdmin?._id === admin._id && (
                      <IconCheck className="h-5 w-5 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={!selectedAdmin || transferring}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {transferring && <IconLoader2 className="h-4 w-4 animate-spin mr-2" />}
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <IconAlertTriangle className="h-5 w-5" />
              Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <strong>cannot be undone</strong>. This will permanently delete
                the group <strong>{group.name}</strong> and all of its content including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>All posts and comments</li>
                <li>All member data and memberships</li>
                <li>All invitations and pending requests</li>
              </ul>
              <p className="pt-2">
                Please type <strong>{confirmationText}</strong> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={confirmationText}
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={deleteConfirmText !== confirmationText || deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleting && <IconLoader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GroupDangerZone;
