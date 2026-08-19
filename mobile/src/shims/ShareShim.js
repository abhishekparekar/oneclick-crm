import Share from 'react-native-share';
export const shareAsync = async (uri) => {
  try {
    return await Share.open({ url: uri });
  } catch (e) {
    return null;
  }
};
