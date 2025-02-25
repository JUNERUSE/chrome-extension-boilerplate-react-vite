import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ToggleButton } from '@extension/ui';
import { IconMoon, IconSun } from '@tabler/icons-react';
import type { FC } from 'react';
import { memo } from 'react';

const SwitchTheme: FC = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <ToggleButton
      title={t('toggleTheme')}
      className={cn(
        'hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700  border-zinc-200 dark:border-zinc-700',
      )}>
      {isLight ? <IconSun size={16} /> : <IconMoon size={16} />}
    </ToggleButton>
  );
};

export default memo(SwitchTheme);
