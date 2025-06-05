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

// Resolver problemas potenciais com reanimated
config.resolver.unstable_enablePackageExports = true;

module.exports = config; 