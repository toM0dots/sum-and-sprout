import {SKILL_KEYS,skillKey,createLearning} from './learning.js';
export const REPORT_KEYS=[...SKILL_KEYS,'decimals','fractions'];
export function prepareReporting(state){return state.reporting??={version:1,startedAt:Date.now(),skills:{},pending:[]};}
export function recordMeasurement(state,q,correct){
  const r=prepareReporting(state),key=skillKey(q),at=Date.now();
  const skill=r.skills[key]??={count:0,correct:0,recent:[],lastAt:0};
  skill.count++;skill.correct+=Number(correct);skill.recent=[...skill.recent,Number(correct)].slice(-10);skill.lastAt=at;
  if(state.classroom||state.joinDraft){
    const band=state.learning?.skills[key]?.band??q.band??(q.grade?q.grade-1+q.challenge:[0,2,4][q.level]);
    r.pending.push({id:crypto.randomUUID(),skill:key,correct:Number(correct),level:band,at});
  }
}
export function recordLevelReset(state){
  if(!state.classroom&&!state.joinDraft)return;
  const r=prepareReporting(state),at=Date.now();
  for(const skill of SKILL_KEYS)r.pending.push({id:crypto.randomUUID(),skill,correct:null,level:state.learning.base,at});
}
export function baselineReport(state){
  const learning=state.learning??createLearning(state.correct,state.grade),r=state.reporting;
  return {startedAt:r?.startedAt??Date.now(),skills:Object.fromEntries(REPORT_KEYS.map(key=>[key,{
    count:r?.skills[key]?.count??0,correct:r?.skills[key]?.correct??0,recent:r?.skills[key]?.recent??[],
    lastAt:r?.skills[key]?.lastAt??0,band:learning.skills[key]?.band??learning.base
  }]))};
}
export function cleanReporting(value){
  if(!value||value.version!==1||!value.skills||!Array.isArray(value.pending)||value.pending.length>5000)throw Error('Invalid learning report.');
  const integer=(v,max=1e12)=>{if(!Number.isInteger(v)||v<0||v>max)throw Error('Invalid learning report.');return v;};
  const skills={};
  for(const key of REPORT_KEYS){if(!Object.hasOwn(value.skills,key))continue;const s=value.skills[key];
    const count=integer(s.count),correct=integer(s.correct,count);
    if(!Array.isArray(s.recent)||s.recent.length>10||s.recent.length>count||s.recent.some(v=>v!==0&&v!==1))throw Error('Invalid learning report.');
    skills[key]={count,correct,recent:[...s.recent],lastAt:integer(s.lastAt,8640000000000000)};
  }
  return {version:1,startedAt:integer(value.startedAt,8640000000000000),skills,pending:value.pending.map(e=>{
    if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(e.id)||!REPORT_KEYS.includes(e.skill)||(e.correct!==null&&e.correct!==0&&e.correct!==1))throw Error('Invalid learning report.');
    return {id:e.id,skill:e.skill,correct:e.correct,level:integer(e.level,7),at:integer(e.at,8640000000000000)};
  })};
}
export function cleanClassroom(value){
  if(!value||typeof value.token!=='string'||!/^[a-f0-9]{64}$/.test(value.token)||typeof value.studentId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(value.studentId)||typeof value.classId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(value.classId)||typeof value.className!=='string'||value.className.length>60)throw Error('Invalid class connection.');
  return {token:value.token,studentId:value.studentId,classId:value.classId,className:value.className};
}
