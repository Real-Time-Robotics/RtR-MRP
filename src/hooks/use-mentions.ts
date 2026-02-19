'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './use-debounce';
import { clientLogger } from '@/lib/client-logger';

interface MentionUser {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface MentionState {
  isActive: boolean;
  searchTerm: string;
  startPosition: number;
  users: MentionUser[];
  selectedIndex: number;
  isLoading: boolean;
}

export function useMentions() {
  const [state, setState] = useState<MentionState>({
    isActive: false,
    searchTerm: '',
    startPosition: 0,
    users: [],
    selectedIndex: 0,
    isLoading: false,
  });

  const debouncedSearch = useDebounce(state.searchTerm, 200);

  // Search users when searchTerm changes
  useEffect(() => {
    if (!state.isActive) {
      return;
    }

    if (!debouncedSearch) {
      setState((prev) => ({ ...prev, users: [], isLoading: false }));
      return;
    }

    const searchUsers = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          setState((prev) => ({
            ...prev,
            users: data.users || [],
            isLoading: false,
            selectedIndex: 0,
          }));
        } else {
          setState((prev) => ({ ...prev, users: [], isLoading: false }));
        }
      } catch (error) {
        clientLogger.error('User search failed', error);
        setState((prev) => ({ ...prev, users: [], isLoading: false }));
      }
    };

    searchUsers();
  }, [debouncedSearch, state.isActive]);

  // Handle input change to detect @ mentions
  const handleInputChange = useCallback((value: string, cursorPosition: number) => {
    // Find @ before cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setState((prev) => ({ ...prev, isActive: false, searchTerm: '' }));
      return;
    }

    // Check if @ is at start or after whitespace
    const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
    if (!/\s/.test(charBeforeAt) && lastAtIndex !== 0) {
      setState((prev) => ({ ...prev, isActive: false, searchTerm: '' }));
      return;
    }

    // Get search term after @
    const searchTerm = textBeforeCursor.slice(lastAtIndex + 1);

    // Check if search term contains space (mention ended)
    if (/\s/.test(searchTerm)) {
      setState((prev) => ({ ...prev, isActive: false, searchTerm: '' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isActive: true,
      searchTerm,
      startPosition: lastAtIndex,
    }));
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): MentionUser | boolean => {
      if (!state.isActive || state.users.length === 0) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, prev.users.length - 1),
          }));
          return true;

        case 'ArrowUp':
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          }));
          return true;

        case 'Enter':
        case 'Tab':
          if (state.users[state.selectedIndex]) {
            e.preventDefault();
            return state.users[state.selectedIndex];
          }
          return false;

        case 'Escape':
          e.preventDefault();
          setState((prev) => ({ ...prev, isActive: false }));
          return true;

        default:
          return false;
      }
    },
    [state.isActive, state.users, state.selectedIndex]
  );

  // Select a user
  const selectUser = useCallback((user: MentionUser) => {
    setState((prev) => ({ ...prev, isActive: false, searchTerm: '' }));
    return user;
  }, []);

  // Close dropdown
  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false, searchTerm: '' }));
  }, []);

  return {
    ...state,
    handleInputChange,
    handleKeyDown,
    selectUser,
    close,
  };
}
