const assert = require('node:assert/strict');
const User = require('../domain/entities/user');

describe('User Entity', () => {
  describe('constructor', () => {
    it('creates a user with valid data', () => {
      const user = new User('1', 'John Doe', 'john@example.com', 30);

      assert.equal(user.id, '1');
      assert.equal(user.name, 'John Doe');
      assert.equal(user.email, 'john@example.com');
      assert.equal(user.age, 30);
    });

    it('creates a user without id', () => {
      const user = new User(null, 'Jane Doe', 'jane@example.com', 25);

      assert.equal(user.id, null);
      assert.equal(user.name, 'Jane Doe');
    });
  });

  describe('methods', () => {
    it('updates the name in a new instance', () => {
      const user = new User('1', 'John Doe', 'john@example.com', 30);

      const updated = user.updateName('John Smith');

      assert.equal(updated.name, 'John Smith');
      assert.equal(updated.id, user.id);
      assert.equal(updated.email, user.email);
      assert.notEqual(updated, user);
    });
  });
});
