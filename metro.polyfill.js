// Polyfill para import.meta.env - React Native
// Este polyfill resolve o problema do 'import.meta' is currently unsupported

(function() {
  'use strict';
  
  // Verificar se global está disponível
  if (typeof global === 'undefined') {
    return;
  }
  
  try {
    // Criar objeto import.meta.env com valores seguros
    const metaEnv = {
      MODE: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production',
      DEV: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
      PROD: typeof __DEV__ !== 'undefined' ? !__DEV__ : true,
      NODE_ENV: typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production'
    };
    
    // Definir global.import.meta.env
    if (!global.import) {
      global.import = {};
    }
    if (!global.import.meta) {
      global.import.meta = {};
    }
    if (!global.import.meta.env) {
      global.import.meta.env = metaEnv;
    }
    
    // Também definir no window se existir (para compatibilidade web)
    if (typeof window !== 'undefined') {
      if (!window.import) {
        window.import = {};
      }
      if (!window.import.meta) {
        window.import.meta = {};
      }
      if (!window.import.meta.env) {
        window.import.meta.env = metaEnv;
      }
    }
    
    console.log('[Metro Polyfill] import.meta.env configurado com sucesso');
  } catch (error) {
    console.warn('[Metro Polyfill] Erro ao configurar import.meta.env:', error);
  }
})(); 