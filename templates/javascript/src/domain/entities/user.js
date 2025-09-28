class User {
  constructor(id, name, email, age, createdAt = new Date(), updatedAt = new Date()) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.age = age;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  updateName(newName) {
    return new User(
      this.id,
      newName,
      this.email,
      this.age,
      this.createdAt,
      new Date()
    );
  }

  updateAge(newAge) {
    return new User(
      this.id,
      this.name,
      this.email,
      newAge,
      this.createdAt,
      new Date()
    );
  }
}

module.exports = User;
