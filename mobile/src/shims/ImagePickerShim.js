import { Platform, PermissionsAndroid } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export const MediaTypeOptions = {
  All: 'All',
  Videos: 'Videos',
  Images: 'Images',
};

export const CameraType = {
  front: 'front',
  back: 'back',
};

export const requestMediaLibraryPermissionsAsync = async () => {
  return { status: 'granted', granted: true };
};

export const getMediaLibraryPermissionsAsync = async () => {
  return { status: 'granted', granted: true };
};

export const requestCameraPermissionsAsync = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "OneClick needs access to your camera to take attendance selfies.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        }
      );
      return {
        status: granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
        granted: granted === PermissionsAndroid.RESULTS.GRANTED,
      };
    } catch (e) {
      return { status: 'denied', granted: false };
    }
  }
  return { status: 'granted', granted: true };
};

export const getCameraPermissionsAsync = async () => {
  if (Platform.OS === 'android') {
    try {
      const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      return {
        status: has ? 'granted' : 'denied',
        granted: has,
      };
    } catch (e) {
      return { status: 'denied', granted: false };
    }
  }
  return { status: 'granted', granted: true };
};

export const launchImageLibraryAsync = async (options = {}) => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: typeof options.quality === 'number' ? options.quality : 0.8,
      includeBase64: options.base64 || false,
    });
    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return { canceled: true, assets: [] };
    }
    return {
      canceled: false,
      assets: result.assets.map(a => ({
        uri: a.uri,
        width: a.width,
        height: a.height,
        type: a.type,
        fileName: a.fileName,
        fileSize: a.fileSize,
        base64: a.base64,
      })),
    };
  } catch (err) {
    console.warn("launchImageLibraryAsync error:", err);
    return { canceled: true, assets: [] };
  }
};

export const launchCameraAsync = async (options = {}) => {
  try {
    // If on Android, ensure camera permission is granted before launching native intent
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (!hasPermission) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "OneClick needs camera access to capture your attendance selfie.",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return { canceled: true, assets: [] };
        }
      }
    }

    const cameraType =
      options.cameraType === 'front' ||
      options.cameraSide === 'front' ||
      options.cameraType === 1 ||
      options.cameraType === 'Front'
        ? 'front'
        : (options.cameraType === 'back' || options.cameraSide === 'back' ? 'back' : 'front');

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: cameraType,
      quality: typeof options.quality === 'number' ? options.quality : 0.5,
      includeBase64: options.base64 !== undefined ? Boolean(options.base64) : true,
      saveToPhotos: false,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) {
      return { canceled: true, assets: [] };
    }

    return {
      canceled: false,
      assets: result.assets.map(a => ({
        uri: a.uri,
        width: a.width,
        height: a.height,
        type: a.type,
        fileName: a.fileName,
        fileSize: a.fileSize,
        base64: a.base64,
      })),
    };
  } catch (err) {
    console.warn("launchCameraAsync error:", err);
    return { canceled: true, assets: [] };
  }
};

export default {
  MediaTypeOptions,
  CameraType,
  requestMediaLibraryPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  getCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
};
