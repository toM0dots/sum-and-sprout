import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import {topics,generate} from '../math.js';
import {levelForCorrect,createPractice,createDaily,submitAnswer,showAnswer,nextQuestion,prepareSession} from '../practice.js';
import {readPlayers,playerKey,addPlayer,archiveDaily,dayKey} from '../players.js';
const state=(correct=0,topic='fractions')=>({correct,credits:0,earned:0,attempts:0,streak:0,best:0,stats:{},session:createPractice(topic,correct)});
const answer=s=>submitAnswer(s,s.session.questions[s.session.index].display);

test('each selected topic stays fixed through every difficulty and new round',()=>{
  for(const [topic] of topics)for(const count of [0,9,10,29,30,100]){
    const s=state(count,topic);
    for(let i=0;i<5;i++){assert.equal(s.session.questions[i].topic,topic);answer(s);nextQuestion(s);}
    assert.equal(s.session.finished,true);assert.equal(s.session.solved,5);
    s.session=createPractice(topic,s.correct);assert.equal(s.session.questions[0].topic,topic);
  }
});
test('lifetime milestones no longer force a level change; current rewards stay fixed',()=>{
  for(const count of [9,29]){
    const s=state(count,'addition'),first=s.session.questions[0];
    assert.deepEqual(answer(s),{status:'correct',reward:count===9?5:10,levelUp:false});
    prepareSession(s);assert.equal(s.session.questions[0],first);
    assert.equal(answer(s).status,'ignored');nextQuestion(s);
    assert.equal(s.session.questions[1].band,first.band);assert.equal(s.correct,count+1);
  }
});
test('wrong, invalid and revealed answers do not increase total correct or difficulty',()=>{
  const s=state(9);assert.equal(submitAnswer(s,'not a number').status,'invalid');assert.equal(s.attempts,0);
  assert.equal(submitAnswer(s,'-99999').status,'wrong');assert.equal(s.correct,9);assert.equal(nextQuestion(s),false);
  showAnswer(s);assert.equal(s.correct,9);assert.equal(s.credits,0);nextQuestion(s);assert.equal(s.session.questions[1].level,0);
});
test('legacy progress is preserved while unshown questions become adaptive',()=>{
  const s=state(10,'fractions');s.session={topic:'fractions',level:2,questions:Array.from({length:5},()=>generate('fractions',2)),index:1,earned:20,solved:1,resolved:false};
  const current=s.session.questions[1];prepareSession(s);assert.equal(s.session.questions[1],current);assert.equal(s.session.questions[2],null);
  answer(s);nextQuestion(s);assert.equal(s.session.questions[2].level,1);assert.equal(s.session.questions[2].topic,'fractions');
});
test('daily challenges vary by player and day, retain shown questions, and cover all topics',()=>{
  const a=createDaily('student-a','2026-11-15',9);
  assert.deepEqual(a,createDaily('student-a','2026-11-15',9));
  assert.notDeepEqual(a,createDaily('student-b','2026-11-15',9));assert.notDeepEqual(a,createDaily('student-a','2026-11-16',9));
  const s=state(9);s.session=a;const first=a.questions[0];answer(s);prepareSession(s);assert.equal(a.questions[0],first);
  archiveDaily(s);s.session=null;s.session=s.daily['2026-11-15:auto'];nextQuestion(s);assert.equal(s.session.questions[1].level,0);
  for(let i=1;i<10;i++){answer(s);nextQuestion(s);}assert.equal(s.session.finished,true);
  assert.deepEqual(s.session.questions.map(q=>q.topic).sort(),topics.map(t=>t[0]).sort());
  const earned=s.credits;assert.equal(answer(s).status,'ignored');assert.equal(s.credits,earned);
});
test('player migration preserves the old game key and assigns a unique daily seed',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const first=readPlayers(storage,()=> 'seed-a');assert.equal(playerKey(first[0].id),'sum-sprout-v1');assert.equal(first[0].seed,'seed-a');
  assert.deepEqual(readPlayers(storage,()=> 'seed-b'),first);
  const players=addPlayer(first,' Alex ','new-id');assert.equal(players[1].seed,'new-id');assert.equal(players[1].name,'Alex');
  assert.notEqual(playerKey(players[0].id),playerKey(players[1].id));assert.throws(()=>addPlayer(players,'alex','another'));
});
test('progress bounds and local calendar rollover are correct',()=>{
  assert.deepEqual([-1,0,9,10,29,30,99].map(levelForCorrect),[0,0,0,1,1,2,2]);
  assert.equal(dayKey(new Date(2026,10,15,23,59,59)),'2026-11-15');assert.equal(dayKey(new Date(2026,10,16,0,0,0)),'2026-11-16');
});
test('published game contains no API calls or credentials',()=>{
  for(const file of readdirSync(new URL('../',import.meta.url)).filter(file=>/\.(js|html)$/.test(file))){
    assert.ok(!file.startsWith('.'));if(!/\.(js|html)$/.test(file))continue;
    assert.doesNotMatch(readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),/api\.openai\.com|\/api\/daily|OPENAI_API_KEY|sk-proj-|\bfetch\s*\(/);
  }
});
