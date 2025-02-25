import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import type { ReactNode } from 'react';

import { Nav } from '../shared/components/Nav';
import { SwitchTheme } from '../shared/components/SwitchTheme';

type Props = {
  children: ReactNode;
} & Record<string, unknown>;

const BaseLayout = ({ children }: Props) => {
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
