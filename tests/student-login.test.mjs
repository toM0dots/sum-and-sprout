import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../scripts/sqlite-d1.mjs';
import {createWorker} from '../worker/index.js';
import {baselineReport} from '../reporting.js';
import {prepareSession,createDaily,submitAnswer} from '../practice.js';
import {CloudStore,cloudSave,restoreCloud,newPetCode} from '../cloud.js';
import {makeSave,readSave} from '../saves.js';
const origin='https://class.test',legacy='a'.repeat(64),session='b'.repeat(64),other='c'.repeat(64),secret='ABCD-EFGH-JKLM-NPQR';
const teacher={'oai-authenticated-user-id':'teacher','oai-authenticated-user-email':'teacher@test.example'};
function fresh(){const s={grade:3,credits:130,earned:150,correct:3,attempts:4,streak:2,best:2,pet:'cat',care:{cat:78},happiness:{cat:90},food:{apple:2},owned:['scarf'],wear:{cat:'scarf'},stats:{division:3},daily:{},needsUpdatedAt:Date.now(),joyAt:{}};prepareSession(s);s.session=createDaily('Alex','2026-11-15',s.correct,3,s.learning);return s;}
const player={name:'Alex',seed:'daily-alex'};
function harness(){const DB=database(),worker=createWorker();const call=async(path,data,token,who,method='POST')=>{const response=await worker.fetch(new Request(origin+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...(token?{Authorization:`Bearer ${token}`}:{})},...(!['GET','HEAD'].includes(method)?{body:JSON.stringify(data)}:{}),...(who?{}:{})}),{DB});return {status:response.status,data:await response.json()};};
 const teacherCall=async(path,data,who=teacher,method='POST')=>{const response=await worker.fetch(new Request(origin+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...who},...(!['GET','HEAD'].includes(method)?{body:JSON.stringify(data)}:{})}),{DB});return {status:response.status,data:await response.json()};};
 return {DB,call,teacherCall};}
async function setup(h){const c=(await h.teacherCall('/api/teacher/classes',{name:'Grade 3'})).data.class;const s=fresh();const joined=await h.call('/api/classroom/join',{code:c.code,name:'Alex',token:legacy,baseline:baselineReport(s)});const student=joined.data.student;const save=cloudSave(player,s);const r=await h.call('/api/classroom/account',{studentId:student.studentId,petCode:secret,save},legacy);assert.equal(r.status,200);return {c,student,s,save,account:r.data};}
async function login(h,c,token=session,code=secret){return h.call('/api/classroom/login',{code:c.code,name:'alex',petCode:code,token});}
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};

