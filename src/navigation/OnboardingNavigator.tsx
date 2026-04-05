import { createNativeStackNavigator } from '@react-navigation/native-stack'

import {
  GoalSetupScreen,
  OnboardingReviewScreen,
  RiskAppsSetupScreen,
  SupportSetupScreen,
  TriggerSetupScreen,
} from '../features/onboarding/screens'
import type { OnboardingStackParamList } from './types'

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GoalSetup" component={GoalSetupScreen} />
      <Stack.Screen name="TriggerSetup" component={TriggerSetupScreen} />
      <Stack.Screen name="RiskAppsSetup" component={RiskAppsSetupScreen} />
      <Stack.Screen name="SupportSetup" component={SupportSetupScreen} />
      <Stack.Screen name="OnboardingReview" component={OnboardingReviewScreen} />
    </Stack.Navigator>
  )
}
