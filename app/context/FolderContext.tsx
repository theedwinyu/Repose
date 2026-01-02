'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserConfig, JournalEntry } from '@/app/types';
import { getStoredFolderHandle, readConfig, listEntries } from '@/app/lib/fileSystem';

interface FolderContextType {
  folderHandle: FileSystemDirectoryHandle | null;
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
  userConfig: UserConfig | null;
  setUserConfig: (config: UserConfig | null) => void;
  entries: Map<string, JournalEntry>;
  setEntries: (entries: Map<string, JournalEntry>) => void;
  refreshEntries: () => void;
  entriesVersion: number;
  isLoading: boolean;
}

const FolderContext = createContext<FolderContextType | undefined>(undefined);

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [entries, setEntries] = useState<Map<string, JournalEntry>>(new Map());
  const [entriesVersion, setEntriesVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEntries = () => {
    setEntriesVersion((prev) => prev + 1);
  };

  // Load folder handle and config on mount
  useEffect(() => {
    async function loadFolder() {
      setIsLoading(true);
      const handle = await getStoredFolderHandle();
      if (handle) {
        setFolderHandle(handle);
        const config = await readConfig(handle);
        setUserConfig(config);
        const entriesMap = await listEntries(handle);
        setEntries(entriesMap);
      }
      setIsLoading(false);
    }
    loadFolder();
  }, []);

  // Reload entries when version changes
  useEffect(() => {
    async function reloadEntries() {
      if (folderHandle) {
        const entriesMap = await listEntries(folderHandle);
        setEntries(entriesMap);
      }
    }
    if (entriesVersion > 0) {
      reloadEntries();
    }
  }, [entriesVersion, folderHandle]);

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
        isLoading,
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