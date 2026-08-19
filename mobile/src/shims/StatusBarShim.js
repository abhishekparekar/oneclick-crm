import React from 'react';
import { StatusBar as RNStatusBar } from 'react-native';

export const StatusBar = (props) => {
  return <RNStatusBar barStyle="dark-content" backgroundColor="#ffffff" {...props} />;
};
export default StatusBar;
