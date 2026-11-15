import test from 'node:test';
import assert from 'node:assert/strict';
import { topics,generate,matches } from '../math.js';
function calc(expression){
  const tokens=expression.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').match(/\d+(?:\.\d+)?|[()+*/-]/g);let pos=0;
  const atom=()=>{if(tokens[pos]==='('){pos++;const n=sum();assert.equal(tokens[pos++],')');return n;}if(tokens[pos]==='-'){pos++;return -atom();}return Number(tokens[pos++]);};
  const product=()=>{let n=atom();while(['*','/'].includes(tokens[pos])){const op=tokens[pos++],b=atom();n=op==='*'?n*b:n/b;}return n;};
  const sum=()=>{let n=product();while(['+','-'].includes(tokens[pos])){const op=tokens[pos++],b=product();n=op==='+'?n+b:n-b;}return n;};
  const value=sum();assert.equal(pos,tokens.length);return value;
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('3,000 generated questions have correct answers and parseable displays',()=>{
  for(const [topic] of topics)for(let level=0;level<3;level++)for(let i=0;i<100;i++){
    const q=generate(topic,level);assert.ok(matches(q.display,q.answer));
    if(topic==='percentage'){
      const ns=q.prompt.match(/\d+/g).map(Number);
      close(q.answer,q.prompt.includes(' of ')?ns[0]*ns[1]/100:ns[0]*(1+(q.prompt.includes('increased')?1:-1)*ns[1]/100));
    }else if(topic==='ratios'){
      const ns=q.prompt.match(/\d+/g).map(Number);
      close(q.answer,level<2?ns[1]*ns[2]/ns[0]:Number(q.caption.match(/\d+/)[0])*ns[0]/(ns[0]+ns[1]));
    }else if(topic==='equations'){
      const equation=q.prompt.replaceAll('x',`(${q.answer})`).replace(/(\d)\(/g,'$1*(').split('=');close(calc(equation[0]),calc(equation[1]));
    }else if(topic==='fractions'&&level===2){const [a,b,c,d]=q.prompt.match(/\d+/g).map(Number);close(q.answer,(a/b)/(c/d));}
    else close(q.answer,calc(q.prompt));
  }
});
test('advanced fractions use proper fractions, unlike denominators, and nontrivial division',()=>{
  for(const level of [1,2])for(let i=0;i<1000;i++){
    const q=generate('fractions',level),[a,b,c,d]=q.prompt.match(/\d+/g).map(Number);
    assert.ok(a<b&&c<d);assert.notEqual(b,d);if(level===2)assert.notEqual(q.answer,1);
  }
});
