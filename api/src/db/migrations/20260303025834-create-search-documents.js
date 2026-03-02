'use strict';

const SQL_ENABLE_PG_TRGM = `CREATE EXTENSION IF NOT EXISTS pg_trgm;`;

const SQL_DISABLE_PG_TRGM = `DROP EXTENSION IF EXISTS pg_trgm;`;

const SQL_CREATE_VECTOR_TRIGGER_FUNCTION = `
  CREATE OR REPLACE FUNCTION search_documents_tsvector_trigger()
  RETURNS trigger AS $$
  BEGIN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(NEW.body, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;
`;

const SQL_CREATE_VECTOR_TRIGGER = `
  CREATE TRIGGER trg_search_documents_tsvector
  BEFORE INSERT OR UPDATE OF title, summary, body, tags
  ON search_documents
  FOR EACH ROW
  EXECUTE FUNCTION search_documents_tsvector_trigger();
`;

const TRIGRAM_INDEXES = [
  {
    name: 'idx_search_documents_title_trgm',
    sql: `CREATE INDEX idx_search_documents_title_trgm ON search_documents USING GIN (title gin_trgm_ops);`
  },
  {
    name: 'idx_search_documents_summary_trgm',
    sql: `CREATE INDEX idx_search_documents_summary_trgm ON search_documents USING GIN (summary gin_trgm_ops);`
  },
  {
    name: 'idx_search_documents_body_trgm',
    sql: `CREATE INDEX idx_search_documents_body_trgm ON search_documents USING GIN (body gin_trgm_ops);`
  }
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(SQL_ENABLE_PG_TRGM);

    await queryInterface.createTable('search_documents', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: false,
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      search_vector: {
        type: Sequelize.TSVECTOR,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.sequelize.query(SQL_CREATE_VECTOR_TRIGGER_FUNCTION);
    await queryInterface.sequelize.query(SQL_CREATE_VECTOR_TRIGGER);

    await queryInterface.addIndex('search_documents', ['search_vector'], {
      name: 'idx_search_documents_vector',
      using: 'GIN'
    });

    for (const index of TRIGRAM_INDEXES) {
      await queryInterface.sequelize.query(index.sql);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_search_documents_tsvector ON search_documents;`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS search_documents_tsvector_trigger();`);

    for (const index of [...TRIGRAM_INDEXES].reverse()) {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${index.name};`);
    }

    await queryInterface.removeIndex('search_documents', 'idx_search_documents_vector');
    await queryInterface.dropTable('search_documents');
    await queryInterface.sequelize.query(SQL_DISABLE_PG_TRGM);
  }
};
