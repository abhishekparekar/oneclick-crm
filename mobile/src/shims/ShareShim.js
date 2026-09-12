import Share from 'react-native-share';

export const isAvailableAsync = async () => {
  return true;
};

export const shareAsync = async (uri, options = {}) => {
  try {
    let formattedUri = uri;
    if (
      formattedUri &&
      typeof formattedUri === 'string' &&
      !formattedUri.startsWith('file://') &&
      !formattedUri.startsWith('content://') &&
      !formattedUri.startsWith('http')
    ) {
      formattedUri = `file://${formattedUri}`;
    }

    const shareOptions = {
      url: formattedUri,
      title: options.dialogTitle || 'Share File',
      subject: options.dialogTitle || 'Share File',
      type: options.mimeType || undefined,
    };

    return await Share.open(shareOptions);
  } catch (e) {
    if (e?.message !== 'User did not share' && e?.error !== 'User did not share') {
      console.warn('[ShareShim] Share error:', e);
    }
    return null;
  }
};

export default {
  isAvailableAsync,
  shareAsync,
};

