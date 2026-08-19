import React from 'react';
import { View } from 'react-native';

export const BlurView = (props) => (
  <View {...props} style={[{ backgroundColor: 'rgba(255,255,255,0.85)' }, props.style]} />
);
export default { BlurView };
