import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import type { FC, PropsWithChildren } from 'react';

import Nav from '../../features/shared/components/nav';
import SwitchTheme from '../../features/shared/components/switch-theme';

const BaseLayout: FC<PropsWithChildren> = ({ children }) => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <main className={cn('min-h-screen py-16', isLight ? 'light bg-zinc-50' : 'dark bg-zinc-900')}>
      <SwitchTheme />
      {children}
      <Nav />
    </main>
  );
};

export default BaseLayout;
