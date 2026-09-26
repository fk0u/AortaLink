import React from 'react';
import { DesktopHeader } from './DesktopHeader';
import { MobileTopAppBar } from './MobileTopAppBar';

interface HeaderProps {
  onOpenSOS?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSOS }) => {
  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-40">
        <MobileTopAppBar onOpenSOS={onOpenSOS} />
      </div>

      {/* Desktop Header */}
      <DesktopHeader onOpenSOS={onOpenSOS} />
    </>
  );
};
