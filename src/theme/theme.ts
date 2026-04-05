import { DefaultTheme } from '@react-navigation/native'
import { Dimensions } from 'react-native'

export const colors = {
  background: '#090909',
  surface: '#121212',
  surfaceMuted: '#111217',
  border: '#262626',
  borderSubtle: '#24252b',
  borderMuted: '#2c2c2c',
  text: '#f5f5f5',
  textMuted: '#b3b3b8',
  textSoft: '#c7cad4',
  primary: '#ff2f6d',
  primarySoft: '#ff5b7f',
  primaryMuted: '#ff8fab',
  accent: '#b785ff',
  success: '#2f6b3d',
  warning: '#d67d2b',
  info: '#88a5b8',
} as const

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: '#1d1d1f',
    primary: colors.primary,
  },
}

export const chartWidth = Math.max(Dimensions.get('window').width - 56, 240)

export const chartConfig = {
  backgroundGradientFrom: '#16171b',
  backgroundGradientTo: '#16171b',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 91, 127, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(215, 216, 221, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#ff2f6d',
  },
  propsForBackgroundLines: {
    stroke: '#24252b',
  },
  fillShadowGradientFrom: '#ff2f6d',
  fillShadowGradientTo: '#ff2f6d',
  fillShadowGradientFromOpacity: 0.24,
  fillShadowGradientToOpacity: 0.04,
  barPercentage: 0.6,
}
