// src/lib/saved-views/saved-views-service.ts
// Saved Views Service - Manage saved filters and views per entity

import { prisma } from '@/lib/prisma';

export interface SavedViewFilters {
  [key: string]: unknown;
}

export interface SavedViewSort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface SavedViewColumns {
  visible: string[];
  order?: string[];
  widths?: Record<string, number>;
}

export interface CreateSavedViewInput {
  name: string;
  entityType: string;
  filters?: SavedViewFilters;
  sort?: SavedViewSort;
  columns?: SavedViewColumns;
  isDefault?: boolean;
  isShared?: boolean;
  userId: string;
}

export interface UpdateSavedViewInput {
  name?: string;
  filters?: SavedViewFilters;
  sort?: SavedViewSort;
  columns?: SavedViewColumns;
  isDefault?: boolean;
  isShared?: boolean;
}

/**
 * Get all saved views for an entity type
 */
export async function getSavedViews(entityType: string, userId: string) {
  return prisma.savedView.findMany({
    where: {
      entity: entityType,
      OR: [
        { createdBy: userId },
        { isShared: true },
      ],
    },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  });
}

/**
 * Get a single saved view by ID
 */
export async function getSavedView(id: string, userId: string) {
  const view = await prisma.savedView.findUnique({
    where: { id },
  });

  // Check access
  if (view && view.createdBy !== userId && !view.isShared) {
    return null;
  }

  return view;
}

/**
 * Get the default view for an entity type
 */
export async function getDefaultView(entityType: string, userId: string) {
  // First try user's default
  const userDefault = await prisma.savedView.findFirst({
    where: {
      entity: entityType,
      createdBy: userId,
      isDefault: true,
    },
  });

  if (userDefault) return userDefault;

  // Then try shared default
  return prisma.savedView.findFirst({
    where: {
      entity: entityType,
      isShared: true,
      isDefault: true,
    },
  });
}

/**
 * Create a new saved view
 */
export async function createSavedView(input: CreateSavedViewInput) {
  const { userId, entityType, isDefault, ...data } = input;

  // If this is set as default, unset other defaults
  if (isDefault) {
    await prisma.savedView.updateMany({
      where: {
        createdBy: userId,
        entity: entityType,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  return prisma.savedView.create({
    data: {
      name: data.name,
      entity: entityType,
      isDefault: isDefault || false,
      isShared: data.isShared || false,
      filters: (data.filters ?? {}) as object,
      columns: data.columns as object,
      sortBy: data.sort?.column,
      sortOrder: data.sort?.direction?.toUpperCase(),
      user: { connect: { id: userId } },
    },
  });
}

/**
 * Update a saved view
 */
export async function updateSavedView(
  id: string,
  input: UpdateSavedViewInput,
  userId: string
) {
  // Check ownership
  const existing = await prisma.savedView.findUnique({
    where: { id },
  });

  if (!existing || existing.createdBy !== userId) {
    throw new Error('View not found or access denied');
  }

  // If setting as default, unset others
  if (input.isDefault) {
    await prisma.savedView.updateMany({
      where: {
        createdBy: userId,
        entity: existing.entity,
        isDefault: true,
        id: { not: id },
      },
      data: { isDefault: false },
    });
  }

  return prisma.savedView.update({
    where: { id },
    data: {
      name: input.name,
      isDefault: input.isDefault,
      isShared: input.isShared,
      filters: input.filters as object,
      columns: input.columns as object,
      sortBy: input.sort?.column,
      sortOrder: input.sort?.direction?.toUpperCase(),
    },
  });
}

/**
 * Delete a saved view
 */
export async function deleteSavedView(id: string, userId: string) {
  // Check ownership
  const existing = await prisma.savedView.findUnique({
    where: { id },
  });

  if (!existing || existing.createdBy !== userId) {
    throw new Error('View not found or access denied');
  }

  return prisma.savedView.delete({ where: { id } });
}

/**
 * Duplicate a saved view
 */
export async function duplicateSavedView(id: string, userId: string, newName: string) {
  const original = await prisma.savedView.findUnique({
    where: { id },
  });

  if (!original) {
    throw new Error('View not found');
  }

  // Check access for shared views
  if (original.createdBy !== userId && !original.isShared) {
    throw new Error('Access denied');
  }

  return prisma.savedView.create({
    data: {
      name: newName,
      entity: original.entity,
      filters: original.filters as object,
      columns: original.columns as object,
      sortBy: original.sortBy,
      sortOrder: original.sortOrder,
      isDefault: false,
      isShared: false,
      user: { connect: { id: userId } },
    },
  });
}

export default {
  getSavedViews,
  getSavedView,
  getDefaultView,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  duplicateSavedView,
};
