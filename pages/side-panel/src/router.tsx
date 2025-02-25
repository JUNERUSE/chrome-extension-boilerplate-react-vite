import { createHashHistory, createRootRoute, createRoute, createRouter } from '@extension/router';

import SidePanel from './SidePanel';
import { Home } from './features/home/Home';
import { Settings } from './features/settings/Settings';

const rootRoute = createRootRoute({
  component: SidePanel,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});
