const User = require('../domain/entities/user');

describe('User Entity', () => {
  describe('constructor', () => {
    it('should create a user with valid data', () => {
      // Arrange
      const userData = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      // Act
      const user = new User(userData.id, userData.name, userData.email, userData.age);

      // Assert
      expect(user.id).toBe(userData.id);
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.age).toBe(userData.age);
      expect(user.password).toBe(userData.password);
    });

    it('should create a user without id', () => {
      // Arrange
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25
      };

      // Act
      const user = new User(null, userData.name, userData.email, userData.age);

      // Assert
      expect(user.id).toBeNull();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.age).toBe(userData.age);
    });
  });

  describe('methods', () => {
    it('should update user name', () => {
      // Arrange
      const user = new User('1', 'John Doe', 'john@example.com', 30);
      const newName = 'John Smith';

      // Act
      const updatedUser = user.updateName(newName);

      // Assert
      expect(updatedUser.name).toBe(newName);
      expect(updatedUser.id).toBe(user.id);
      expect(updatedUser.email).toBe(user.email);
      expect(updatedUser.age).toBe(user.age);
      expect(updatedUser).not.toBe(user); // Should be a new instance
    });
  });
});
