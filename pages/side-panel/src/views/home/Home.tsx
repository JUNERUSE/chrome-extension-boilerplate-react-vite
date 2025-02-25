import { Link } from '@extension/router';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';

export function Home() {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'side-panel/logo_vertical.svg' : 'side-panel/logo_vertical_dark.svg';
  const goGithubSite = () =>
    chrome.tabs.create({ url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite' });

  return (
    <div className={`App`}>
      <header className={`App-header ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/side-panel/src/pages/Home.tsx</code>
        </p>
        <Link to="/settings" className={`mt-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
          前往设置
        </Link>
      </header>
    </div>
  );
}
