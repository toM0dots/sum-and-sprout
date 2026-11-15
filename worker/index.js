const TOPICS=['addition','subtraction','multiplication','division','decimals','fractions','percentage','ratios','tricks','equations'];
const KEYS=TOPICS.flatMap(t=>['decimals','fractions'].includes(t)?['add','subtract','multiply','divide'].map(op=>`${t}:${op}`):[t]).concat(['decimals','fractions']);
const GITHUB_ORIGIN='https://tom0dots.github.io';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail('Check the details and try again.');return v.trim();};
const integer=(v,max=1e12)=>{if(!Number.isInteger(v)||v<0||v>max)fail('Invalid progress data.');return v;};
const tokenValid=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Use JSON.',415);
  if(Number(request.headers.get('Content-Length'))>100000)fail('Too much data.',413);
  const raw=await request.text();if(raw.length>100000)fail('Too much data.',413);
  try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid data.');return value;}catch{fail('Invalid data.');}
}
function cleanBaseline(raw){
  if(!raw||!raw.skills||typeof raw.skills!=='object')fail('Invalid progress data.');
  const skills={};
  for(const key of KEYS){const s=raw.skills[key];if(!s)continue;
    const count=integer(s.count),correct=integer(s.correct,count);
    if(!Array.isArray(s.recent)||s.recent.length>Math.min(10,count)||s.recent.some(v=>v!==0&&v!==1))fail('Invalid recent answers.');
    skills[key]={count,correct,recent:s.recent,lastAt:integer(s.lastAt,8640000000000000),band:integer(s.band,7)};
  }
  return {startedAt:integer(raw.startedAt,8640000000000000),skills};
}
function cleanEvents(values){
  if(!Array.isArray(values)||!values.length||values.length>50)fail('Send up to 50 answers at once.');
  const ids=new Set();return values.map(e=>{
    if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(e.id)||!KEYS.includes(e.skill)||(e.correct!==0&&e.correct!==1&&e.correct!==null)||ids.has(e.id))fail('Invalid answer data.');
    ids.add(e.id);return {id:e.id,skill:e.skill,correct:e.correct,level:integer(e.level,7),at:integer(e.at,8640000000000000)};
  });
}
function identity(request){
  const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
  if(!id||!email)fail('Sign in to open your teacher dashboard.',401);
  return {id,email};
}
function teacherWrite(request){
  const u=identity(request);
  if(request.headers.get('Origin')!==new URL(request.url).origin)fail('Open the teacher dashboard to make changes.',403);
  return u;
}
function joinCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(10)),v=>alphabet[v%alphabet.length]).join('');}
async function ownedClass(db,id,owner){const c=await db.prepare('SELECT * FROM classes WHERE id = ? AND owner_id = ?').bind(id,owner).first();if(!c)fail('Class not found.',404);return c;}
async function studentsReport(db,classId){
  const queries=[
    db.prepare('SELECT id,name,baseline_json,created_at,updated_at FROM students WHERE class_id = ? ORDER BY name').bind(classId),
    db.prepare('SELECT e.student_id,e.skill,COUNT(*) AS count,SUM(e.correct) AS correct FROM events e JOIN students s ON s.id=e.student_id WHERE s.class_id=? AND e.correct IS NOT NULL GROUP BY e.student_id,e.skill').bind(classId),
    db.prepare('SELECT * FROM (SELECT e.student_id,e.skill,e.correct,e.seq,ROW_NUMBER() OVER (PARTITION BY e.student_id,e.skill ORDER BY e.seq DESC) AS rn FROM events e JOIN students s ON s.id=e.student_id WHERE s.class_id=? AND e.correct IS NOT NULL) WHERE rn<=10 ORDER BY seq').bind(classId),
    db.prepare('SELECT * FROM (SELECT e.student_id,e.skill,e.level,ROW_NUMBER() OVER (PARTITION BY e.student_id,e.skill ORDER BY e.seq DESC) AS rn FROM events e JOIN students s ON s.id=e.student_id WHERE s.class_id=?) WHERE rn=1').bind(classId)
  ];
  const [students,totals,recent,levels]=await db.batch(queries),map=new Map();
  for(const row of students.results){const baseline=JSON.parse(row.baseline_json);map.set(row.id,{id:row.id,name:row.name,joinedAt:row.created_at,lastSeen:row.updated_at,startedAt:baseline.startedAt,skills:baseline.skills});}
  for(const row of totals.results){const s=map.get(row.student_id).skills[row.skill]??={count:0,correct:0,recent:[],lastAt:0,band:0};s.count+=row.count;s.correct+=row.correct;}
  for(const row of recent.results){const s=map.get(row.student_id).skills[row.skill];s.recent=[...s.recent,row.correct].slice(-10);}
  for(const row of levels.results){const s=map.get(row.student_id).skills[row.skill]??={count:0,correct:0,recent:[],lastAt:0,band:row.level};s.band=row.level;}
  return [...map.values()];
}
export function createWorker(assets={}){return {async fetch(request,env){
  const url=new URL(request.url),path=url.pathname,origin=request.headers.get('Origin');
  const studentRoute=path.startsWith('/api/classroom/'),corsOrigin=origin===url.origin||origin===GITHUB_ORIGIN?origin:null;
  let response;
  try{
    if(studentRoute&&origin&&!corsOrigin)fail('This origin is not allowed.',403);
    if(request.method==='OPTIONS'){
      if(!studentRoute||!corsOrigin)fail('Not allowed.',403);
      response=new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'3600'}});
    }else if(path==='/api/teacher/me'&&request.method==='GET'){
      const user=identity(request);response=json({email:user.email});
    }else if(path==='/api/teacher/classes'&&request.method==='GET'){
      const user=identity(request);const rows=await env.DB.prepare('SELECT c.id,c.name,c.join_code AS code,c.open,c.created_at AS createdAt,COUNT(s.id) AS students FROM classes c LEFT JOIN students s ON s.class_id=c.id WHERE c.owner_id=? GROUP BY c.id ORDER BY c.created_at DESC').bind(user.id).all();response=json({classes:rows.results});
    }else if(path==='/api/teacher/classes'&&request.method==='POST'){
      const user=teacherWrite(request),data=await body(request),name=text(data.name,60);
      const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM classes WHERE owner_id=?').bind(user.id).first();if(count.n>=30)fail('You can have up to 30 classes.');
      const id=crypto.randomUUID(),code=joinCode(),now=Date.now();
      await env.DB.prepare('INSERT INTO classes (id,owner_id,name,join_code,open,created_at) VALUES (?,?,?,?,1,?)').bind(id,user.id,name,code,now).run();response=json({class:{id,name,code,open:1,createdAt:now,students:0}},201);
    }else if(/^\/api\/teacher\/classes\/[^/]+$/.test(path)&&request.method==='GET'){
      const user=identity(request),id=path.split('/').at(-1),c=await ownedClass(env.DB,id,user.id);
      response=json({class:{id:c.id,name:c.name,code:c.join_code,open:c.open},students:await studentsReport(env.DB,c.id),updatedAt:Date.now()});
    }else if(/^\/api\/teacher\/classes\/[^/]+$/.test(path)&&request.method==='PATCH'){
      const user=teacherWrite(request),id=path.split('/').at(-1),c=await ownedClass(env.DB,id,user.id),data=await body(request);
      if(typeof data.open!=='boolean')fail('Choose whether joining is open.');await env.DB.prepare('UPDATE classes SET open=? WHERE id=? AND owner_id=?').bind(Number(data.open),c.id,user.id).run();response=json({open:data.open});
    }else if(path==='/api/classroom/join'&&request.method==='POST'){
      const data=await body(request);if(!tokenValid(data.token))fail('Please try joining again.');
      const code=text(data.code,10),name=text(data.name,24),baseline=cleanBaseline(data.baseline),tokenHash=await hash(data.token);
      const c=await env.DB.prepare('SELECT * FROM classes WHERE join_code=?').bind(code).first();if(!c)fail('Class code not found. Check with your teacher.',404);
      const existing=await env.DB.prepare('SELECT id,class_id FROM students WHERE token_hash=?').bind(tokenHash).first();
      if(existing){if(existing.class_id!==c.id)fail('This connection belongs to another class.',409);response=json({student:{studentId:existing.id,classId:c.id,className:c.name}});}
      else{
        if(!c.open)fail('Joining is closed. Ask your teacher to open it.',403);
        const total=await env.DB.prepare('SELECT COUNT(*) AS n FROM students WHERE class_id=?').bind(c.id).first();if(total.n>=200)fail('This class is full. Ask your teacher.');
        const duplicate=await env.DB.prepare('SELECT id FROM students WHERE class_id=? AND lower(name)=lower(?)').bind(c.id,name).first();if(duplicate)fail('That nickname is already in this class. Use your saved game, or add an initial.',409);
        const id=crypto.randomUUID(),now=Date.now();await env.DB.prepare('INSERT INTO students (id,class_id,token_hash,name,baseline_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,c.id,tokenHash,name,JSON.stringify(baseline),now,now).run();
        response=json({student:{studentId:id,classId:c.id,className:c.name}},201);
      }
    }else if(path==='/api/classroom/sync'&&request.method==='POST'){
      const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!tokenValid(token))fail('Class connection not found.',401);
      const data=await body(request),events=cleanEvents(data.events),tokenHash=await hash(token);
      const student=await env.DB.prepare('SELECT id FROM students WHERE id=? AND token_hash=?').bind(text(data.studentId,64),tokenHash).first();if(!student)fail('Class connection not found.',401);
      const now=Date.now();
      const statements=events.map(e=>env.DB.prepare('INSERT INTO events (student_id,event_id,skill,correct,level,occurred_at,received_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(student_id,event_id) DO NOTHING').bind(student.id,e.id,e.skill,e.correct,e.level,e.at,now));
      statements.push(env.DB.prepare('UPDATE students SET updated_at=? WHERE id=?').bind(now,student.id));await env.DB.batch(statements);
      response=json({accepted:events.map(e=>e.id)});
    }else if(path.startsWith('/api/'))response=json({error:'Not found.'},404);
    else{
      const key=path==='/'?'index.html':path.replace(/^\//,'');const asset=assets[key];
      response=asset&&['GET','HEAD'].includes(request.method)?new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}}):new Response('Not found',{status:404});
    }
  }catch(error){response=json({error:error.status?error.message:'Something went wrong. Please try again.'},error.status??500);}
  if(studentRoute&&corsOrigin){response.headers.set('Access-Control-Allow-Origin',corsOrigin);response.headers.set('Vary','Origin');}
  return response;
}};}
export default createWorker(typeof STATIC_ASSETS==='undefined'?{}:STATIC_ASSETS);
