import { Link } from '@extension/router';
import { cn } from '@extension/ui';
import { IconMusic, IconTypography, IconVideo } from '@tabler/icons-react';
import type { FC } from 'react';
import { memo } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem = ({ to, icon, label }: NavItemProps) => {
  const baseStyles = cn(
    'flex items-center gap-2 px-4 py-2 rounded-full',
    'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
  );

  const activeStyles = cn(
    'text-black bg-zinc-200 hover:bg-zinc-200 font-medium dark:text-white dark:bg-zinc-700 dark:hover:bg-zinc-700',
  );

  return (
    <Link to={to} className={baseStyles} activeProps={{ className: activeStyles }}>
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
};

const Nav: FC = () => {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t backdrop-blur-sm p-2',
        'bg-white/90 border-zinc-200 dark:bg-zinc-900/90 dark:border-zinc-800',
      )}>
      <div className="flex gap-2 items-center justify-center max-w-lg mx-auto">
        <NavItem to="/" icon={<IconTypography size={18} />} label="文字" />
        <NavItem to="/audio" icon={<IconMusic size={18} />} label="音频" />
        <NavItem to="/video" icon={<IconVideo size={18} />} label="视频" />
      </div>
    </nav>
  );
};

export default memo(Nav);
