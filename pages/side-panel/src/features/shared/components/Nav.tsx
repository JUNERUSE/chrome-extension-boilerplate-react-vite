import { Link } from '@extension/router';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isLight: boolean;
}

const NavItem = ({ to, icon, label, isLight }: NavItemProps) => {
  const baseStyles = cn(
    'flex items-center gap-2 px-4 py-2 rounded-full',
    isLight ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-800',
  );

  const activeStyles = cn(
    'flex items-center gap-2 px-4 py-2 rounded-full',
    isLight ? 'text-blue-600 bg-blue-50 font-medium' : 'text-blue-400 bg-blue-900/30 font-medium',
  );

  return (
    <Link to={to} className={baseStyles} activeProps={{ className: activeStyles }}>
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
};

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function Nav() {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t backdrop-blur-sm p-2',
        isLight ? 'bg-white/90 border-gray-200' : 'bg-gray-900/90 border-gray-800',
      )}>
      <div className="flex gap-2 items-center justify-center max-w-lg mx-auto">
        <NavItem to="/" icon={<HomeIcon />} label="首页" isLight={isLight} />
        <NavItem to="/settings" icon={<SettingsIcon />} label="设置" isLight={isLight} />
      </div>
    </nav>
  );
}
