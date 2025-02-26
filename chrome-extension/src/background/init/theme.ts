import { exampleThemeStorage } from '@extension/storage';

export const initTheme = () => {
  exampleThemeStorage.get().then(theme => {
    console.log('theme', theme);
  });
};
