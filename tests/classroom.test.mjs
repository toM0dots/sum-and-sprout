import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../scripts/sqlite-d1.mjs';
import {createWorker} from '../worker/index.js';
import {baselineReport} from '../reporting.js';
import {createPractice,prepareSession,submitAnswer,showAnswer,nextQuestion,setGrade} from '../practice.js';
import {makeSave,readSave} from '../saves.js';
import {topicSummary,practiceTopics,csvReport} from '../dashboard-data.js';
import {syncClass,joinClass} from '../classroom.js';

const origin='https://class.test',token='a'.repeat(64),otherToken='b'.repeat(64);
function fresh(){const s={grade:3,correct:0,credits:0,earned:0,attempts:0,streak:0,best:0,stats:{},pet:'fox',care:{fox:65},food:{apple:1},owned:[],wear:{}};prepareSession(s);s.session=createPractice('division',0,3,'mixed',s.learning);return s;}
const current=s=>s.session.questions[s.session.index];
const solve=s=>submitAnswer(s,current(s).display);
const auth=id=>({'oai-authenticated-user-id':id,'oai-authenticated-user-email':`${id}@test.example`});
function harness(){const DB=database(),worker=createWorker();return {DB,async call(path,{method='GET',data,teacher,token,origin:siteOrigin=origin}={}){
  const headers={'Content-Type':'application/json','Origin':siteOrigin,...(teacher?auth(teacher):{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const response=await worker.fetch(new Request(origin+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})}),{DB});
  const body=await response.json();return {status:response.status,body,headers:response.headers};
}};}
async function create(h,owner='teacher'){const r=await h.call('/api/teacher/classes',{method:'POST',teacher:owner,data:{name:'Grade 3'}});assert.equal(r.status,201);return r.body.class;}
async function join(h,c,key=token,name='Alex',baseline=baselineReport(fresh())){const r=await h.call('/api/classroom/join',{method:'POST',data:{code:c.code,name,token:key,baseline}});assert.ok([200,201].includes(r.status),JSON.stringify(r));return r.body.student;}
const event=(skill='division',correct=1,level=2)=>({id:crypto.randomUUID(),skill,correct,level,at:Date.now()});

