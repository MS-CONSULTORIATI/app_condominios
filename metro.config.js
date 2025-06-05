const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Adicionar configurações específicas para React Native Reanimated
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
};

// Configurar transformer para lidar com import.meta e reanimated
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config; 