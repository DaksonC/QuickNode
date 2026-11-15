/**
 * __Name__ entity: business data and rules, free of frameworks.
 * Add the fields of your domain here, in the Sequelize model and in the route validation.
 */
class __Name__ {
  constructor(id, name, createdAt = new Date(), updatedAt = new Date()) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  rename(name) {
    return new __Name__(this.id, name, this.createdAt, new Date());
  }
}

module.exports = __Name__;
