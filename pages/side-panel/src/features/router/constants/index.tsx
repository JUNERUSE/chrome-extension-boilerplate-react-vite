import Audio from '@src/router/audio';
import Home from '@src/router/home';
import Video from '@src/router/video';
import { IconMusic, IconTypography, IconVideo } from '@tabler/icons-react';

import type { Route } from '../types';

/**
 * 侧边栏路由配置
 */
export const SIDE_PANEL_ROUTER_CONFIG: Route[] = [
  {
    path: '/',
    component: Home,
    icon: <IconTypography size={18} />,
    label: '文字',
  },
  {
    path: '/audio',
    component: Audio,
    icon: <IconMusic size={18} />,
    label: '音频',
  },
  {
    path: '/video',
    component: Video,
    icon: <IconVideo size={18} />,
    label: '视频',
  },
];