test('student signs in on a second device with full pet, wardrobe, adaptive progress and daily round intact',async()=>{
 const h=harness();try{const {c,student,s,save}=await setup(h);const result=await login(h,c);assert.equal(result.status,200);const backup=restoreCloud(result.data,session);
 assert.equal(backup.state.pet,'cat');assert.equal(backup.state.credits,130);assert.deepEqual(backup.state.wear,{cat:'scarf'});assert.deepEqual(backup.state.learning,s.learning);assert.deepEqual(backup.state.session,save.state.session);assert.equal(backup.player.seed,player.seed);assert.equal(backup.state.classroom.token,session);
 assert.equal((await h.call('/api/classroom/load',{studentId:student.studentId},session)).status,200);
 assert.equal((await h.call('/api/classroom/load',{studentId:crypto.randomUUID()},session)).status,401);
 assert.equal((await login(h,c,other,'ABCD-EFGH-JKLM-NPQS')).status,401);
 const report=await h.teacherCall(`/api/teacher/classes/${c.id}`,undefined,teacher,'GET');assert.ok(!JSON.stringify(report).includes(secret));assert.ok(!JSON.stringify(report).includes('game_json'));
 const row=await h.DB.prepare('SELECT * FROM student_accounts').first();assert.notEqual(row.login_hash,secret.replaceAll('-',''));assert.ok(!row.game_json.includes(legacy));assert.deepEqual(JSON.parse(row.game_json),save);
 const replay=await h.call('/api/classroom/account',{studentId:student.studentId,petCode:secret,save:cloudSave(player,fresh())},legacy);assert.equal(replay.data.revision,1);
 }finally{h.DB.close();}
});
test('save revisions and idempotent retries prevent stale devices and lost responses from erasing progress',async()=>{
 const h=harness();try{const {c,student,s}=await setup(h);await login(h,c);await login(h,c,other);
 submitAnswer(s,s.session.questions[0].display);const earned=s.credits;const data={studentId:student.studentId,revision:1,mutation:crypto.randomUUID(),save:cloudSave(player,s)};
 const first=await h.call('/api/classroom/save',data,session),retry=await h.call('/api/classroom/save',data,session);assert.equal(first.data.revision,2);assert.equal(retry.data.revision,2);
 const stale=await h.call('/api/classroom/save',{...data,mutation:crypto.randomUUID(),save:cloudSave(player,fresh())},other);assert.equal(stale.status,409);assert.equal(stale.data.save.state.credits,earned);
 const resumed=restoreCloud((await login(h,c)).data,session).state;submitAnswer(resumed,resumed.session.questions[0].display);assert.equal(resumed.credits,earned,'Answered round never awards twice after sign-in');
 assert.equal((await h.call('/api/classroom/save',{...data,revision:2,mutation:crypto.randomUUID(),save:{...data.save,state:{...s,credits:-1}}},session)).status,400);
 }finally{h.DB.close();}
});
test('teacher recovery preserves the save and revokes all old codes, sessions and legacy enrollment tokens',async()=>{
 const h=harness();try{const {c,student}=await setup(h);await login(h,c);const code=newPetCode();
 const path=`/api/teacher/students/${student.studentId}/reset-login`;
 assert.equal((await h.teacherCall(path,{petCode:code},{...teacher,'oai-authenticated-user-id':'other'})).status,404);
 assert.equal((await h.teacherCall(path,{petCode:code})).status,200);
 assert.equal((await login(h,c)).status,401);
 for(const token of [session,legacy])assert.equal((await h.call('/api/classroom/load',{studentId:student.studentId},token)).status,401);
 const reset=await login(h,c,other,code);assert.equal(reset.status,200);assert.equal(reset.data.save.state.credits,130);
 assert.equal((await h.call('/api/classroom/logout',{studentId:student.studentId},other)).status,200);assert.equal((await h.call('/api/classroom/load',{studentId:student.studentId},other)).status,401);
 await h.teacherCall(`/api/teacher/classes/${c.id}`,{open:false},teacher,'PATCH');assert.equal((await login(h,c,session,code)).status,200,'Closing enrollment does not disable existing sign-ins');
 }finally{h.DB.close();}
});
test('client reload retries the exact unacknowledged save, then uploads newer actions without snapshot regression',async()=>{
 const h=harness();try{const {c,s,account}=await setup(h);await login(h,c);const mem=storage();let lost=true,requests=[];
 const request=async(path,data,token)=>{requests.push(structuredClone(data));const r=await h.call('/api/classroom/'+path,data,token);if(lost&&path==='save'){lost=false;throw Error('lost acknowledgement');}if(r.status!==200)throw Object.assign(Error(r.data.error),{status:r.status,data:r.data});return r.data;};
 let client=new CloudStore(mem,{request});client.attach('alex',account,session);s.credits=140;client.mark('alex',player,s);await client.flush('alex');assert.ok(client.get('alex').job);
 client=new CloudStore(mem,{request});s.credits=150;client.mark('alex',player,s);await client.flush('alex');assert.equal(requests[0].mutation,requests[1].mutation);assert.equal(client.get('alex').revision,3);assert.equal(client.get('alex').desired,null);
 const online=(await login(h,c)).data;assert.equal(online.save.state.credits,150);
 }finally{h.DB.close();}
});
test('idle devices load the newest save, offline changes require a choice and retain a recovery copy',async()=>{
 const h=harness();try{const {c,s,account,student}=await setup(h);await login(h,c);const mem=storage();let restored=null,conflict=null;
 const request=async(path,data,token)=>{const r=await h.call('/api/classroom/'+path,data,token);if(r.status!==200)throw Object.assign(Error(r.data.error),{status:r.status,data:r.data});return r.data;};
 const client=new CloudStore(mem,{request,remote:(_id,save)=>restored=save,conflict:(_id,value)=>conflict=value});client.attach('alex',account,session);
 s.credits=170;await request('save',{studentId:student.studentId,revision:1,mutation:crypto.randomUUID(),save:cloudSave(player,s)},session);
 await client.flush('alex');assert.equal(restored.state.credits,170);assert.equal(client.get('alex').revision,2);
 s.credits=180;await request('save',{studentId:student.studentId,revision:2,mutation:crypto.randomUUID(),save:cloudSave(player,s)},session);
 s.credits=155;client.mark('alex',player,s);await client.flush('alex');assert.equal(conflict.save.state.credits,180);assert.ok(client.get('alex').desired);
 await client.resolve('alex','online');assert.equal(restored.state.credits,180);assert.equal(client.get('alex').desired,null);assert.equal(readSave(mem.getItem('sum-sprout-recovery-alex')).state.credits,155);
 }finally{h.DB.close();}
});
test('login attempts are rate limited and sessions expire server-side',async()=>{
 const h=harness();try{const {c,student}=await setup(h);await login(h,c);await h.DB.prepare('UPDATE student_sessions SET expires_at=0').run();assert.equal((await h.call('/api/classroom/load',{studentId:student.studentId},session)).status,401);
 for(let i=0;i<120;i++)await login(h,c,other,'ABCD-EFGH-JKLM-NPQS');assert.equal((await login(h,c)).status,429);
 }finally{h.DB.close();}
});
