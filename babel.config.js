module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // O plugin de worklets/reanimated é adicionado automaticamente pelo
    // babel-preset-expo quando 'react-native-worklets' está instalado (SDK 54+).
  };
};