import {readSave} from '../saves.js';
// Student pet codes are random 80-bit credentials, not user-chosen passwords.
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const tokenValid=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const idValid=v=>typeof v==='string'&&/^[a-zA-Z0-9-]{16,64}$/.test(v);
const codeValue=v=>typeof v==='string'?v.toUpperCase().replace(/[\s-]/g,''):'';
const petCode=v=>{const code=codeValue(v);if(code.length!==16||[...code].some(c=>!alphabet.includes(c)))fail('Check your class code, nickname and pet code.',401);return code;};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const integer=v=>Number.isSafeInteger(v)&&v>=0;
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Use JSON.',415);
  if(Number(request.headers.get('Content-Length'))>2200000)fail('That save is too large.',413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>2200000)fail('That save is too large.',413);
  try{const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{fail('Check the details and try again.');}
}
function gameSave(raw){
  try{
    const clean=readSave(JSON.stringify(raw));delete clean.state.classroom;
    return {format:'sum-and-sprout-save',version:1,player:clean.player,state:clean.state};
  }catch{fail('This game save is not supported.');}
}
export async function studentAuth(db,request,studentId){
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!tokenValid(token)||!idValid(studentId))fail('Sign in again to save your pet.',401);
  const tokenHash=await hash(token);
  const student=await db.prepare('SELECT s.*,c.name AS class_name,c.join_code FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND (s.token_hash=? OR EXISTS (SELECT 1 FROM student_sessions ss WHERE ss.student_id=s.id AND ss.token_hash=? AND ss.expires_at>?))').bind(studentId,tokenHash,tokenHash,Date.now()).first();
  if(!student)fail('Sign in again to save your pet.',401);return student;
}
function connection(s){return {studentId:s.id,classId:s.class_id,className:s.class_name,name:s.name,code:s.join_code};}
async function saved(db,s){const a=await db.prepare('SELECT game_json,revision,updated_at FROM student_accounts WHERE student_id=?').bind(s.id).first();if(!a)fail('Set up your pet login first.',404);return {student:connection(s),save:a.game_json?JSON.parse(a.game_json):null,revision:a.revision,savedAt:a.updated_at};}
async function limitLogin(db,request){
  // Fixed-window IP rate limit shared by all isolates; expired rows are pruned.
  const now=Date.now(),bucket=Math.floor(now/600000),ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const key=await hash(`login:${ip}:${bucket}`);
  const row=await db.prepare('INSERT INTO login_limits (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,(bucket+2)*600000).first();
  await db.prepare('DELETE FROM login_limits WHERE expires_at<?').bind(now).run();
  if(row.attempts>120)fail('Too many sign-in tries. Wait 10 minutes and try again.',429);
}
export async function resetStudent(db,studentId,owner,data){
  const s=await db.prepare('SELECT s.id,s.name,s.class_id,c.join_code,c.name AS class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND c.owner_id=?').bind(studentId,owner).first();if(!s)fail('Student not found.',404);
  const code=petCode(data.petCode),codeHash=await hash(code),now=Date.now();
  await db.batch([
    db.prepare('INSERT INTO student_accounts (student_id,login_hash,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(student_id) DO UPDATE SET login_hash=excluded.login_hash,updated_at=excluded.updated_at').bind(s.id,codeHash,now),
    db.prepare('UPDATE students SET token_hash=? WHERE id=?').bind(await hash(randomToken()),s.id),
    db.prepare('DELETE FROM student_sessions WHERE student_id=?').bind(s.id)
  ]);
  return json({student:connection(s)});
}
export async function studentAPI(path,request,db){
  const data=await body(request);
  if(path==='/api/classroom/login'){
    await limitLogin(db,request);
    const code=codeValue(data.code),name=typeof data.name==='string'?data.name.trim():'';
    const secret=petCode(data.petCode);if(!tokenValid(data.token)||name.length>24||code.length!==10)fail('Check your class code, nickname and pet code.',401);
    const s=await db.prepare('SELECT s.*,c.name AS class_name,c.join_code FROM students s JOIN classes c ON c.id=s.class_id JOIN student_accounts a ON a.student_id=s.id WHERE c.join_code=? AND lower(s.name)=lower(?) AND a.login_hash=?').bind(code,name,await hash(secret)).first();
    if(!s)fail('Check your class code, nickname and pet code.',401);
    const now=Date.now();await db.batch([
      db.prepare('DELETE FROM student_sessions WHERE expires_at<?').bind(now),
      db.prepare('INSERT INTO student_sessions (token_hash,student_id,expires_at) VALUES (?,?,?) ON CONFLICT(token_hash) DO NOTHING').bind(await hash(data.token),s.id,now+30*86400000)
    ]);
    return json(await saved(db,s));
  }
  const s=await studentAuth(db,request,data.studentId);
  if(path==='/api/classroom/account'){
    const codeHash=await hash(petCode(data.petCode)),game=gameSave(data.save),now=Date.now();
    await db.prepare('INSERT INTO student_accounts (student_id,login_hash,game_json,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(student_id) DO NOTHING').bind(s.id,codeHash,JSON.stringify(game),now).run();
    const existing=await db.prepare('SELECT login_hash FROM student_accounts WHERE student_id=?').bind(s.id).first();
    if(existing.login_hash!==codeHash)fail('A pet login already exists. Sign in, or ask your teacher for a new pet code.',409);
    return json(await saved(db,s));
  }
  if(path==='/api/classroom/load')return json(await saved(db,s));
  if(path==='/api/classroom/logout'){
    const token=request.headers.get('Authorization').slice(7);await db.prepare('DELETE FROM student_sessions WHERE token_hash=? AND student_id=?').bind(await hash(token),s.id).run();return json({ok:true});
  }
  if(path==='/api/classroom/save'){
    if(!integer(data.revision)||!idValid(data.mutation))fail('Invalid save version.');
    const game=gameSave(data.save),now=Date.now();
    const updated=await db.prepare('UPDATE student_accounts SET game_json=?,revision=revision+1,last_mutation=?,updated_at=? WHERE student_id=? AND revision=? AND (last_mutation IS NULL OR last_mutation<>?) RETURNING revision').bind(JSON.stringify(game),data.mutation,now,s.id,data.revision,data.mutation).first();
    if(updated)return json({revision:updated.revision,savedAt:now});
    const current=await db.prepare('SELECT revision,last_mutation,updated_at FROM student_accounts WHERE student_id=?').bind(s.id).first();
    if(current?.last_mutation===data.mutation)return json({revision:current.revision,savedAt:current.updated_at});
    if(!current)fail('Set up your pet login first.',404);
    return json({error:'Another device has a newer save.',conflict:true,...await saved(db,s)},409);
  }
  return json({error:'Not found.'},404);
}
