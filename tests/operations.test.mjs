import test from 'node:test';
import assert from 'node:assert/strict';
import {operationQuestion,OPERATION_IDS} from '../operations.js';
import {generateGrade} from '../grades.js';
import {seededRandom,matches} from '../math.js';
import {createPractice,createDaily,setOperation,setGrade,submitAnswer,nextQuestion,prepareSession} from '../practice.js';
import {makeSave,readSave} from '../saves.js';

const state=(grade=3,topic='decimals',operation='divide',correct=0)=>({grade,correct,credits:0,earned:0,attempts:correct,streak:0,best:0,stats:{},pet:'fox',care:{fox:65},food:{apple:1},owned:[],wear:{},session:createPractice(topic,correct,grade,operation)});
const solve=s=>submitAnswer(s,s.session.questions[s.session.index].display);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('6,400 decimal and fraction operations have independently calculated answers',()=>{
  const rng=seededRandom('all-operations');
  for(const topic of ['decimals','fractions'])for(let band=0;band<8;band++)for(const op of OPERATION_IDS)for(let i=0;i<100;i++){
    const q=operationQuestion(topic,band,op,rng),numbers=q.prompt.match(/\d+(?:\.\d+)?/g).map(Number);
    const terms=topic==='fractions'?numbers.filter((_,i)=>i%2===0).map((n,i)=>n/numbers[2*i+1]):numbers;
    const expected=terms.slice(1).reduce((a,b)=>op==='add'?a+b:op==='subtract'?a-b:op==='multiply'?a*b:a/b,terms[0]);
    close(q.answer,expected);assert.ok(matches(q.display,q.answer),q.prompt);assert.equal(q.operation,op);
    assert.ok(!q.prompt.includes('NaN'));assert.ok(!q.prompt.includes('Infinity'));
    if(topic==='decimals'&&op==='divide'){
      assert.ok(numbers[1]>0);assert.ok(!Number.isInteger(numbers[0]));
      assert.ok((q.display.split('.')[1]||'').length<=2,'Division answers terminate within two decimal places');
      if(band>=2)assert.ok(!Number.isInteger(numbers[1]),'Decimal divisors from Grade 3');
    }
  }
});
test('every operation is immediately available at every grade, including unselected legacy players',()=>{
  for(const grade of [null,1,2,3,4,5,6])for(const topic of ['decimals','fractions'])for(const op of OPERATION_IDS){
    const s=state(grade,topic,op);assert.equal(s.correct,0);
    for(let i=0;i<5;i++){
      assert.equal(s.session.questions[i].topic,topic);assert.equal(s.session.questions[i].operation,op);
      solve(s);nextQuestion(s);
    }
    assert.equal(s.session.finished,true);assert.equal(s.correct,5);
    const again=createPractice(topic,s.correct,grade,s.session.operation);assert.equal(again.questions[0].operation,op);
  }
});
test('Grade 3 starts with multiplication and division facts up to 12 without climbing levels',()=>{
  const rng=seededRandom('grade-three-facts');
  for(let i=0;i<100;i++){
    const multiply=generateGrade('multiplication',3,0,rng),[a,b]=multiply.prompt.match(/\d+/g).map(Number);
    assert.ok(a>=2&&a<=12&&b>=2&&b<=12);assert.equal(multiply.answer,a*b);
    const divide=generateGrade('division',3,0,rng),[n,d]=divide.prompt.match(/\d+/g).map(Number);
    assert.ok(d>=2&&d<=12);assert.ok(divide.answer>=2&&divide.answer<=12);assert.equal(n/d,divide.answer);
  }
});
test('mixed topic practice includes all four operations and dedicated division stays fixed through level-ups',()=>{
  for(const topic of ['decimals','fractions']){
    const s=state(3,topic,'mixed'),seen=new Set();
    for(let i=0;i<5;i++){seen.add(s.session.questions[i].operation);solve(s);nextQuestion(s);}
    assert.deepEqual([...seen].sort(),[...OPERATION_IDS].sort());
    const growing=state(3,topic,'divide',9);for(let i=0;i<3;i++){solve(growing);nextQuestion(growing);}
    assert.equal(growing.session.questions[3].band,3);assert.equal(growing.session.questions[3].operation,'divide');
  }
});
test('changing operations preserves answered questions and cannot award credit twice',()=>{
  const s=state(),q=s.session.questions[0];solve(s);const credits=s.credits;
  assert.equal(setOperation(s,'multiply'),true);assert.deepEqual(s.session.questions[0],q);
  assert.equal(solve(s).status,'ignored');assert.equal(s.credits,credits);assert.equal(s.correct,1);
  nextQuestion(s);assert.equal(s.session.questions[1].operation,'multiply');
  assert.equal(setOperation(s,'divide'),true);assert.equal(s.session.questions[1].operation,'divide');assert.equal(s.credits,credits);
  setGrade(s,6);assert.equal(s.session.questions[1].operation,'divide');assert.equal(s.correct,1);
  s.session=createDaily('sam','2026-11-15',s.correct,3);assert.equal(setOperation(s,'divide'),false);
});
test('operation choices and displayed answers survive saves, while older saves still work',()=>{
  const s=state(3,'decimals','divide',9),player={name:'Sam',seed:'sam',id:'sam'};solve(s);
  const restored=readSave(makeSave(player,s)).state;assert.equal(restored.session.operation,'divide');assert.deepEqual(restored.session.questions[0],s.session.questions[0]);
  prepareSession(restored);assert.equal(solve(restored).status,'ignored');nextQuestion(restored);assert.equal(restored.session.questions[1].operation,'divide');
  const data=JSON.parse(makeSave(player,s));delete data.state.session.operation;delete data.state.session.questions[0].operation;
  const old=readSave(JSON.stringify(data)).state;const prompt=old.session.questions[0].prompt;prepareSession(old);assert.equal(old.session.questions[0].prompt,prompt);
  data.state.session.operation='execute';assert.throws(()=>readSave(JSON.stringify(data)));
});
test('a repeated random draw is replaced with a fresh question in the same round',()=>{
  const previous=Math.random;let draws=0;
  try{
    Math.random=()=>++draws<=4?0.2:0.7;
    const s=state(),first=s.session.questions[0].prompt;solve(s);nextQuestion(s);
    assert.notEqual(s.session.questions[1].prompt,first);
  }finally{Math.random=previous;}
});
