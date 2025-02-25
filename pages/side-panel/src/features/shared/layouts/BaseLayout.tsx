import type { ReactNode } from 'react';
import { Nav } from '../components/Nav';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { SwitchTheme } from '../components/SwitchTheme';

type Props = {
  children: ReactNode;
} & Record<string, unknown>;

const BaseLayout = ({ children }: Props) => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <div className={`App min-h-screen py-16 ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <SwitchTheme />
      <div className={`${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{children}</div>
      <Nav />
    </div>
  );
};

export default BaseLayout;
