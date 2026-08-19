import { launchImageLibrary } from 'react-native-image-picker';

export const requestMediaLibraryPermissionsAsync = async () => {
  return { status: 'granted' };
};

export const launchImageLibraryAsync = async (options = {}) => {
  try {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: options.quality || 0.8,
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
    return { canceled: true, assets: [] };
  }
};
