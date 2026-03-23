import { createContext, useContext } from 'react';

export type PostingViewMode = 'cards' | 'list';

export type PostingViewModeContextValue = {
  viewMode: PostingViewMode;
  setViewMode: (mode: PostingViewMode) => void;
};

export const postingViewModeStorageKey = 'posting-view-mode';

export const PostingViewModeContext = createContext<PostingViewModeContextValue | undefined>(undefined);

export function usePostingViewMode() {
  const context = useContext(PostingViewModeContext);
  if (!context) {
    throw new Error('usePostingViewMode must be used within PostingViewModeProvider');
  }
  return context;
}
