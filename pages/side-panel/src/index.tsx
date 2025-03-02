import '@src/index.css';

import { RouterProvider } from '@extension/router';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './features/app/components/provider';
import { router } from './features/router';

// 主题监听器组件
function ThemeObserver() {
  // 使用useStorage钩子直接监听主题变化
  const theme = useStorage(exampleThemeStorage);

  useEffect(() => {
    // 根据当前主题设置HTML标签上的dark类
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]); // 当theme变化时执行

  return null;
}

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <StrictMode>
      <AppProviders>
        <ThemeObserver />
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

init();
