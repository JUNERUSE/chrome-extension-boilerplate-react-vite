import { createHashHistory, createRootRoute, createRoute, createRouter } from '@extension/router';
import { SidePanel } from '@src/features/side-panel';
import { Audio } from '@src/views/audio/Audio';
import { Home } from '@src/views/home/Home';
import { Video } from '@src/views/video/Video';

// 创建根路由
const rootRoute = createRootRoute({
  component: SidePanel,
});

// 路由配置
const routeConfig = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/audio',
    component: Audio,
  },
  {
    path: '/video',
    component: Video,
  },
];

// 创建子路由
const routes = routeConfig.map(config =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: config.path,
    component: config.component,
  }),
);

// 添加子路由到根路由
const routeTree = rootRoute.addChildren(routes);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});
