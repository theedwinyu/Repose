import type { Metadata } from 'next';
import './globals.css';
import { FolderProvider } from './context/FolderContext';

export const metadata: Metadata = {
  title: 'My Journal',
  description: 'Your personal space for thoughts and reflections',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-900 min-h-screen">
        <FolderProvider>{children}</FolderProvider>
      </body>
    </html>
  );
}