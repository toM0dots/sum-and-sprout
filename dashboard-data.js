export const DASH_TOPICS=[['addition','Addition'],['subtraction','Subtraction'],['multiplication','Multiplication'],['division','Division'],['decimals','Decimals'],['fractions','Fractions'],['percentage','Percentages'],['ratios','Ratios'],['tricks','Mental math'],['equations','Equations']];
export const OP_LABELS={add:'+',subtract:'−',multiply:'×',divide:'÷'};
export function topicSummary(student,topic){
  const entries=Object.entries(student.skills).filter(([key])=>key===topic||key.startsWith(`${topic}:`));
  const count=entries.reduce((n,[,s])=>n+s.count,0),correct=entries.reduce((n,[,s])=>n+s.correct,0);
  const recent=entries.flatMap(([,s])=>s.recent),recentAccuracy=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:null;
  const operations=entries.filter(([key])=>key.includes(':')),bands=(operations.length?operations:entries).map(([,s])=>s.band+1);
  const specific=entries.filter(([key,s])=>key.includes(':')&&s.recent.length>=5&&s.recent.reduce((a,b)=>a+b,0)/s.recent.length<.7).map(([key])=>OP_LABELS[key.split(':')[1]]);
  const status=specific.length||(recent.length>=5&&recentAccuracy<.7)?'practice':count<5?'sample':recentAccuracy>=.85?'steady':'building';
  const low=bands.length?Math.min(...bands):null,high=bands.length?Math.max(...bands):null;
  return {count,correct,accuracy:count?correct/count:null,recentAccuracy,status,specific,level:low===null?'—':low===high?String(low):`${low}–${high}`,entries};
}
export function practiceTopics(student){return DASH_TOPICS.map(([id,label])=>({id,label,...topicSummary(student,id)})).filter(s=>s.status==='practice').sort((a,b)=>(a.recentAccuracy??1)-(b.recentAccuracy??1));}
export const accuracyLabel=ratio=>ratio===null?'—':`${Math.round(ratio*100)}%`;
export function csvReport(students){
  const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const rows=[['Student','Topic','Level','First-try accuracy','Questions','Recent accuracy','Practice focus','Last synced']];
  for(const s of students)for(const [id,label] of DASH_TOPICS){const t=topicSummary(s,id);rows.push([s.name,label,t.level,accuracyLabel(t.accuracy),t.count,accuracyLabel(t.recentAccuracy),t.status==='practice'?'More practice':t.status==='sample'?'More evidence':'Keep practising',new Date(s.lastSeen).toISOString()]);}
  return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
