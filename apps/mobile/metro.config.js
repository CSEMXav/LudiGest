const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Surveiller tous les fichiers du monorepo (packages partagés, etc.)
config.watchFolders = [workspaceRoot];

// Résoudre les packages depuis node_modules local ET root (pnpm workspace)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Suivre les symlinks pnpm pour les packages workspace (@ludigest/types, etc.)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
