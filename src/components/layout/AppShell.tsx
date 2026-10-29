import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper text-body font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar with role switcher, clock & search */}
        <TopBar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto bg-paper p-4 md:p-6">
          <div className="max-w-[1720px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};