test('teacher sign-in, class ownership, CSRF and student-only tokens protect every report',async()=>{
  const h=harness();try{
    assert.equal((await h.call('/api/teacher/classes')).status,401);
    assert.equal((await h.call('/api/teacher/classes',{method:'POST',teacher:'teacher',origin:'https://evil.test',data:{name:'No'}})).status,403);
    const c=await create(h),student=await join(h,c);
    assert.equal((await h.call(`/api/teacher/classes/${c.id}`,{teacher:'other'})).status,404);
    assert.equal((await h.call(`/api/teacher/classes/${c.id}`,{token})).status,401);
    assert.equal((await h.call(`/api/teacher/classes/${c.id}`,{method:'PATCH',teacher:'other',data:{open:false}})).status,404);
    assert.equal((await h.call('/api/classroom/sync',{method:'POST',token:otherToken,data:{studentId:student.studentId,events:[event()]}})).status,401);
    const report=await h.call(`/api/teacher/classes/${c.id}`,{teacher:'teacher'});assert.equal(report.status,200);assert.equal(report.body.students[0].name,'Alex');
    assert.ok(!JSON.stringify(report.body).includes(token));assert.ok(!JSON.stringify(report.body).includes('token_hash'));
    assert.equal(report.headers.get('Cache-Control'),'private, no-store');
    const stored=await h.DB.prepare('SELECT token_hash FROM students').first();assert.notEqual(stored.token_hash,token);
  }finally{h.DB.close();}
});
test('joining retries are idempotent, classroom codes grant no report access, and closed joining preserves members',async()=>{
  const h=harness();try{const c=await create(h),student=await join(h,c);
    const again=await join(h,c);assert.equal(again.studentId,student.studentId);
    assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM students').first()).n,1);
    const duplicate=await h.call('/api/classroom/join',{method:'POST',data:{code:c.code,name:'Alex',token:otherToken,baseline:baselineReport(fresh())}});assert.equal(duplicate.status,409);
    await h.call(`/api/teacher/classes/${c.id}`,{method:'PATCH',teacher:'teacher',data:{open:false}});
    const closed=await h.call('/api/classroom/join',{method:'POST',data:{code:c.code,name:'Sam',token:otherToken,baseline:baselineReport(fresh())}});assert.equal(closed.status,403);
    assert.equal((await join(h,c)).studentId,student.studentId);
    assert.equal((await h.call('/api/classroom/sync',{method:'POST',token,data:{studentId:student.studentId,events:[event()]}})).status,200);
  }finally{h.DB.close();}
});
test('offline retries and restored saves never duplicate accuracy or overwrite a newer level',async()=>{
  const h=harness();try{const c=await create(h),base=baselineReport(fresh());base.skills.division={count:5,correct:3,recent:[1,1,0,1,0],lastAt:Date.now(),band:2};const student=await join(h,c,token,'Alex',base);
    const a=event('division',1,3),b=event('division',0,3),reset=event('division',null,1);
    const send=events=>h.call('/api/classroom/sync',{method:'POST',token,data:{studentId:student.studentId,events}});
    assert.equal((await send([a,b])).status,200);await send([reset]);await send([a,b]);
    let report=(await h.call(`/api/teacher/classes/${c.id}`,{teacher:'teacher'})).body.students[0];
    assert.deepEqual([report.skills.division.count,report.skills.division.correct,report.skills.division.band],[7,4,1]);
    assert.deepEqual(report.skills.division.recent,[1,1,0,1,0,1,0]);
    const other=await join(h,c,otherToken,'Sam');assert.equal((await h.call('/api/classroom/sync',{method:'POST',token:otherToken,data:{studentId:student.studentId,events:[event()]}})).status,401);
    const bad={...event(),level:99};assert.equal((await send([event(),bad])).status,400);
    assert.equal((await h.DB.prepare('SELECT COUNT(*) AS n FROM events').first()).n,3);
    assert.notEqual(other.studentId,student.studentId);
  }finally{h.DB.close();}
});
test('GitHub-origin student syncing is allowed without exposing teacher data or credential cookies',async()=>{
  const h=harness();try{const c=await create(h),student=await join(h,c);
    const success=await h.call('/api/classroom/sync',{method:'POST',origin:'https://tom0dots.github.io',token,data:{studentId:student.studentId,events:[event()]}});
    assert.equal(success.status,200);assert.equal(success.headers.get('Access-Control-Allow-Origin'),'https://tom0dots.github.io');assert.equal(success.headers.get('Access-Control-Allow-Credentials'),null);
    const denied=await h.call('/api/classroom/sync',{method:'POST',origin:'https://evil.test',token,data:{studentId:student.studentId,events:[event()]}});assert.equal(denied.status,403);
  }finally{h.DB.close();}
});
test('first-try measurement persists through retries, reveals, grade changes, and portable saves',()=>{
  const s=fresh();s.classroom={classId:crypto.randomUUID(),studentId:crypto.randomUUID(),token,className:'Grade 3'};
  submitAnswer(s,'nope');assert.equal(s.reporting,undefined);
  submitAnswer(s,'-99999');submitAnswer(s,'-99999');solve(s);nextQuestion(s);showAnswer(s);nextQuestion(s);solve(s);
  assert.equal(s.reporting.skills.division.count,3);assert.equal(s.reporting.skills.division.correct,1);assert.equal(s.reporting.pending.length,3);
  const restored=readSave(makeSave({name:'Alex',seed:'alex'},s)).state;assert.deepEqual(restored.reporting,s.reporting);assert.deepEqual(restored.classroom,s.classroom);
  solve(restored);assert.equal(restored.reporting.pending.length,3);
  setGrade(restored,4);assert.equal(restored.reporting.skills.division.count,3);assert.equal(restored.reporting.pending.filter(e=>e.correct===null).length,16);
  const old=fresh();old.correct=120;old.stats.division=30;assert.equal(baselineReport(old).skills.division.count,0,'Never invent historical accuracy');
});
test('practice suggestions need evidence and identify a weak operation even with strong overall scores',()=>{
  const s={name:'Alex',lastSeen:Date.now(),skills:baselineReport(fresh()).skills};
  assert.equal(topicSummary(s,'division').status,'sample');
  s.skills.division={band:1,count:4,correct:0,recent:[0,0,0,0]};assert.equal(topicSummary(s,'division').status,'sample');
  s.skills.division={band:1,count:5,correct:2,recent:[0,0,1,0,1]};assert.equal(topicSummary(s,'division').status,'practice');
  s.skills['fractions:add']={band:4,count:100,correct:95,recent:Array(10).fill(1)};
  s.skills['fractions:divide']={band:1,count:5,correct:1,recent:[0,0,1,0,0]};
  const fraction=topicSummary(s,'fractions');assert.equal(fraction.status,'practice');assert.deepEqual(fraction.specific,['÷']);assert.ok(fraction.accuracy>.9);assert.equal(fraction.level,'2–5');
  assert.equal(practiceTopics(s).length,2);assert.ok(csvReport([{...s,name:'=formula'}]).includes("'=formula"));
});
test('client retries keep queued answers until acknowledgement, and failed joins reuse their baseline',async()=>{
  const previousFetch=globalThis.fetch,previousLocation=globalThis.location;globalThis.location={origin,hostname:'class.test'};
  try{
    const s=fresh(),e=event();s.classroom={classId:crypto.randomUUID(),studentId:crypto.randomUUID(),token,className:'Grade 3'};s.reporting={version:1,startedAt:Date.now(),skills:{},pending:[e]};
    globalThis.fetch=async()=>{throw Error('offline');};await syncClass(s,()=>{});assert.equal(s.reporting.pending.length,1);
    globalThis.fetch=async()=>new Response(JSON.stringify({accepted:[e.id]}));await syncClass(s,()=>{});assert.equal(s.reporting.pending.length,0);
    const joining=fresh();globalThis.fetch=async()=>{throw Error('lost response');};await assert.rejects(()=>joinClass(joining,'ABCDEFGHJK','Alex',()=>{}));const draft=structuredClone(joining.joinDraft);
    solve(joining);assert.equal(joining.reporting.pending.length,1);
    globalThis.fetch=async(_url,options)=>{assert.deepEqual(JSON.parse(options.body),draft);return new Response(JSON.stringify({student:{classId:crypto.randomUUID(),studentId:crypto.randomUUID(),className:'Grade 3'}}));};
    await joinClass(joining,'ABCDEFGHJK','Alex',()=>{});assert.equal(joining.classroom.token,draft.token);assert.equal(joining.reporting.pending.length,1);
  }finally{globalThis.fetch=previousFetch;globalThis.location=previousLocation;}
});
