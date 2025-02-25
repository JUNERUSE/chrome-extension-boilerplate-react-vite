import '@src/index.css';

import { RouterProvider } from '@extension/router';
import { router } from '@src/features/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Providers } from './features/provider';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}

init();
