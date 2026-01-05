import type { Metadata } from 'next';
import './globals.css';
import { FolderProvider } from './context/FolderContext';

export const metadata: Metadata = {
  title: "Repose",
  description: "A serene, local-first journaling space.",
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