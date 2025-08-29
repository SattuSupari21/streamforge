/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export function up(pgm) {
    pgm.createTable('videos', {
      video_id: { type: 'varchar(255)', notNull: true, unique: true },
      title: { type: 'varchar(255)' },
      description: { type: 'text' },
      uploader_id: { type: 'varchar(255)' },
      status: { type: 'varchar(50)', notNull: true, default: 'uploaded' },
      created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
      updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });
  
    pgm.createIndex('videos', 'video_id');
  }
  
  export function down(pgm) {
    pgm.dropTable('videos');
  }
  