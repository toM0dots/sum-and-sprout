import {classroomOrigin} from './classroom.js';
import {makeSave,readSave} from './saves.js';
export const accountKey=id=>`sum-sprout-account-${id}`;
export const newToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
export function newPetCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>a[v%32]).join('').match(/.{4}/g).join('-');}
export function cloudSave(player,state){const save=JSON.parse(makeSave(player,state));delete save.savedAt;delete save.state.classroom;return save;}
export async function studentRequest(path,data,token,fetcher=fetch){
  const response=await fetcher(`${classroomOrigin()}/api/classroom/${path}`,{method:'POST',credentials:'omit',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Couldn’t connect. Try again.'),{status:response.status,data:result});return result;
}
export function restoreCloud(result,token){
  const backup=result.save?readSave(JSON.stringify(result.save)):null;
  if(backup)backup.state.classroom={token,studentId:result.student.studentId,classId:result.student.classId,className:result.student.className};
  return backup;
}
export class CloudStore{
  constructor(storage,{request=studentRequest,status=()=>{},remote=()=>{},conflict=()=>{}}={}){this.storage=storage;this.request=request;this.status=status;this.remote=remote;this.conflict=conflict;this.busy=new Map();}
  get(id){try{return JSON.parse(this.storage.getItem(accountKey(id)));}catch{return null;}}
  put(id,account){this.storage.setItem(accountKey(id),JSON.stringify(account));}
  attach(id,result,token){this.put(id,{...result.student,token,revision:result.revision,desired:null,job:null,conflict:null});}
  mark(id,player,state){const a=this.get(id);if(!a)return;const value=JSON.stringify(cloudSave(player,state));if(a.desired===value)return;a.desired=value;this.put(id,a);this.status(id,'Saving online…');}
  async flush(id){
    if(this.busy.has(id))return this.busy.get(id);
    const operation=async()=>{
      try{
        let a=this.get(id);if(!a)return;if(a.conflict){this.status(id,'Choose a save');this.conflict(id,a.conflict);return;}
        // Do not let an idle, older device write its cached save over a newer device.
        if(!a.desired&&!a.job){
          const result=await this.request('load',{studentId:a.studentId},a.token),latest=this.get(id);
          if(!latest||latest.token!==a.token)return;
          if(!latest.desired&&!latest.job){
          if(result.revision!==latest.revision){this.remote(id,restoreCloud(result,a.token));latest.revision=result.revision;this.put(id,latest);}
          this.status(id,'✓ Saved online');return;
          }
        }
        while((a=this.get(id))&&(a.desired||a.job)&&!a.conflict){
          if(!a.job){a.job={studentId:a.studentId,revision:a.revision,mutation:crypto.randomUUID(),save:JSON.parse(a.desired)};this.put(id,a);}
          const job=a.job;this.status(id,'Saving online…');
          let result;
          try{result=await this.request('save',job,a.token);}catch(e){
            if(e.status===409&&e.data?.conflict){const latest=this.get(id);if(latest?.token===a.token){latest.conflict=e.data;this.put(id,latest);this.status(id,'Choose a save');this.conflict(id,e.data);}return;}
            throw e;
          }
          const latest=this.get(id);if(!latest||latest.token!==a.token)return;
          latest.revision=result.revision;
          if(latest.desired===JSON.stringify(job.save))latest.desired=null;
          latest.job=null;this.put(id,latest);
        }
        this.status(id,'✓ Saved online');
      }catch(e){this.status(id,e.status===401?'Sign in again':'Saved here · waiting for internet');}
    };
    const run=globalThis.navigator?.locks?()=>navigator.locks.request(accountKey(id),operation):operation;
    const promise=Promise.resolve().then(run).finally(()=>this.busy.delete(id));this.busy.set(id,promise);return promise;
  }
  async resolve(id,choice){
    const a=this.get(id);if(!a)return;
    const current=await this.request('load',{studentId:a.studentId},a.token);
    const latest=this.get(id);if(!latest||latest.token!==a.token)return;
    // Keep one local recovery copy before replacing either branch of a conflict.
    if(latest.desired)this.storage.setItem(`sum-sprout-recovery-${id}`,latest.desired);
    if(choice==='online'){this.remote(id,restoreCloud(current,a.token));latest.desired=null;}
    latest.revision=current.revision;latest.job=null;latest.conflict=null;this.put(id,latest);
    await this.flush(id);
  }
}
