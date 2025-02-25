import { Link, useRouterState } from '@extension/router';
import { cn } from '@extension/ui';
import { Tab, Tabs } from '@heroui/tabs';
import { SIDE_PANEL_ROUTER_CONFIG } from '@src/features/router/constants';
import type { FC } from 'react';
import { memo } from 'react';

const AppNav: FC = () => {
  const router = useRouterState();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t backdrop-blur-sm p-2',
        'bg-white/90 border-zinc-200 dark:bg-zinc-900/90 dark:border-zinc-800',
      )}>
      <Tabs
        selectedKey={router.location.pathname}
        className="flex gap-2 items-center justify-center max-w-lg mx-auto"
        color="primary"
        radius="full">
        {SIDE_PANEL_ROUTER_CONFIG.map(route => (
          <Tab
            key={route.path}
            title={
              <Link to={route.path} className="flex items-center gap-2 px-3 py-2 rounded-full">
                {route.icon}
                {route.label && <span className="text-sm">{route.label}</span>}
              </Link>
            }
          />
        ))}
      </Tabs>
    </nav>
  );
};

export default memo(AppNav);
