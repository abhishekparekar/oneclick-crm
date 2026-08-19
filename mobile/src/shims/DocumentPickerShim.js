import DocumentPicker from 'react-native-document-picker';

export const getDocumentAsync = async (options = {}) => {
  try {
    const res = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
    });
    return {
      type: 'success',
      canceled: false,
      assets: [{
        uri: res.uri,
        name: res.name,
        size: res.size,
        mimeType: res.type,
      }],
      uri: res.uri,
      name: res.name,
      size: res.size,
    };
  } catch (err) {
    return { type: 'cancel', canceled: true, assets: [] };
  }
};
export default { getDocumentAsync };
