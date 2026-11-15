const PETS=['fox','bunny','cat','bear'];
const limit=(n,fallback)=>Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback;
export const NEED_RATES={fullnessPerMinute:.5,happinessPerMinute:.1};
export function advanceNeeds(state,now=Date.now()){
 state.care??={};state.happiness??={};state.joyAt??={};
 const previous=state.needsUpdatedAt;
 // Older saves begin their clock on migration; their existing food level is preserved.
 const minutes=Number.isFinite(previous)?Math.max(0,now-previous)/60000:0;
 for(const id of PETS){
  state.care[id]=Math.max(0,limit(state.care[id],65)-minutes*NEED_RATES.fullnessPerMinute);
  state.happiness[id]=Math.max(0,limit(state.happiness[id],60)-minutes*NEED_RATES.happinessPerMinute);
 }
 state.needsUpdatedAt=now;
 return state;
}
export function feedNeeds(state,id,food,now=Date.now()){
 advanceNeeds(state,now);
 if(!PETS.includes(id)||!food||food.type!=='food'||!Number.isFinite(food.value)||!state.food?.[food.id]||Math.round(state.care[id])>=100)return false;
 state.food[food.id]--;
 state.care[id]=Math.min(100,state.care[id]+food.value);
 state.happiness[id]=Math.min(100,state.happiness[id]+({apple:8,carrot:12,berries:18}[food.id]??8));
 return true;
}
export function playNeeds(state,id,kind,now=Date.now()){
 advanceNeeds(state,now);
 const rewards={ball:6,pet:2,tap:1};
 if(!PETS.includes(id)||!(kind in rewards))return 0;
 const key=id+':'+kind,last=state.joyAt[key],cooldown=kind==='ball'?5000:3000;
 if(Number.isFinite(last)&&now>=last&&now-last<cooldown)return 0;
 state.joyAt[key]=now;
 const gain=Math.min(rewards[kind],100-state.happiness[id]);
 state.happiness[id]+=gain;
 return gain;
}
