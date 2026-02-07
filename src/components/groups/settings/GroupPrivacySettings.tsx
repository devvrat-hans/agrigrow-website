'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GroupData, GroupPrivacy, GroupSettings } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  IconWorld,
  IconLock,
  IconUserPlus,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface GroupPrivacySettingsProps {
  /** Group data */
  group: GroupData;
  /** Callback when settings are saved */
  onSave?: (updatedGroup: GroupData) => void;
  /** Callback when there's an error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface IconProps {
  className?: string;
}

interface PrivacyOption {
  value: GroupPrivacy;
  label: string;
  description: string;
  icon: React.ComponentType<IconProps>;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can find, view, and join this group',
    icon: IconWorld,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Anyone can find this group, but must request to join',
    icon: IconLock,
  },
  {
    value: 'invite-only',
    label: 'Invite Only',
    description: 'Only invited users can find and join this group',
    icon: IconUserPlus,
  },
];

/**
 * GroupPrivacySettings Component
 * 
 * Privacy settings for a group including:
 * - Privacy level (public, private, invite-only)
 * - Member posting permissions
 * - Post approval requirements
 * 
 * @example
 * <GroupPrivacySettings
 *   group={groupData}
 *   onSave={(updated) => handleUpdate(updated)}
 * />
 */
export function GroupPrivacySettings({
  group,
  onSave,
  onError,
  className,
}: GroupPrivacySettingsProps) {
  // State
  const [privacy, setPrivacy] = useState<GroupPrivacy>(group.privacy);
  const [settings, setSettings] = useState<GroupSettings>(group.settings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track if there are unsaved changes
  const hasChanges =
    privacy !== group.privacy ||
    settings.allowMemberPosts !== group.settings.allowMemberPosts ||
    settings.requirePostApproval !== group.settings.requirePostApproval ||
    settings.allowPolls !== group.settings.allowPolls ||
    settings.allowImages !== group.settings.allowImages;

  /**
   * Update a setting
   */
  const updateSetting = (key: keyof GroupSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Save settings
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      // Update group privacy
      const groupResponse = await apiClient.put<{ success: boolean; data: GroupData }>(
        `/api/groups/${group._id}`,
        { privacy }
      );

      // Update group settings
      const settingsResponse = await apiClient.put<{ success: boolean; data: GroupSettings }>(
        `/api/groups/${group._id}/settings`,
        settings
      );

      if (groupResponse.data.success && settingsResponse.data.success) {
        setSaveSuccess(true);
        onSave?.({
          ...group,
          privacy,
          settings,
        });

        // Clear success message after delay
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: unknown) {
      console.error('Error saving privacy settings:', err);
      onError?.(
        err instanceof Error
          ? err.message
          : 'Failed to save settings. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Privacy Level */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Group Privacy
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Control who can find and join your group
          </p>
        </div>

        <div className="space-y-3">
          {PRIVACY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = privacy === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <input
                  type="radio"
                  name="privacy"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setPrivacy(option.value)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span
                    className={cn(
                      'font-medium',
                      isSelected
                        ? 'text-primary-700 dark:text-primary-400'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {option.label}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <IconCheck className="h-5 w-5 text-primary-500 shrink-0" />
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Posting Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Posting Settings
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Control what members can do in the group
          </p>
        </div>

        <div className="space-y-4">
          {/* Allow Member Posts */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow Member Posts
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Let members create posts in this group
              </p>
            </div>
            <Switch
              checked={settings.allowMemberPosts}
              onCheckedChange={(checked) => updateSetting('allowMemberPosts', checked)}
            />
          </div>

          {/* Require Post Approval */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Require Post Approval
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Posts need admin/moderator approval before publishing
              </p>
            </div>
            <Switch
              checked={settings.requirePostApproval}
              onCheckedChange={(checked) => updateSetting('requirePostApproval', checked)}
            />
          </div>

          {/* Allow Polls */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow Polls
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Members can create polls in their posts
              </p>
            </div>
            <Switch
              checked={settings.allowPolls}
              onCheckedChange={(checked) => updateSetting('allowPolls', checked)}
            />
          </div>

          {/* Allow Images */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow Images
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Members can upload images to their posts
              </p>
            </div>
            <Switch
              checked={settings.allowImages}
              onCheckedChange={(checked) => updateSetting('allowImages', checked)}
            />
          </div>
        </div>
      </div>

      {/* Warning for Sensitive Changes */}
      {privacy !== group.privacy && group.privacy === 'public' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <IconAlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Privacy Change Warning</p>
            <p className="mt-1">
              Changing from public to {privacy === 'private' ? 'private' : 'invite-only'} will
              restrict new members from joining freely.
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {saveSuccess && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <IconCheck className="h-4 w-4" />
            Settings saved successfully!
          </span>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <IconLoader2 className="h-4 w-4 animate-spin mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GroupPrivacySettings;
