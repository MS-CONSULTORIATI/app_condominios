module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }]
    ],
    plugins: [
      // React Native Reanimated plugin deve ser listado por último
      'react-native-reanimated/plugin',
    ],
  };
}; 