import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@src/index.css';
import { RouterProvider } from '@extension/router';
import { router } from '@src/features/router';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

init();
