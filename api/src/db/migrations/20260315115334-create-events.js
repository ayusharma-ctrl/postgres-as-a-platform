'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      organizer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      starts_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ends_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'cancelled'),
        allowNull: false,
        defaultValue: 'published',
      },
      total_tickets: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      available_tickets: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

    await queryInterface.addIndex('events', ['organizer_id'], {
      name: 'events_organizer_id_idx',
    });

    await queryInterface.addIndex('events', ['status', 'ends_at', 'starts_at'], {
      name: 'events_status_ends_starts_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('events', 'events_status_ends_starts_idx');
    await queryInterface.removeIndex('events', 'events_organizer_id_idx');
    await queryInterface.dropTable('events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_events_status";');
  },
};
