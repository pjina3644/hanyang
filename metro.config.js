const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix: expo-modules-core@3.x (SDK 54) distributes TypeScript source.
// Metro web resolver can't find "./polyfill" (a directory) without help.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './polyfill' &&
    context.originModulePath.includes('expo-modules-core') &&
    context.originModulePath.includes('ensureNativeModulesAreInstalled')
  ) {
    // On web use index.web.ts (installs expo global); native falls back normally.
    const ext = platform === 'web' ? 'index.web.ts' : 'index.ts';
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/expo-modules-core/src/polyfill',
        ext
      ),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
