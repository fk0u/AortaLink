import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { App } from './App';

// Define the root route rendering our main App layout
const rootRoute = createRootRoute({
  component: () => <App />,
});

// Define subroutes corresponding to each tab
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
});

const remindersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reminders',
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
});

const backupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/backup',
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  historyRoute,
  reportsRoute,
  remindersRoute,
  profileRoute,
  settingsRoute,
  landingRoute,
  backupRoute,
  privacyRoute,
  termsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
