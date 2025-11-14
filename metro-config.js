// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Make Metro understand the "@/..." alias used throughout the app
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@': __dirname,
};

module.exports = config;
