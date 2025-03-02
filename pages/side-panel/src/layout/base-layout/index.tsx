import { cn } from '@extension/ui';
import AppHeader from '@src/features/app/components/header';
import AppNav from '@src/features/app/components/nav';
import type { FC, PropsWithChildren } from 'react';

const BaseLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <main className={cn('min-h-screen text-foreground bg-background text-sm pb-16')}>
      <AppHeader />
      {children}
      <AppNav />
    </main>
  );
};

export default BaseLayout;
