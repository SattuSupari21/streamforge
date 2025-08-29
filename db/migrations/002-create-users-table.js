/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export function up(pgm) {
    pgm.createTable('users', {
      user_id: {type: 'serial', primaryKey: true, notNull: true},
      username: { type: 'varchar(255)', unique: true, notNull: true },
      password_hash: { type: 'varchar(255)',  notNull: true},
      role: { type: 'varchar(50)', notNull: true, default: 'viewer' },
      created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('now()') },
    });
  
    pgm.createIndex('users', 'user_id');
  }
  
  export function down(pgm) {
    pgm.dropTable('videos');
  }
  