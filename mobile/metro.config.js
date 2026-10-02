const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers: 2,
  // Exclude iOS-only fabric SVG component from Android transforms
  // Prevents OOM crash when flow-parser loads WebAssembly for this file
  resolver: {
    blockList: [
      /node_modules\/react-native-svg\/src\/fabric\/IOSSvgViewNativeComponent\.ts/,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
