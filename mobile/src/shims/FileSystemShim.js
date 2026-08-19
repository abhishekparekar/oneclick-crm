import RNFS from 'react-native-fs';

export const documentDirectory = RNFS.DocumentDirectoryPath;
export const downloadAsync = async (url, fileUri) => {
  try {
    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: fileUri,
    }).promise;
    return { status: result.statusCode, uri: fileUri };
  } catch (err) {
    return { status: 500, uri: '' };
  }
};

export const Legacy = {
  documentDirectory,
  downloadAsync,
};

export default {
  documentDirectory,
  downloadAsync,
  Legacy,
};
