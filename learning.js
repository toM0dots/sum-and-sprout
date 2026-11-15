import {topics} from './math.js';
import {isGrade} from './grades.js';
import {hasOperations,OPERATION_IDS} from './operations.js';

export const SKILL_KEYS=topics.flatMap(([topic])=>hasOperations(topic)?OPERATION_IDS.map(op=>`${topic}:${op}`):[topic]);
export const skillKey=q=>hasOperations(q.topic)&&OPERATION_IDS.includes(q.operation)?`${q.topic}:${q.operation}`:q.topic;
export function createLearning(correct=0,grade=null){
  // Use lifetime progress only once, to keep the starting point of an older save.
  const oldStep=correct>=30?2:correct>=10?1:0;
  return {version:1,base:isGrade(grade)?grade-1+oldStep:[0,2,4][oldStep],skills:{}};
}
export function prepareLearning(state){return state.learning??=createLearning(state.correct,state.grade);}
export function learningSkill(learning,key){return learning.skills[key]??={band:learning.base,right:0,wrong:0};}
export function recordOutcome(state,q,correct){
  const learning=prepareLearning(state),key=skillKey(q);
  // Very old fraction/decimal questions lack an operation; preserve their rewards,
  // but do not guess which operation should change in response to them.
  if(!SKILL_KEYS.includes(key))return 0;
  const skill=learningSkill(learning,key),before=skill.band;
  if(correct){skill.right++;skill.wrong=0;}
  else{skill.wrong++;skill.right=0;}
  if(skill.right>=3){skill.band=Math.min(7,skill.band+1);skill.right=0;}
  if(skill.wrong>=2){skill.band=Math.max(0,skill.band-1);skill.wrong=0;}
  return Math.sign(skill.band-before);
}
