import { KidApp } from './kid/KidApp';
import { ParentApp } from './parent/ParentApp';
import { Welcome } from './parent/Welcome';
import { SproutProvider, useRoute, useSprout } from './state';

// Routing shell. Kid space and parent space are separate experiences:
//  #/kid       the child's screen (default once setup is done)
//  #/parent/*  grown-ups only (behind a parent gate)
//  #/welcome   first-run onboarding for the parent

function Shell() {
  const { profile, isDemo } = useSprout();
  const [route] = useRoute();
  const needsSetup = !profile.childName;
  const area = needsSetup && !route.startsWith('parent') ? 'welcome' : route.split('/')[0] || 'kid';

  return (
    <>
      {isDemo && (
        <aside className="demo-ribbon" aria-label="Demo mode">
          <span aria-hidden="true">🧪</span> Demo: simulated AI, real safety checks
        </aside>
      )}
      {area === 'welcome' && <Welcome />}
      {area === 'kid' && <KidApp />}
      {area === 'parent' && <ParentApp />}
    </>
  );
}

export function App() {
  return (
    <SproutProvider>
      <Shell />
    </SproutProvider>
  );
}
