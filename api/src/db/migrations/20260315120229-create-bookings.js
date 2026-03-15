'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'events',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('bookings', ['customer_id', 'created_at'], {
      name: 'bookings_customer_created_idx',
    });

    await queryInterface.addIndex('bookings', ['event_id', 'status'], {
      name: 'bookings_event_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('bookings', 'bookings_event_status_idx');
    await queryInterface.removeIndex('bookings', 'bookings_customer_created_idx');
    await queryInterface.dropTable('bookings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status";');
  },
};
