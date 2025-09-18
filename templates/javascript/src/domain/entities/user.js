export class User {
  constructor(id, email, name, password, createdAt = new Date(), updatedAt = new Date()) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.password = password;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  updateName(newName) {
    return new User(
      this.id,
      this.email,
      newName,
      this.password,
      this.createdAt,
      new Date()
    );
  }
}
