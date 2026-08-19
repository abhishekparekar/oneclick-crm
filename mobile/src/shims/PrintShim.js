import RNPrint from 'react-native-print';
export const printToFileAsync = async ({ html }) => {
  try {
    const res = await RNPrint.print({ html });
    return { uri: res ? res.filePath : '' };
  } catch (e) {
    return { uri: '' };
  }
};
