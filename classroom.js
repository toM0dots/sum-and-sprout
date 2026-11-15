import {baselineReport} from './reporting.js';
const HOST='https://sum-and-sprout-math-pets.tom0dota.chatgpt.site';
export const classroomOrigin=()=>['127.0.0.1','localhost'].includes(location.hostname)?location.origin:HOST;
export const teacherURL=()=>`${classroomOrigin()}/teacher.html`;
const inFlight=new WeakSet();
export async function joinClass(state,code,name,persist){
  code=code.toUpperCase().replace(/[^A-Z0-9]/g,'');name=name.trim();
  if(!/^[A-Z0-9]{10}$/.test(code))throw Error('Enter the 10-letter class code.');
  if(!name||name.length>24)throw Error('Use a nickname, up to 24 letters.');
  // A stable draft keeps the baseline and token identical when a request is retried.
  if(!state.joinDraft){
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
    state.joinDraft={code,name,token,baseline:baselineReport(state)};persist();
  }
  if(state.joinDraft.code!==code||state.joinDraft.name!==name)throw Error('Retry with the same class code and nickname.');
  const response=await fetch(`${classroomOrigin()}/api/classroom/join`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.joinDraft)});
  const data=await response.json();if(!response.ok){if([400,403,404,409].includes(response.status)){delete state.joinDraft;if(state.reporting)state.reporting.pending=[];persist();}throw Error(data.error||'Couldn’t join. Try again.');}
  state.classroom={token:state.joinDraft.token,...data.student};delete state.joinDraft;persist();return data.student;
}
export async function syncClass(state,persist,status=()=>{}){
  if(!state.classroom||inFlight.has(state))return;
  const pending=state.reporting?.pending;if(!pending?.length){status('Class connected');return;}
  inFlight.add(state);status('Syncing…');
  try{
    while(state.reporting.pending.length){
      const events=state.reporting.pending.slice(0,50),connection=state.classroom;
      const response=await fetch(`${classroomOrigin()}/api/classroom/sync`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','Authorization':`Bearer ${connection.token}`},body:JSON.stringify({studentId:connection.studentId,events})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Sync paused');
      const ids=new Set(data.accepted);state.reporting.pending=state.reporting.pending.filter(e=>!ids.has(e.id));persist([...ids]);
      if(!ids.size)throw Error('Sync paused');
    }
    status('Synced with teacher');
  }catch{status('Saved here · sync when online');}
  finally{inFlight.delete(state);}
}
