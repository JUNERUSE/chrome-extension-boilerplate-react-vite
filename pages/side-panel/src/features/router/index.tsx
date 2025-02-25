import { createHashHistory, createRootRoute, createRoute, createRouter } from '@extension/router';
import { Home } from '@src/views/home/Home';
import { Settings } from '@src/views/settings/Settings';
import { SidePanel } from '@src/features/side-panel';

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
