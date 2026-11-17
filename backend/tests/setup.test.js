const mongoose = require('mongoose');

describe('Database Setup', () => {
  test('should connect to test database', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  test('should have clean database after each test', async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      const count = await collection.countDocuments();
      expect(count).toBe(0);
    }
  });
});