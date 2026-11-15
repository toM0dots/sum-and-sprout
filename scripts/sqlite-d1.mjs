import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function database(filename=':memory:'){
  const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
    if(db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
    db.exec('BEGIN');try{db.exec(readFileSync(new URL(`../drizzle/${name}`,import.meta.url),'utf8'));db.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(name);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  }
  function prepare(sql){let args=[];const result={bind(...values){args=values;return result;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const info=db.prepare(sql).run(...args);return {success:true,meta:{changes:info.changes}};},execute(){const stmt=db.prepare(sql);return stmt.columns().length?{results:stmt.all(...args)}:{results:[],meta:stmt.run(...args)};}};return result;}
  return {prepare,async batch(statements){db.exec('BEGIN');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}},close(){db.close();}};
}
