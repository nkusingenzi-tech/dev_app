import { Dimensions } from 'react-native';

export const { width } = Dimensions.get('window');
export const isSmall = width < 380;

export const colors = {
  bg: '#070710',
  surface: '#0F0F1C',
  card: '#151529',
  raised: '#1B1B33',
  text: '#F7F8FF',
  muted: 'rgba(255,255,255,0.66)',
  dim: 'rgba(255,255,255,0.36)',
  border: 'rgba(255,255,255,0.09)',
  green: '#38A37F',
  red: '#FF4757',
  gold: '#FFB800',
  blue: '#818CF8',
};
