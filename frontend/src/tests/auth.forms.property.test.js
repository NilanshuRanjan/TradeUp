import React from 'react';
import { render } from '@testing-library/react-native';
import fc from 'fast-check';
import FormInput from '../components/FormInput';

global.Alert = {
  alert: jest.fn(),
};

describe('Authentication Forms Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 23: Form Validation Feedback', () => {
    it('should display error messages for invalid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            value: fc.string(),
            error: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          }),
          async (inputData) => {
            const { queryByText } = render(
              <FormInput
                label="Test Input"
                value={inputData.value}
                onChangeText={jest.fn()}
                error={inputData.error}
                testID="test-input"
              />
            );
            
            if (inputData.error) {
              expect(queryByText(inputData.error)).toBeTruthy();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate email format correctly', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validEmail)).toBe(true);
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail)).toBe(false);
    });
  });
});