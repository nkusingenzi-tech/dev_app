import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { NavigationContainer } from '@react-navigation/native'
import { ActivityIndicator, SafeAreaView, Text } from 'react-native'

import { navigationTheme } from '../theme/theme'
import { appStyles } from '../theme/styles'
import { AppTabs } from '../navigation/AppTabs'
import { OnboardingNavigator } from '../navigation/OnboardingNavigator'
import { AppSessionProvider, useAppSession } from './AppSessionContext'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

function AppContent() {
  const { loading, done } = useAppSession()

  if (loading) {
    return (
      <SafeAreaView style={appStyles.loadingScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ff2f6d" />
        <Text style={appStyles.loadingText}>Loading saved plan...</Text>
      </SafeAreaView>
    )
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      {done ? <AppTabs /> : <OnboardingNavigator />}
    </NavigationContainer>
  )
}

export default function AppRoot() {
  return (
    <AppSessionProvider>
      <AppContent />
    </AppSessionProvider>
  )
}
