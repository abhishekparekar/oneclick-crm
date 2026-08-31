module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@expo/vector-icons': './src/shims/VectorIcons.js',
          'expo-linear-gradient': './src/shims/LinearGradientShim.js',
          'expo-status-bar': './src/shims/StatusBarShim.js',
          'expo-image-picker': './src/shims/ImagePickerShim.js',
          'expo-print': './src/shims/PrintShim.js',
          'expo-sharing': './src/shims/ShareShim.js',
          'expo-document-picker': './src/shims/DocumentPickerShim.js',
          'expo-file-system': './src/shims/FileSystemShim.js',
          'expo-web-browser': './src/shims/WebBrowserShim.js',
          'expo-av': './src/shims/AudioShim.js',
          'expo-camera': './src/shims/CameraShim.js',
          'expo-blur': './src/shims/BlurShim.js',
          'expo-constants': './src/shims/ConstantsShim.js',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
