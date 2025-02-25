import '@src/index.css';

import { RouterProvider } from '@extension/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Providers } from './features/provider';
import { router } from './features/router';

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
