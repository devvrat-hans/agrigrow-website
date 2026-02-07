'use client';

/**
 * FeedSearchBar Component
 *
 * Inline search bar for the home feed. Shows a dropdown with user and post
 * results as the user types. Clicking a result navigates to the relevant page.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconLoader2, IconUser, IconNote, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/** Shape of a user search result */
interface UserResult {
  _id: string;
  fullName: string;
  phone: string;
  role: string;
  profileImage: string | null;
  bio: string;
}

/** Shape of a post search result */
interface PostResult {
  _id: string;
  content: string;
  postType: string;
  tags: string[];
  createdAt: string;
  author: {
    fullName: string;
    profileImage: string | null;
  } | null;
}

interface FeedSearchBarProps {
  /** Additional class names */
  className?: string;
}

export function FeedSearchBar({ className }: FeedSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fetch search results from API
   */
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setUsers([]);
      setPosts([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const phone = localStorage.getItem('userPhone');
      if (!phone) return;

      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'x-user-phone': phone } }
      );
      const data = await res.json();

      if (data.success) {
        setUsers(data.users || []);
        setPosts(data.posts || []);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 2) {
        setUsers([]);
        setPosts([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchResults(value.trim());
      }, 300);
    },
    [fetchResults]
  );

  /**
   * Navigate to a user profile
   */
  const handleUserClick = useCallback(
    (user: UserResult) => {
      setIsOpen(false);
      setQuery('');
      router.push(`/profile/${user._id}`);
    },
    [router]
  );

  /**
   * Navigate to a post detail
   */
  const handlePostClick = useCallback(
    (post: PostResult) => {
      setIsOpen(false);
      setQuery('');
      router.push(`/post/${post._id}`);
    },
    [router]
  );

  /**
   * Clear the search input
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setUsers([]);
    setPosts([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, []);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasResults = users.length > 0 || posts.length > 0;
  const noResults = !isLoading && query.length >= 2 && !hasResults;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (hasResults) setIsOpen(true);
          }}
          placeholder="Search users, posts..."
          className={cn(
            'w-full h-10 pl-9 pr-9 rounded-full text-sm',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'border border-transparent',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
            'transition-all duration-200'
          )}
        />
        {/* Loading / Clear button */}
        {isLoading ? (
          <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        ) : query.length > 0 ? (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Clear search"
          >
            <IconX className="w-3.5 h-3.5 text-gray-400" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-50',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-xl shadow-lg',
            'max-h-[60vh] overflow-y-auto',
            'animate-in fade-in zoom-in-95 duration-150'
          )}
        >
          {/* Users Section */}
          {users.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                People
              </p>
              {users.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserClick(user)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-colors text-left'
                  )}
                >
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.fullName}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <IconUser className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {users.length > 0 && posts.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800" />
          )}

          {/* Posts Section */}
          {posts.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Posts
              </p>
              {posts.map((post) => (
                <button
                  key={post._id}
                  onClick={() => handlePostClick(post)}
                  className={cn(
                    'w-full flex items-start gap-3 px-2 py-2.5 rounded-lg',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-colors text-left'
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <IconNote className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {post.content}
                    </p>
                    {post.author && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        by {post.author.fullName}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {noResults && (
            <div className="px-4 py-6 text-center">
              <IconSearch className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No results found for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedSearchBar;
