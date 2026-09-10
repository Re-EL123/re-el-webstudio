import { createRoot } from 'react-dom/client';
import { Provider, getDefaultStore, useAtomValue } from 'jotai';
import ProjectLoader from './ProjectLoader';
import SplashScreen from './dashboard/SplashScreen';
import AuthScreen from './dashboard/AuthScreen';
import Dashboard from './dashboard/Dashboard';
import { appViewAtom } from './code/stores/app-view-store';
import './styles/globals.css';
import { subscribeBuilderTheme } from './editor/builder-theme';

// Restore the saved builder accent BEFORE the first paint (so a non-default
// theme doesn't flash the stock brass on reload) and keep it in sync with both
// the atom and the light/dark switch thereafter.
subscribeBuilderTheme();

// Top-level view switch. The app starts on the splash screen, flows to auth
// (or straight to the dashboard for a signed-in/guest user), where "New
// Project" / "Open" flips the atom to `builder` and mounts the real editor.
// ProjectLoader is only mounted in the builder view, so the backend project
// init never races the splash/auth/dashboard screens.
function AppRoot() {
  const appView = useAtomValue(appViewAtom);
  switch (appView) {
    case 'auth':
      return <AuthScreen />;
    case 'dashboard':
      return <Dashboard />;
    case 'builder':
      return <ProjectLoader />;
    case 'splash':
    default:
      return <SplashScreen />;
  }
}

// Bind <Provider> to the global default store so non-React code paths
// (e.g. the dev-only `__e2e` hook in ProjectLoader, mutation queue
// callbacks) can read/write the same atoms React subscribes to. Without
// `store=`, <Provider> creates a fresh scoped store and any
// `getDefaultStore()` call lands on a different instance — atom writes
// from one path become invisible to readers on the other.
createRoot(document.getElementById('root')!).render(
  <Provider store={getDefaultStore()}>
    <AppRoot />
  </Provider>
);