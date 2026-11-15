export function petMood(fullness,{eating=false,petting=false,affection=false,happiness=60}={}){
 if(eating)return 'eating';
 if(petting)return 'petted';
 if(Math.round(fullness)<=35)return 'hungry';
 if(Math.round(happiness)>=60||affection)return 'happy';
 return 'content';
}
export function wanderTarget(x,min,max,random=Math.random){
 const range=max-min;if(range<=0)return min;
 // Pick the farther half so a short room still gives the pet somewhere to go.
 const point=x<(min+max)/2?min+range*(.65+random()*.35):min+range*random()*.35;
 return Math.max(min,Math.min(max,point));
}
export function mayWander({now,readyAt,gesture,selected,chasing,lifted,hovered,hidden,reduced}){
 return now>=readyAt&&!gesture&&!selected&&!chasing&&!lifted&&!hovered&&!hidden&&!reduced;
}
