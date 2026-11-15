import {topics} from './math.js';
import {PLAYERS_KEY,playerKey} from './players.js';

export const MAX_SAVE_BYTES=500000;
const pets=['fox','bunny','cat','bear'];
const clothes=['scarf','bow','hat','sweater','crown'];
const topicIds=topics.map(t=>t[0]);
const invalid=()=>{throw new Error('That isn’t a game save. Choose a Sum & Sprout save.');};
const object=v=>{if(!v||typeof v!=='object'||Array.isArray(v))invalid();return v;};
const number=(v,max=1e12)=>{if(!Number.isFinite(v)||v<0||v>max)invalid();return v;};
const count=(v,max=1e12)=>{number(v,max);if(!Number.isInteger(v))invalid();return v;};
const text=(v,max=2000)=>{if(typeof v!=='string'||v.length>max)invalid();return v;};
const choice=(v,choices)=>{if(!choices.includes(v))invalid();return v;};
const flag=v=>{if(typeof v!=='boolean')invalid();return v;};
const dateKey=v=>{text(v,20);if(!/^\d{4}-\d{2}-\d{2}:(auto|[012])$/.test(v))invalid();return v;};
function dictionary(value,keys,read){
  const result={};object(value);
  for(const key of keys)if(Object.hasOwn(value,key))result[key]=read(value[key]);
  return result;
}
function question(q){
  object(q);
  if(!Number.isFinite(q.answer)||Math.abs(q.answer)>1e12)invalid();
  return {topic:choice(q.topic,topicIds),level:count(q.level,2),prompt:text(q.prompt),answer:q.answer,
    display:text(String(q.display),200),hint:text(q.hint),explanation:text(q.explanation),caption:text(q.caption??'')};
}
function session(s){
  if(s==null)return null;object(s);
  const kind=choice(s.kind??'practice',['practice','daily']);
  if(!Array.isArray(s.questions)||s.questions.length!==(kind==='daily'?10:5))invalid();
  const index=count(s.index,s.questions.length-1);
  if(s.questions.slice(0,index+1).some(q=>q==null))invalid();
  const result={kind,adaptive:flag(s.adaptive??false),topic:choice(s.topic,[...topicIds,'mixed']),
    questions:s.questions.map(q=>q==null?null:question(q)),index,earned:count(s.earned,200),solved:count(s.solved,s.questions.length),
    resolved:flag(s.resolved),finished:flag(s.finished),hint:flag(s.hint)};
  if(s.level!==undefined)result.level=count(s.level,2);
  if(s.result!=null)result.result=choice(s.result,['correct','revealed']);
  else result.result=null;
  if(result.resolved&&!result.result)invalid();
  if(result.finished&&(!result.resolved||index!==s.questions.length-1))invalid();
  if(kind==='daily'){
    result.dailyKey=dateKey(s.dailyKey);
    result.seed=text(s.seed??`legacy:${s.dailyKey}`,180);
    result.topicOrder=s.topicOrder??s.questions.map((q,i)=>q?.topic||topicIds[i]);
    if(!Array.isArray(result.topicOrder)||result.topicOrder.length!==10)invalid();
    result.topicOrder=result.topicOrder.map(t=>choice(t,topicIds));
  }
  return result;
}
function cleanState(value){
  const s=object(value),result={};
  for(const key of ['credits','earned','correct','attempts','streak','best'])result[key]=count(s[key]);
  result.pet=choice(s.pet,pets);
  result.care=dictionary(s.care,pets,v=>number(v,100));
  result.happiness=dictionary(s.happiness??{},pets,v=>number(v,100));
  result.food=dictionary(s.food,['apple','carrot','berries'],count);
  if(!Array.isArray(s.owned)||s.owned.length>clothes.length)invalid();
  result.owned=[...new Set(s.owned.map(v=>choice(v,clothes)))];
  result.wear=dictionary(s.wear,pets,v=>v==null?null:choice(v,result.owned));
  result.stats=dictionary(s.stats,topicIds,count);
  result.session=session(s.session);
  result.daily={};
  const daily=object(s.daily??{}),days=Object.keys(daily);
  if(days.length>21)invalid();
  for(const day of days){
    dateKey(day);const saved=session(daily[day]);
    if(saved?.kind!=='daily'||saved.dailyKey!==day)invalid();
    result.daily[day]=saved;
  }
  if(s.needsUpdatedAt!==undefined)result.needsUpdatedAt=number(s.needsUpdatedAt,8640000000000000);
  result.joyAt=dictionary(s.joyAt??{},pets.flatMap(p=>['pet','tap','ball'].map(k=>`${p}:${k}`)),v=>number(v,8640000000000000));
  return result;
}
export function makeSave(player,state,now=new Date()){
  return JSON.stringify({format:'sum-and-sprout-save',version:1,savedAt:now.toISOString(),
    player:{name:player.name,seed:player.seed||player.id},state:cleanState(state)},null,2);
}
export function readSave(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_SAVE_BYTES)invalid();
  let data;try{data=JSON.parse(raw);}catch{invalid();}
  object(data);
  if(data.format!=='sum-and-sprout-save')invalid();
  if(data.version!==1)throw new Error('This save needs a newer game version.');
  const p=object(data.player),name=text(p.name,24).trim(),seed=text(p.seed,128);
  if(!name||!seed)invalid();
  return {player:{name,seed},state:cleanState(data.state)};
}
export function importSave(storage,players,backup,id){
  if(players.length>=40)throw new Error('This device has 40 players already.');
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||id==='original'||players.some(p=>p.id===id)||storage.getItem(playerKey(id))!==null)throw new Error('Please try loading again.');
  let name=backup.player.name,n=2;
  while(players.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase())){
    const suffix=` (${n++})`;name=backup.player.name.slice(0,24-suffix.length)+suffix;
  }
  const player={id,name,seed:backup.player.seed},next=[...players,player],key=playerKey(id);
  // Store the new save first. If the player list cannot be saved, undo only this new key.
  try{
    storage.setItem(key,JSON.stringify(backup.state));
    storage.setItem(PLAYERS_KEY,JSON.stringify(next));
  }catch{
    try{storage.removeItem(key);}catch{}
    throw new Error('Couldn’t save here. Try freeing some device space.');
  }
  return {players:next,player};
}
export function saveFilename(name,day){
  return `sum-sprout-${name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,24)||'player'}-${day}.json`;
}
