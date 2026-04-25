import React from 'react';

import { OnboardingView } from './src/OnboardingComponents';
import { useOnboarding } from './src/useOnboarding';

export default function App() {
  const controller = useOnboarding();

  return <OnboardingView controller={controller} />;
}
