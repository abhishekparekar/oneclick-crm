import React from 'react';
import { View } from 'react-native';

export class Camera extends React.Component {
  render() {
    return <View {...this.props} />;
  }
}
export const useCameraPermissions = () => [{ granted: true }, async () => ({ granted: true })];
export default { Camera, useCameraPermissions };
