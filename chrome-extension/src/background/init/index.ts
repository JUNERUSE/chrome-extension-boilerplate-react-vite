import { initBackgroundMessage } from './message';
import { initTheme } from './theme';
import { initVideoProgressControl } from './video-progress';

export const initBackground = () => {
  initBackgroundMessage();
  initTheme();
  initVideoProgressControl();
};
