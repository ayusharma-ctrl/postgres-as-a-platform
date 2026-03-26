'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rag_documents', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_hash: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'done', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      total_chunks: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      error_message: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      }
    });

    await queryInterface.addIndex('rag_documents', ['file_hash'], {
      name: 'idx_rag_documents_hash',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rag_documents');
  }
};
