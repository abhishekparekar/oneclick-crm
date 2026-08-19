import { Linking } from 'react-native';

export const openBrowserAsync = async (url) => {
  try {
    await Linking.openURL(url);
    return { type: 'opened' };
  } catch (e) {
    return { type: 'error' };
  }
};
export default { openBrowserAsync };
