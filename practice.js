import {topics,levels,generate,seededRandom,matches,parseAnswer} from './math.js';

import {isGrade,CHALLENGES,gradeRewardLevel,generateGrade} from './grades.js';

export const LEVEL_THRESHOLDS=[0,10,30];
export function levelForCorrect(correct){
  const n=Number.isFinite(correct)?Math.max(0,Math.floor(correct)):0;
  return n>=30?2:n>=10?1:0;
}
export function levelProgress(correct,grade=null){
  const step=levelForCorrect(correct),total=Math.max(0,Number(correct)||0),graded=isGrade(grade);
  const level=graded?gradeRewardLevel(grade,step):step;
  return {level,step,total,label:graded?`Grade ${grade} · ${CHALLENGES[step]}`:levels[level].label,
    nextLabel:graded?CHALLENGES[step+1]:levels[step+1]?.label,
    next:LEVEL_THRESHOLDS[step+1]??null,remaining:Math.max(0,(LEVEL_THRESHOLDS[step+1]??total)-total)};
}
export function questionLabel(q){return isGrade(q.grade)?`Grade ${q.grade} · ${CHALLENGES[q.challenge]}`:levels[q.level].label;}
export function setGrade(state,grade){
  if(!isGrade(grade))throw new Error('Choose a grade from 1 to 6.');
  if(state.grade===grade)return;
  state.grade=grade;
  // An explicit setting change refreshes only an unanswered question, never a rewarded one.
  const s=state.session;
  if(s&&!s.finished&&!s.resolved){s.questions[s.index]=null;s.hint=false;ensureQuestion(s,state.correct,grade);}
}
export function prepareSession(state){
  const s=state.session;if(!s||s.finished)return;
  // Keep an already shown question and its reward when upgrading an older save.
  if(!s.adaptive){
    if(s.kind==='daily'){s.seed??=`legacy:${s.dailyKey}`;s.topicOrder??=s.questions.map((q,i)=>q?.topic||topics[i%topics.length][0]);}
    s.adaptive=true;
    for(let i=s.index+1;i<s.questions.length;i++)s.questions[i]=null;
  }
  ensureQuestion(s,state.correct,state.grade);
}
export function ensureQuestion(session,correct,grade=null){
  if(session.finished)return;
  const i=session.index;
  if(session.questions[i])return session.questions[i];
  const level=levelForCorrect(correct);
  const random=session.kind==='daily'?seededRandom(`${session.seed}:${i}:${level}${isGrade(grade)?`:grade-${grade}`:''}`):Math.random;
  const topic=session.topic==='mixed'?(session.kind==='daily'?session.topicOrder[i]:topics[Math.floor(random()*topics.length)][0]):session.topic;
  const q=isGrade(grade)?generateGrade(topic,grade,level,random):generate(topic,level,random);
  session.questions[i]=q;session.level=level;
  return q;
}
export function createPractice(topic,correct,grade=null){
  if(topic!=='mixed'&&!topics.some(t=>t[0]===topic))throw new Error('Unknown topic');
  const session={kind:'practice',adaptive:true,topic,questions:Array(5).fill(null),index:0,earned:0,solved:0,resolved:false,finished:false,hint:false};
  ensureQuestion(session,correct,grade);return session;
}
export function createDaily(seed,day,correct,grade=null){
  const random=seededRandom(`${seed}:${day}:order`),topicOrder=topics.map(t=>t[0]);
  for(let i=topicOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[topicOrder[i],topicOrder[j]]=[topicOrder[j],topicOrder[i]];}
  const session={kind:'daily',adaptive:true,dailyKey:`${day}:auto`,seed:`${seed}:${day}`,topicOrder,topic:'mixed',questions:Array(10).fill(null),index:0,earned:0,solved:0,resolved:false,finished:false,hint:false};
  ensureQuestion(session,correct,grade);return session;
}
export function submitAnswer(state,value){
  const s=state.session;if(!s||s.resolved||s.finished)return {status:'ignored'};
  if(!Number.isFinite(parseAnswer(value)))return {status:'invalid'};
  const q=ensureQuestion(s,state.correct,state.grade);state.attempts++;
  if(!matches(value,q.answer)){state.streak=0;return {status:'wrong'};}
  const reward=levels[q.level].reward,previousLevel=levelForCorrect(state.correct);
  state.credits+=reward;state.earned+=reward;state.correct++;state.streak++;
  state.best=Math.max(state.best,state.streak);state.stats[q.topic]=(state.stats[q.topic]||0)+1;
  s.earned+=reward;s.solved++;s.resolved=true;s.result='correct';
  return {status:'correct',reward,levelUp:levelForCorrect(state.correct)>previousLevel};
}
export function showAnswer(state){
  const s=state.session;if(!s||s.resolved||s.finished)return false;
  s.resolved=true;s.result='revealed';state.streak=0;return true;
}
export function nextQuestion(state){
  const s=state.session;if(!s||!s.resolved||s.finished)return false;
  if(s.index===s.questions.length-1){s.finished=true;return true;}
  s.index++;s.resolved=false;s.hint=false;s.result=null;
  ensureQuestion(s,state.correct,state.grade);return true;
}
