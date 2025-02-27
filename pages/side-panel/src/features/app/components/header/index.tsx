import { useRouterState } from '@extension/router';
import type { FC } from 'react';
import { memo } from 'react';

import AppSwitchTheme from '../switch-theme';

const AppHeader: FC = () => {
  const router = useRouterState();

  const stateMap: Record<string, string> = {
    '/': '文字转语音',
    '/video': 'YouTube 字幕',
    '/audio': '音频传译',
  };

  return (
    <div className="flex items-center justify-between py-4 px-6">
      <h2 className="text-lg font-bold">{stateMap[router.location.pathname]}</h2>
      <AppSwitchTheme />
    </div>
  );
};

export default memo(AppHeader);
