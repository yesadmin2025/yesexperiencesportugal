import { greet } from './index';

describe('greet function', () => {
  it('should return a greeting message', () => {
    const result = greet('Portugal');
    expect(result).toBe(
      'Hello, Portugal! Welcome to Yes Experiences Portugal.'
    );
  });

  it('should include the provided name in the greeting', () => {
    const result = greet('Traveler');
    expect(result).toContain('Traveler');
  });
});
