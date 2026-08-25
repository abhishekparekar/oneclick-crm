const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [
      /.*[/\\]android[/\\].*/,
      /.*[/\\]ios[/\\].*/,
      /.*[/\\]\.gradle[/\\].*/,
      /.*[/\\]\.expo[/\\].*/,
    ],
  },
  maxWorkers: 2,
};

module.exports = mergeConfig(defaultConfig, config);
