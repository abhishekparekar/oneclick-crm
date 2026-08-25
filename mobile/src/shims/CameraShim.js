import React from 'react';
import { View } from 'react-native';

export class Camera extends React.Component {
  takePictureAsync = async () => ({
    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    width: 400,
    height: 400,
  });
  render() {
    return <View {...this.props} />;
  }
}

export class CameraView extends React.Component {
  takePictureAsync = async () => ({
    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    width: 400,
    height: 400,
  });
  render() {
    return <View {...this.props} />;
  }
}

export const useCameraPermissions = () => [
  { granted: true, status: 'granted', canAskAgain: true },
  async () => ({ granted: true, status: 'granted' }),
];

export const requestCameraPermissionsAsync = async () => ({
  granted: true,
  status: 'granted',
});

export const getCameraPermissionsAsync = async () => ({
  granted: true,
  status: 'granted',
});

export const CameraType = {
  front: 'front',
  back: 'back',
};

export default {
  Camera,
  CameraView,
  useCameraPermissions,
  requestCameraPermissionsAsync,
  getCameraPermissionsAsync,
  CameraType,
};
