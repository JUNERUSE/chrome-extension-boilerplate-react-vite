import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import AppHeader from '@src/features/app/components/header';
import AppNav from '@src/features/app/components/nav';
import type { FC, PropsWithChildren } from 'react';

const BaseLayout: FC<PropsWithChildren> = ({ children }) => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <main
      className={cn(
        'min-h-screen text-foreground bg-background text-sm',
        isLight ? 'light bg-zinc-50' : 'dark bg-zinc-900',
      )}>
      <AppHeader />
      {children}
      <AppNav />
    </main>
  );
};

export default BaseLayout;
