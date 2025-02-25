import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import Header from '@src/features/shared/components/header';
import Nav from '@src/features/shared/components/nav';
import type { FC, PropsWithChildren } from 'react';

const BaseLayout: FC<PropsWithChildren> = ({ children }) => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <main className={cn('min-h-screen', isLight ? 'light bg-zinc-50' : 'dark bg-zinc-900')}>
      <Header />
      {children}
      <Nav />
    </main>
  );
};

export default BaseLayout;
