import type { Metadata } from 'next';
import './globals.css';
import { FolderProvider } from './context/FolderContext';

export const metadata: Metadata = {
  title: 'Repose - Your Serene Journaling Space',
  description: 'A peaceful, private journaling app that keeps your thoughts safe on your device.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-cream min-h-screen" suppressHydrationWarning>
        <FolderProvider>{children}</FolderProvider>
      </body>
    </html>
  );
}