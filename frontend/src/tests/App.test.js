import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../../App';

describe('App Navigation Structure', () => {
  it('renders without crashing', () => {
    // Test that the app renders without throwing errors
    // This validates that all screen imports and navigation setup is correct
    expect(() => render(<App />)).not.toThrow();
  });
});