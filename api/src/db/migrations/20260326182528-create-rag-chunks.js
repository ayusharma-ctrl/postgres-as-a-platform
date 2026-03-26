'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rag_chunks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      doc_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'rag_documents',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      chunk_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      page_number: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex('rag_chunks', ['doc_id'], {
      name: 'idx_rag_chunks_doc_id',
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX idx_rag_chunks_fts
      ON rag_chunks USING GIN(to_tsvector('english', content));
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rag_chunks');
  }
};
