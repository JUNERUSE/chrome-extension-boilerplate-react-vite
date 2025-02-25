import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
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
    <div className={`App min-h-screen py-16 ${isLight ? 'bg-white' : 'bg-black'}`}>
      <SwitchTheme />
      <div className={`${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{children}</div>
      <Nav />
    </div>
  );
};

export default BaseLayout;
