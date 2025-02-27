import { HeroUIProvider } from '@heroui/system';
import type { FC, PropsWithChildren } from 'react';

export const AppProviders: FC<PropsWithChildren> = ({ children }) => {
  return <HeroUIProvider>{children}</HeroUIProvider>;
};
