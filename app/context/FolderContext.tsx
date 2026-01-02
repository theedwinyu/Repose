'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserConfig, JournalEntry } from '@/app/types';

interface FolderContextType {
  folderHandle: FileSystemDirectoryHandle | null;
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
  userConfig: UserConfig | null;
  setUserConfig: (config: UserConfig | null) => void;
  entries: Map<string, JournalEntry>;
  setEntries: (entries: Map<string, JournalEntry>) => void;
  refreshEntries: () => void;
  entriesVersion: number;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [entries, setEntries] = useState<Map<string, JournalEntry>>(new Map());
  const [entriesVersion, setEntriesVersion] = useState(0);

  const refreshEntries = () => {
    setEntriesVersion((prev) => prev + 1);
  };

  return (
    <FolderContext.Provider
      value={{
        folderHandle,
        setFolderHandle,
        userConfig,
        setUserConfig,
        entries,
        setEntries,
        refreshEntries,
        entriesVersion,
      }}
    >
      {children}
    </FolderContext.Provider>
  );
}

export function useFolderContext() {
  const context = useContext(FolderContext);
  if (context === undefined) {
    throw new Error('useFolderContext must be used within a FolderProvider');
  }
  return context;
}