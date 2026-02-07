/**
 * Groups Components Barrel Export
 * 
 * Main export file for all group/community components.
 * Re-exports all components from subdirectories for clean imports.
 * 
 * Usage:
 * import { GroupCard, GroupHeader, GroupPostCard } from '@/components/groups';
 */

// Common components - avatars, badges, cards
export * from './common';

// Discovery components - search, grids, recommendations
export * from './discovery';

// Detail page components - header, tabs, about, rules
export * from './detail';

// Post components - composer, cards, comments
export * from './posts';

// Member components - cards, lists, modals
export * from './members';

// Settings components - forms, editors
export * from './settings';

// Create group components - wizard form
export * from './create';

// Moderation components - queues, actions
export * from './moderation';
