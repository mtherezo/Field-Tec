module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin necessário para a biblioteca de animação
      'react-native-reanimated/plugin',
    ],
  };
};