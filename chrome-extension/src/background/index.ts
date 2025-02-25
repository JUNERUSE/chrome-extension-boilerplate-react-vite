import 'webextension-polyfill';

import { OPEN_SIDE_PANEL_CONTEXT_MENU_ID } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: OPEN_SIDE_PANEL_CONTEXT_MENU_ID,
    title: 'Open side panel',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === OPEN_SIDE_PANEL_CONTEXT_MENU_ID && tab) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// chrome.action.onClicked.addListener(async tab => {
//   await chrome.sidePanel.open({ windowId: tab.windowId });
// });

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
