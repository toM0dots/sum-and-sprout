import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSave,readSave,importSave,MAX_SAVE_BYTES} from '../saves.js';
import {createDaily,createPractice,submitAnswer,nextQuestion,levelForCorrect} from '../practice.js';
import {PLAYERS_KEY,playerKey} from '../players.js';
const player={id:'student',name:'Sam',seed:'student-daily-seed'};
const fresh=()=>({credits:90,earned:125,correct:29,attempts:35,streak:2,best:6,pet:'bunny',care:{fox:22,bunny:63,cat:45,bear:78},happiness:{fox:30,bunny:90,cat:80,bear:75},food:{apple:2,berries:3},owned:['scarf','hat'],wear:{bunny:'hat',fox:'scarf'},stats:{fractions:25,addition:4},session:null,daily:{},needsUpdatedAt:1800000000000,joyAt:{'bunny:pet':1800000000000}});
function storage(){const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
test('save transfers pets, purchases, statistics, daily seed and a resolved question without duplicate credit',()=>{
  const state=fresh();state.session=createPractice('fractions',state.correct);
  submitAnswer(state,String(state.session.questions[0].answer));
  assert.equal(levelForCorrect(state.correct),2);
  const restored=readSave(makeSave(player,state));
  assert.deepEqual(restored.player,{name:player.name,seed:player.seed});
  for(const key of ['credits','earned','correct','attempts','streak','best','pet','care','happiness','food','owned','wear','stats','needsUpdatedAt','joyAt'])assert.deepEqual(restored.state[key],state[key]);
  assert.equal(submitAnswer(restored.state,String(state.session.questions[0].answer)).status,'ignored');
  nextQuestion(restored.state);assert.equal(restored.state.session.questions[1].topic,'fractions');assert.equal(restored.state.session.questions[1].level,1);
});
test('daily archives and future daily questions survive export/import',()=>{
  const state=fresh(),day='2026-11-15';state.session=createDaily(player.seed,day,state.correct);
  state.daily[state.session.dailyKey]=state.session;
  const restored=readSave(makeSave(player,state));
  assert.deepEqual(restored.state.session.topicOrder,state.session.topicOrder);
  assert.equal(restored.state.session.questions[0].prompt,state.session.questions[0].prompt);
  assert.deepEqual(createDaily(restored.player.seed,'2026-11-16',30),createDaily(player.seed,'2026-11-16',30));
  assert.equal(restored.state.daily[`${day}:auto`].seed,state.session.seed);
});
test('imports add a unique player and keep every existing save intact',()=>{
  const store=storage(),list=[{id:'original',name:'Sam',seed:'old'}];
  store.setItem(PLAYERS_KEY,JSON.stringify(list));store.setItem(playerKey('original'),'existing progress');
  const backup=readSave(makeSave(player,fresh()));
  const result=importSave(store,list,backup,'new-student');
  assert.equal(result.player.name,'Sam (2)');assert.equal(result.player.seed,player.seed);
  assert.equal(store.getItem(playerKey('original')),'existing progress');
  assert.equal(JSON.parse(store.getItem(playerKey('new-student'))).pet,'bunny');
  assert.equal(JSON.parse(store.getItem(PLAYERS_KEY)).length,2);
  assert.throws(()=>importSave(store,list,backup,'original'));
  assert.throws(()=>importSave(store,result.players,backup,'new-student'));
});
test('a storage failure rolls back the new entry without touching old saves',()=>{
  const store=storage(),list=[{id:'original',name:'Sam',seed:'old'}];
  store.setItem(PLAYERS_KEY,JSON.stringify(list));store.setItem(playerKey('original'),'keep');
  const original=store.setItem;store.setItem=(key,value)=>{if(key===PLAYERS_KEY)throw Error('full');original(key,value);};
  assert.throws(()=>importSave(store,list,readSave(makeSave(player,fresh())),'new'),/space/);
  assert.equal(store.getItem(playerKey('new')),null);assert.equal(store.getItem(playerKey('original')),'keep');
  assert.deepEqual(JSON.parse(store.getItem(PLAYERS_KEY)),list);
});
test('reject malformed, unsupported, oversized and crashing data before writing anything',()=>{
  assert.throws(()=>readSave('{'));assert.throws(()=>readSave('null'));assert.throws(()=>readSave(' '.repeat(MAX_SAVE_BYTES+1)));
  const base=JSON.parse(makeSave(player,fresh()));
  for(const mutate of [v=>v.version=2,v=>v.state.credits=-1,v=>v.state.correct='30',v=>v.state.pet='dragon',v=>v.state.food.apple=1.5,v=>v.state.wear.bear='crown',v=>v.player.name='',v=>v.state.daily={'__bad__':{}},v=>{v.state.session=createPractice('fractions',0);v.state.session.index=99;},v=>{v.state.session=createPractice('fractions',0);v.state.session.questions[0]=null;}]){
    const data=structuredClone(base);mutate(data);assert.throws(()=>readSave(JSON.stringify(data)));
  }
});
test('only recognised game fields leave the device or enter a save',()=>{
  const state=fresh();state.unknown='private extra';
  const exported=makeSave(player,state);assert.ok(!exported.includes('private extra'));
  const data=JSON.parse(exported);data.state.food=JSON.parse('{"apple":2,"__proto__":{"polluted":true}}');
  const restored=readSave(JSON.stringify(data));assert.deepEqual(restored.state.food,{apple:2});assert.equal({}.polluted,undefined);
});
