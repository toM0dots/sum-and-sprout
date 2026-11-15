export const PLAYERS_KEY='sum-sprout-players-v1';
export function readPlayers(storage,makeId=()=>crypto.randomUUID()){
  try{const list=JSON.parse(storage.getItem(PLAYERS_KEY));if(Array.isArray(list)&&list.length&&list.every(p=>typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=24)){for(const player of list)if(!player.seed)player.seed=makeId();try{storage.setItem(PLAYERS_KEY,JSON.stringify(list));}catch{}return list;}}catch{}
  const list=[{id:'original',name:'Player 1',seed:makeId()}];
  try{storage.setItem(PLAYERS_KEY,JSON.stringify(list));}catch{}
  return list;
}
export const playerKey=id=>id==='original'?'sum-sprout-v1':`sum-sprout-player-${id}`;
export function addPlayer(list,name,id){
  const trimmed=String(name).trim().replace(/\s+/g,' ');
  if(!trimmed||trimmed.length>24)throw new Error('Use a short nickname.');
  if(list.some(p=>p.name.toLocaleLowerCase()===trimmed.toLocaleLowerCase()))throw new Error('That name is already here.');
  return [...list,{id,name:trimmed,seed:id}];
}
export function dayKey(now=new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function archiveDaily(state){
  if(state.session?.kind==='daily'){
    state.daily??={};state.daily[state.session.dailyKey]=state.session;
    const keep=Object.keys(state.daily).sort().slice(-21);
    for(const key of Object.keys(state.daily))if(!keep.includes(key))delete state.daily[key];
  }
}
