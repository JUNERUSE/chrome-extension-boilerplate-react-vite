import '@src/index.css';

import { RouterProvider } from '@extension/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './features/app/components/provider';
import { router } from './features/router';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  );
}

init();
