import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

export function Settings() {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <div className={`flex-1 p-4`}>
      <div className="max-w-lg mx-auto">
        <h1 className={`text-2xl font-bold mb-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>设置</h1>
        <div className={`rounded-lg p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
          <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>这里是设置页面</p>
        </div>
      </div>
    </div>
  );
}
