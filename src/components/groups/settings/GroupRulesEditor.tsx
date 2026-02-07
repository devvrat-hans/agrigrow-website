'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GroupData, GroupRule } from '@/types/group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  IconGripVertical,
  IconPlus,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import apiClient from '@/lib/api-client';

interface GroupRulesEditorProps {
  /** Group data */
  group: GroupData;
  /** Callback when rules are saved */
  onSave?: (updatedGroup: GroupData) => void;
  /** Callback when there's an error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

interface RuleFormData {
  title: string;
  description: string;
}

const MAX_RULES = 15;

/**
 * GroupRulesEditor Component
 * 
 * List of rules with add, edit, delete, and reorder (drag and drop).
 * Each rule has title and description inputs.
 * 
 * @example
 * <GroupRulesEditor
 *   group={groupData}
 *   onSave={(updated) => handleUpdate(updated)}
 * />
 */
export function GroupRulesEditor({
  group,
  onSave,
  onError,
  className,
}: GroupRulesEditorProps) {
  // State
  const [rules, setRules] = useState<GroupRule[]>(group.rules || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<RuleFormData>({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{ title?: string; description?: string }>({});

  // Track if there are unsaved changes
  const hasChanges = JSON.stringify(rules) !== JSON.stringify(group.rules || []);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const errors: { title?: string; description?: string } = {};

    if (!formData.title.trim()) {
      errors.title = 'Rule title is required';
    } else if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Start adding a new rule
   */
  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setFormData({ title: '', description: '' });
    setFormErrors({});
  };

  /**
   * Start editing a rule
   */
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setIsAdding(false);
    setFormData({
      title: rules[index].title,
      description: rules[index].description,
    });
    setFormErrors({});
  };

  /**
   * Cancel add/edit
   */
  const handleCancel = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setFormData({ title: '', description: '' });
    setFormErrors({});
  };

  /**
   * Save new rule
   */
  const handleAddRule = () => {
    if (!validateForm()) return;

    const newRule: GroupRule = {
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    setRules((prev) => [...prev, newRule]);
    handleCancel();
  };

  /**
   * Save edited rule
   */
  const handleSaveEdit = () => {
    if (editingIndex === null || !validateForm()) return;

    const updatedRules = [...rules];
    updatedRules[editingIndex] = {
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    setRules(updatedRules);
    handleCancel();
  };

  /**
   * Delete a rule
   */
  const handleDeleteRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      handleCancel();
    }
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newRules = [...rules];
    const [draggedRule] = newRules.splice(draggedIndex, 1);
    newRules.splice(dragOverIndex, 0, draggedRule);

    setRules(newRules);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragEnd();
  };

  /**
   * Save rules to server
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const response = await apiClient.put<{ success: boolean; data: GroupData }>(
        `/api/groups/${group._id}`,
        { rules }
      );

      if (response.data.success) {
        setSaveSuccess(true);
        onSave?.({
          ...group,
          rules,
        });

        // Clear success message after delay
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: unknown) {
      console.error('Error saving rules:', err);
      onError?.(
        err instanceof Error
          ? err.message
          : 'Failed to save rules. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Render rule form (add or edit)
   */
  const renderRuleForm = () => (
    <div className="p-4 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50 dark:bg-primary-900/20 space-y-3">
      <div className="space-y-1">
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Rule title (e.g., Be Respectful)"
          maxLength={100}
          className={formErrors.title ? 'border-red-500' : ''}
        />
        {formErrors.title && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-3 w-3" />
            {formErrors.title}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Rule description (optional)"
          maxLength={500}
          rows={2}
          className={cn('resize-none', formErrors.description ? 'border-red-500' : '')}
        />
        {formErrors.description && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <IconAlertCircle className="h-3 w-3" />
            {formErrors.description}
          </p>
        )}
        <p className="text-xs text-gray-400 text-right">
          {formData.description.length}/500
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={isAdding ? handleAddRule : handleSaveEdit}
        >
          {isAdding ? 'Add Rule' : 'Save'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Group Rules
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {rules.length} of {MAX_RULES} rules
          </p>
        </div>
        {!isAdding && editingIndex === null && rules.length < MAX_RULES && (
          <Button variant="outline" size="sm" onClick={handleStartAdd}>
            <IconPlus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        )}
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {rules.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No rules defined yet</p>
            <p className="text-xs mt-1">Rules help maintain a healthy community</p>
          </div>
        ) : (
          rules.map((rule, index) => (
            <div
              key={`${rule.title}-${index}`}
              draggable={editingIndex === null && !isAdding}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              className={cn(
                'group flex gap-2 p-3 rounded-lg border transition-all',
                editingIndex === index
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                draggedIndex === index && 'opacity-50',
                dragOverIndex === index && 'border-primary-400 dark:border-primary-600'
              )}
            >
              {/* Drag Handle */}
              {editingIndex === null && !isAdding && (
                <div
                  className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 pt-0.5"
                  title="Drag to reorder"
                >
                  <IconGripVertical className="h-5 w-5" />
                </div>
              )}

              {/* Rule Number */}
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {index + 1}
                </span>
              </div>

              {/* Rule Content or Edit Form */}
              {editingIndex === index ? (
                <div className="flex-1">{renderRuleForm()}</div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {rule.title}
                    </h4>
                    {rule.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {rule.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleStartEdit(index)}
                    >
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleDeleteRule(index)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {/* Add Form (when adding new) */}
        {isAdding && (
          <div className="mt-2">{renderRuleForm()}</div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
        <p>• Drag rules to reorder them</p>
        <p>• Clear rules help set expectations for members</p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {saveSuccess && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <IconCheck className="h-4 w-4" />
            Rules saved successfully!
          </span>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <IconLoader2 className="h-4 w-4 animate-spin mr-2" />}
            {saving ? 'Saving...' : 'Save Rules'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GroupRulesEditor;
