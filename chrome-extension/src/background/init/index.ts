import { initBackgroundService } from './service';
import { initTheme } from './theme';

export const initBackground = () => {
  initBackgroundService();
  initTheme();
};
