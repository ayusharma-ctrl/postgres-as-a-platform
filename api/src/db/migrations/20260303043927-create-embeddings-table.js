'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        content TEXT NOT NULL,

        embedding vector(1536) NOT NULL,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryInterface.addIndex('embeddings', ['entity_type', 'entity_id'], {
      name: 'idx_embeddings_entity',
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX idx_embeddings_vector
      ON embeddings
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('embeddings', 'idx_embeddings_entity');
    await queryInterface.removeIndex('embeddings', 'idx_embeddings_vector');
    await queryInterface.dropTable('embeddings');
    await queryInterface.sequelize.query(`
      DROP EXTENSION IF EXISTS vector;
      DROP EXTENSION IF EXISTS pgcrypto;
    `);
  }
};
