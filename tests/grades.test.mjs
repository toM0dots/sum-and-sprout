import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGrade,GRADES} from '../grades.js';
import {topics,matches,seededRandom} from '../math.js';
import {createPractice,createDaily,setGrade,setOperation,submitAnswer,nextQuestion,prepareSession} from '../practice.js';
import {makeSave,readSave,importSave} from '../saves.js';
import {playerKey} from '../players.js';

function calc(expression){
  const tokens=expression.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').match(/\d+(?:\.\d+)?|[()+*/-]/g);let pos=0;
  const atom=()=>{if(tokens[pos]==='('){pos++;const n=sum();assert.equal(tokens[pos++],')');return n;}if(tokens[pos]==='-'){pos++;return -atom();}return Number(tokens[pos++]);};
  const product=()=>{let n=atom();while(['*','/'].includes(tokens[pos])){const op=tokens[pos++],b=atom();n=op==='*'?n*b:n/b;}return n;};
  const sum=()=>{let n=product();while(['+','-'].includes(tokens[pos])){const op=tokens[pos++],b=product();n=op==='+'?n+b:n-b;}return n;};
  const answer=sum();assert.equal(pos,tokens.length);return answer;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const fresh=(grade=null,correct=0)=>({grade,credits:0,earned:0,correct,attempts:correct,streak:0,best:0,pet:'fox',care:{fox:65,bunny:65,cat:65,bear:65},food:{apple:1},owned:[],wear:{},stats:{},session:createPractice('fractions',correct,grade)});

test('18,000 grade questions have independently checked answers at every grade and challenge',()=>{
  const rng=seededRandom('grade-answer-audit');
  for(const grade of GRADES)for(let challenge=0;challenge<3;challenge++)for(const [topic] of topics)for(let i=0;i<100;i++){
    const q=generateGrade(topic,grade,challenge,rng),band=grade-1+challenge;
    assert.ok(matches(q.display,q.answer),q.prompt);assert.equal(q.grade,grade);assert.equal(q.challenge,challenge);
    if(topic==='percentage'){
      const ns=q.prompt.match(/\d+/g).map(Number);
      close(q.answer,q.prompt.includes(' of ')?ns[0]*ns[1]/100:band===5?ns[0]*(1-ns[1]/100):ns[0]*(1-ns[1]/100)*(1+ns[2]/100));
    }else if(topic==='ratios'){
      const ns=q.prompt.match(/\d+/g).map(Number);
      close(q.answer,band<4?ns[1]*ns[2]/ns[0]:Number(q.caption.match(/\d+/)[0])*(band<6?ns[0]:ns[1])/ns.reduce((a,b)=>a+b,0));
    }else if(topic==='equations'){
      const sides=q.prompt.replaceAll('x',`(${q.answer})`).replace(/(\d)\(/g,'$1*(').split('=');close(calc(sides[0]),calc(sides[1]));
    }else if(topic==='fractions'){
      if(q.prompt.includes(' of '))close(q.answer,Number(q.prompt.split(' of ')[1])/2);
      else close(q.answer,calc(q.prompt.replace(/\d+\/\d+/g,match=>`(${match})`)));
    }else close(q.answer,calc(q.prompt));
  }
});
test('Grade 6 bypasses easy problems without fabricating correct answers or credits',()=>{
  const s=fresh();setGrade(s,6);setOperation(s,'divide');const q=s.session.questions[0];
  assert.equal(s.correct,0);assert.equal(s.credits,0);assert.equal(q.grade,6);assert.equal(q.challenge,0);assert.equal(q.level,2);assert.match(q.prompt,/÷/);
  assert.equal(submitAnswer(s,q.display).reward,20);assert.equal(s.correct,1);assert.equal(s.credits,20);
  const resolved=structuredClone(s.session.questions[0]);setGrade(s,2);
  assert.deepEqual(s.session.questions[0],resolved);assert.equal(submitAnswer(s,q.display).status,'ignored');
  nextQuestion(s);assert.equal(s.session.questions[1].grade,2);assert.equal(s.credits,20);
});
test('every grade and topic can step up after three first-try answers, preserving shown questions',()=>{
  for(const grade of GRADES)for(const [topic] of topics){
    const s=fresh(grade);s.session=createPractice(topic,0,grade,'divide');
    for(let i=0;i<3;i++){
      const current=structuredClone(s.session.questions[i]);submitAnswer(s,current.display);prepareSession(s);
      assert.deepEqual(s.session.questions[i],current);nextQuestion(s);
    }
    assert.equal(s.session.questions[3].band,grade);assert.equal(s.session.questions[3].topic,topic);
    assert.equal(s.grade,grade,'Starting grade stays unchanged');
  }
});
test('daily questions use grade deterministically without resetting already earned rewards',()=>{
  const s=fresh(6);s.session=createDaily('sam','2026-11-15',0,6);
  assert.deepEqual(s.session,createDaily('sam','2026-11-15',0,6));
  assert.notDeepEqual(s.session,createDaily('sam','2026-11-15',0,1));
  assert.equal(s.session.dailyKey,createDaily('sam','2026-11-15',0,1).dailyKey);
  const q=s.session.questions[0];submitAnswer(s,q.display);setGrade(s,1);assert.equal(submitAnswer(s,q.display).status,'ignored');
  assert.equal(s.session.solved,1);nextQuestion(s);assert.equal(s.session.questions[1].grade,1);
});
test('grades and question metadata survive backup and remain separate for different players',()=>{
  const s=fresh(6,30),player={id:'sam',seed:'sam-seed',name:'Sam'};
  const restored=readSave(makeSave(player,s));assert.equal(restored.state.grade,6);assert.deepEqual(restored.state.session.questions[0],s.session.questions[0]);
  const map=new Map([[playerKey('original'),JSON.stringify(fresh(2))]]),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
  importSave(storage,[{id:'original',name:'Alex',seed:'alex'}],restored,'sam-copy');
  assert.equal(JSON.parse(storage.getItem(playerKey('original'))).grade,2);assert.equal(JSON.parse(storage.getItem(playerKey('sam-copy'))).grade,6);
  const data=JSON.parse(makeSave(player,s));data.state.grade=7;assert.throws(()=>readSave(JSON.stringify(data)));
  delete data.state.grade;assert.equal(readSave(JSON.stringify(data)).state.grade,null);
  for(const grade of [0,7,1.5,'6',null])assert.throws(()=>setGrade(s,grade));
});
