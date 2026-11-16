const { DataTypes } = require('sequelize');

/** Sequelize model of __Name__ (persistence only; the entity lives in the domain). */
function define__Name__Model(sequelize) {
  return sequelize.define(
    '__Name__',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true, len: [1, 255] },
      },
    },
    {
      tableName: '__table__',
      timestamps: true,
      underscored: true,
    }
  );
}

module.exports = define__Name__Model;
