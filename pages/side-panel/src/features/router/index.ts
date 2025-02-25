import { createMemoryHistory, createRootRoute, createRoute, createRouter } from '@extension/router';
import { SideSidePanelRoot } from '@src/features/root';

import { SIDE_PANEL_ROUTER_CONFIG } from './constants';

// 创建根路由
const rootRoute = createRootRoute({
  component: SideSidePanelRoot,
});

// 创建子路由
const routes = SIDE_PANEL_ROUTER_CONFIG.map(({ path, component }) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component,
  }),
);

// 添加子路由到根路由
const routeTree = rootRoute.addChildren(routes);

export const router = createRouter({
  routeTree,
  history: createMemoryHistory(),
});
