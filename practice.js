import {recordMeasurement,recordLevelReset} from './reporting.js';
import {createLearning,prepareLearning,learningSkill,skillKey,recordOutcome} from './learning.js';
import {hasOperations,validOperation,OPERATION_IDS} from './operations.js';
import {topics,levels,seededRandom,matches,parseAnswer} from './math.js';

import {isGrade,CHALLENGES,generateGrade} from './grades.js';

export function levelForCorrect(correct){
  const n=Number.isFinite(correct)?Math.max(0,Math.floor(correct)):0;
  return n>=30?2:n>=10?1:0;
}
export function questionLabel(q){if(Number.isInteger(q.band))return `Level ${q.band+1}`;return isGrade(q.grade)?`Grade ${q.grade} · ${CHALLENGES[q.challenge]}`:levels[q.level].label;}
export function setGrade(state,grade){
  if(!isGrade(grade))throw new Error('Choose a grade from 1 to 6.');
  if(state.grade===grade)return;
  state.grade=grade;state.learning=createLearning(0,grade);recordLevelReset(state);
  // An explicit setting change refreshes only an unanswered question, never a rewarded one.
  const s=state.session;
  if(s&&!s.finished&&!s.resolved){s.questions[s.index]=null;resetAssessment(s);ensureQuestion(s,state.correct,grade,state.learning);}
}
export function setOperation(state,operation){
  const s=state.session;
  if(!s||s.kind!=='practice'||s.finished||!hasOperations(s.topic)||!validOperation(operation))return false;
  if((s.operation||'mixed')===operation)return false;
  s.operation=operation;
  if(!s.resolved){s.questions[s.index]=null;resetAssessment(s);ensureQuestion(s,state.correct,state.grade,prepareLearning(state));}
  return true;
}
function resetAssessment(s){s.hint=false;s.assessed=false;s.difficultyChange=0;}
export function prepareSession(state){
  prepareLearning(state);
  const s=state.session;if(!s||s.finished)return;
  // Keep an already shown question and its reward when upgrading an older save.
  if(!s.adaptive){
    if(s.kind==='daily'){s.seed??=`legacy:${s.dailyKey}`;s.topicOrder??=s.questions.map((q,i)=>q?.topic||topics[i%topics.length][0]);}
    s.adaptive=true;
    for(let i=s.index+1;i<s.questions.length;i++)s.questions[i]=null;
  }
  ensureQuestion(s,state.correct,state.grade,state.learning);
}
export function ensureQuestion(session,correct,grade=null,learning=createLearning(correct,grade)){
  if(session.finished)return;
  const i=session.index;
  if(session.questions[i])return session.questions[i];
  const level=levelForCorrect(correct);
  const random=session.kind==='daily'?seededRandom(`${session.seed}:${i}:${level}${isGrade(grade)?`:grade-${grade}`:''}`):Math.random;
  const topic=session.topic==='mixed'?(session.kind==='daily'?session.topicOrder[i]:topics[Math.floor(random()*topics.length)][0]):session.topic;
  let operation=hasOperations(topic)&&session.kind==='practice'&&session.topic!=='mixed'
    ?(session.operation&&session.operation!=='mixed'?session.operation:OPERATION_IDS[i%OPERATION_IDS.length]):'mixed';
  if(hasOperations(topic)&&operation==='mixed')operation=OPERATION_IDS[Math.floor(random()*OPERATION_IDS.length)];
  const band=learningSkill(learning,skillKey({topic,operation})).band;
  let q;
  for(let attempt=0;attempt<16;attempt++){
    q={...generateGrade(topic,Math.min(6,band+1),Math.max(0,band-5),random,operation),band};
    if(!session.questions.some(previous=>previous?.topic===q.topic&&previous.prompt===q.prompt))break;
  }
  session.questions[i]=q;session.level=q.level;
  return q;
}
export function createPractice(topic,correct,grade=null,operation='mixed',learning=createLearning(correct,grade)){
  if(!validOperation(operation))throw new Error('Unknown operation');
  if(topic!=='mixed'&&!topics.some(t=>t[0]===topic))throw new Error('Unknown topic');
  const session={kind:'practice',adaptive:true,topic,operation,questions:Array(5).fill(null),index:0,earned:0,solved:0,resolved:false,finished:false,hint:false};
  ensureQuestion(session,correct,grade,learning);return session;
}
export function createDaily(seed,day,correct,grade=null,learning=createLearning(correct,grade)){
  const random=seededRandom(`${seed}:${day}:order`),topicOrder=topics.map(t=>t[0]);
  for(let i=topicOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[topicOrder[i],topicOrder[j]]=[topicOrder[j],topicOrder[i]];}
  const session={kind:'daily',adaptive:true,dailyKey:`${day}:auto`,seed:`${seed}:${day}`,topicOrder,topic:'mixed',questions:Array(10).fill(null),index:0,earned:0,solved:0,resolved:false,finished:false,hint:false};
  ensureQuestion(session,correct,grade,learning);return session;
}
export function submitAnswer(state,value){
  const s=state.session;if(!s||s.resolved||s.finished)return {status:'ignored'};
  if(!Number.isFinite(parseAnswer(value)))return {status:'invalid'};
  const q=ensureQuestion(s,state.correct,state.grade,prepareLearning(state));state.attempts++;
  const correct=matches(value,q.answer);
  if(!s.assessed){s.difficultyChange=recordOutcome(state,q,correct);recordMeasurement(state,q,correct);s.assessed=true;}
  if(!correct){state.streak=0;return {status:'wrong'};}
  const reward=levels[q.level].reward;
  state.credits+=reward;state.earned+=reward;state.correct++;state.streak++;
  state.best=Math.max(state.best,state.streak);state.stats[q.topic]=(state.stats[q.topic]||0)+1;
  s.earned+=reward;s.solved++;s.resolved=true;s.result='correct';
  return {status:'correct',reward,levelUp:s.difficultyChange===1};
}
export function showAnswer(state){
  const s=state.session;if(!s||s.resolved||s.finished)return false;
  if(!s.assessed){const q=ensureQuestion(s,state.correct,state.grade,prepareLearning(state));s.difficultyChange=recordOutcome(state,q,false);recordMeasurement(state,q,false);s.assessed=true;}
  s.resolved=true;s.result='revealed';state.streak=0;return true;
}
export function nextQuestion(state){
  const s=state.session;if(!s||!s.resolved||s.finished)return false;
  if(s.index===s.questions.length-1){s.finished=true;return true;}
  s.index++;s.resolved=false;s.result=null;resetAssessment(s);prepareLearning(state);
  ensureQuestion(s,state.correct,state.grade,state.learning);return true;
}
