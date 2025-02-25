import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils';

type ToggleButtonProps = ComponentPropsWithoutRef<'button'>;

export const ToggleButton = ({ className, children, ...props }: ToggleButtonProps) => {
  const theme = useStorage(exampleThemeStorage);

  return (
    <button
      className={cn(
        className,
        'py-1 px-4 rounded-full hover:scale-105 border',
        theme === 'light' ? 'bg-white text-black border-zinc-200' : 'bg-black text-white border-zinc-700',
      )}
      onClick={exampleThemeStorage.toggle}
      {...props}>
      {children}
    </button>
  );
};
