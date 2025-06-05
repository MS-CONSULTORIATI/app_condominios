// Polyfill para import.meta.env que pode ser importado
// Use: import './import-meta-polyfill.js' no início dos arquivos que usam import.meta

if (typeof global !== 'undefined' && !global.import) {
  const metaEnv = {
    MODE: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
    DEV: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
    PROD: typeof __DEV__ !== 'undefined' ? !__DEV__ : true,
    NODE_ENV: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production'
  };

  global.import = {
    meta: {
      env: metaEnv
    }
  };
} 