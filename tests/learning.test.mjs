import test from 'node:test';
import assert from 'node:assert/strict';
import {createLearning,prepareLearning} from '../learning.js';
import {createPractice,createDaily,prepareSession,submitAnswer,showAnswer,nextQuestion,setGrade,setOperation,questionLabel} from '../practice.js';
import {makeSave,readSave} from '../saves.js';
import {archiveDaily} from '../players.js';

const player={name:'Learner',seed:'learner',id:'learner'};
function state(grade=3,topic='division',operation='mixed'){
  const s={grade,credits:0,earned:0,correct:0,attempts:0,streak:0,best:0,stats:{},pet:'fox',care:{fox:65},food:{apple:1},owned:[],wear:{}};
  prepareLearning(s);s.session=createPractice(topic,0,grade,operation,s.learning);return s;
}
const q=s=>s.session.questions[s.session.index];
const solve=s=>submitAnswer(s,q(s).display);
function advance(s){
  nextQuestion(s);
  if(s.session.finished)s.session=createPractice(s.session.topic,s.correct,s.grade,s.session.operation,s.learning);
}
function miss(s){submitAnswer(s,'-999999999');showAnswer(s);advance(s);}

test('three first-try successes raise one step and two missed questions lower one step',()=>{
  const s=state();
  for(let i=0;i<3;i++){
    assert.equal(q(s).band,2);const old=q(s);const result=solve(s);
    assert.equal(result.levelUp,i===2);assert.equal(q(s),old);assert.equal(result.reward,10);
    advance(s);
  }
  assert.equal(q(s).band,3);assert.equal(questionLabel(q(s)),'Level 4');
  miss(s);assert.equal(q(s).band,3);miss(s);assert.equal(q(s).band,2);
  assert.equal(s.grade,3);assert.equal(s.correct,3);assert.equal(s.credits,30);
});
test('opposite outcomes reset the relevant streak; retries and reveals assess a question only once',()=>{
  let s=state();solve(s);advance(s);solve(s);advance(s);
  assert.equal(s.learning.skills.division.right,2);
  assert.equal(submitAnswer(s,'oops').status,'invalid');assert.equal(s.learning.skills.division.right,2);
  for(let i=0;i<10;i++)submitAnswer(s,'-999999999');
  assert.deepEqual(s.learning.skills.division,{band:2,right:0,wrong:1});
  s=readSave(makeSave(player,s)).state;prepareSession(s);
  submitAnswer(s,'-999999999');assert.equal(s.learning.skills.division.wrong,1);
  solve(s);assert.equal(s.learning.skills.division.wrong,1);advance(s);
  solve(s);assert.deepEqual(s.learning.skills.division,{band:2,right:1,wrong:0});advance(s);
  showAnswer(s);assert.deepEqual(s.learning.skills.division,{band:2,right:0,wrong:1});
  showAnswer(s);assert.equal(s.learning.skills.division.wrong,1);advance(s);
  miss(s);assert.equal(q(s).band,1);
});
test('skills, operations, and players adapt independently and persist across rounds',()=>{
  const s=state(3,'decimals','divide'),other=state(3,'decimals','divide');
  for(let i=0;i<6;i++){solve(s);advance(s);}
  assert.equal(q(s).band,4);assert.equal(q(other).band,2);
  setOperation(s,'multiply');assert.equal(q(s).band,2);
  miss(s);miss(s);assert.equal(q(s).band,1);
  setOperation(s,'divide');assert.equal(q(s).band,4);
  s.session=createPractice('addition',s.correct,s.grade,'mixed',s.learning);assert.equal(q(s).band,2);
  assert.equal(s.correct,6);
});
test('difficulty remains bounded, can fall below the starting grade, and changes without erasing rewards',()=>{
  const s=state(6);
  for(let i=0;i<14;i++)miss(s);
  assert.equal(q(s).band,0);assert.equal(s.grade,6);assert.equal(s.correct,0);assert.equal(s.credits,0);
  for(let i=0;i<27;i++){solve(s);advance(s);}
  assert.equal(q(s).band,7);assert.equal(s.correct,27);assert.ok(s.credits>0);
  const credits=s.credits;setGrade(s,2);assert.equal(q(s).band,1);assert.equal(s.credits,credits);
  assert.deepEqual(s.learning.skills.division,{band:1,right:0,wrong:0});
});
test('save export/import keeps learning streaks, missed attempts and pending adjustments',()=>{
  let s=state(3,'fractions','divide');miss(s);
  submitAnswer(s,'-999999999');assert.equal(s.session.difficultyChange,-1);
  const original=structuredClone(s);s=readSave(makeSave(player,s)).state;
  assert.deepEqual(s.learning,original.learning);assert.deepEqual(q(s),q(original));
  assert.equal(s.session.assessed,true);assert.equal(s.session.difficultyChange,-1);
  prepareSession(s);submitAnswer(s,'-999999999');assert.equal(s.learning.skills['fractions:divide'].band,1);
  showAnswer(s);advance(s);assert.equal(q(s).band,1);
  for(let i=0;i<2;i++){solve(s);advance(s);}
  s=readSave(makeSave(player,s)).state;assert.equal(s.learning.skills['fractions:divide'].right,2);
  solve(s);advance(s);assert.equal(q(s).band,2);
  const data=JSON.parse(makeSave(player,s));
  for(const mutate of [d=>d.state.learning.base=8,d=>d.state.learning.skills['fractions:divide'].band=-1,d=>d.state.learning.skills['fractions:divide'].right=3,d=>d.state.session.assessed='yes']){
    const bad=structuredClone(data);mutate(bad);assert.throws(()=>readSave(JSON.stringify(bad)));
  }
});
test('legacy saves keep the current question and use total correct only during migration',()=>{
  const s=state(3),displayed=structuredClone(q(s));delete s.learning;delete q(s).band;
  s.correct=30;s.credits=123;const oldQuestion=structuredClone(q(s));prepareSession(s);
  assert.deepEqual(q(s),oldQuestion);assert.equal(s.learning.base,4);assert.equal(s.credits,123);
  solve(s);advance(s);assert.equal(q(s).band,4);assert.equal(s.learning.base,4);
  s.correct=100;prepareSession(s);assert.equal(s.learning.base,4);
  assert.equal(displayed.band,2);
});
test('daily results update the relevant skill, survive resuming, and cannot be rewarded twice',()=>{
  const s=state();s.learning=createLearning(0,3);
  s.learning.skills.division={band:2,right:2,wrong:0};
  s.session=createDaily('learner','2026-11-16',0,3,s.learning);
  assert.equal(s.session.dailyKey,createDaily('learner','2026-11-16',0,6).dailyKey);
  while(q(s).topic!=='division'){showAnswer(s);nextQuestion(s);}
  const current=q(s);solve(s);assert.equal(s.learning.skills.division.band,3);
  archiveDaily(s);s.session=null;s.session=s.daily['2026-11-16:auto'];prepareSession(s);
  assert.equal(q(s),current);const earned=s.credits;
  assert.equal(solve(s).status,'ignored');assert.equal(s.credits,earned);
  assert.equal(s.learning.skills.division.right,0);
});
