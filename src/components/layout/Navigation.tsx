import React from 'react';
import { M3BottomNavigation, NavTab } from './M3BottomNavigation';

export { type NavTab } from './M3BottomNavigation';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return <M3BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />;
};
