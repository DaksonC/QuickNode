/**
 * Abstract User Repository Interface
 * This interface defines the contract for all user repository implementations
 */
class UserRepository {
  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   */
  async create(userData) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user data
   * @param {string} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  async update(id, userData) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find all users with pagination
   * @param {number} limit - Maximum number of users to return
   * @param {number} offset - Number of users to skip
   * @returns {Promise<Array>} Array of user objects
   */
  async findAll(limit = 10, offset = 0) {
    throw new Error('Method not implemented');
  }
}

module.exports = { UserRepository };
