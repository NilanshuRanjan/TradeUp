// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Mock only the problematic components
  RN.NativeModules = {
    ...RN.NativeModules,
    SettingsManager: {
      settings: {},
    },
  };
  
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Alert
global.Alert = {
  alert: jest.fn(),
};