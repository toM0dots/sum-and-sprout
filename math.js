import {hasOperations,operationQuestion} from './operations.js';
export const topics=[['addition','Addition','+','Little sums, big discoveries.','#f4dfb3'],['subtraction','Subtraction','−','Find what’s left behind.','#f4d9ce'],['multiplication','Multiplication','×','Make your numbers multiply.','#dedcf3'],['division','Division','÷','Share a little number magic.','#d6e6d5'],['decimals','Decimals','0.1','Small dots. Endless possibilities.','#d7e8ed'],['fractions','Fractions','½','Put the pieces together.','#f2dcec'],['percentage','Percentages','%','Discover parts of a hundred.','#f4dfb3'],['ratios','Ratios','1:2','Find the perfect balance.','#d6e6d5'],['tricks','Mental math','✦','Clever shortcuts, quicker thinking.','#dedcf3'],['equations','Equations','x','Uncover the mystery number.','#d7e8ed']];
export const levels=[{name:'Seedling',label:'Easy',reward:5},{name:'Growing',label:'Medium',reward:10},{name:'Blooming',label:'Hard',reward:20}];
export function parseAnswer(value){const s=String(value).trim().replace(/−/g,'-');if(/^[-+]?\d+\s+\d+\s*\/\s*\d+$/.test(s)){const [whole,n,d]=s.match(/[-+]?\d+/g).map(Number);return d?(whole<0||s.startsWith('-')?-1:1)*(Math.abs(whole)+n/d):NaN;}if(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)\s*\/\s*[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)){const [a,b]=s.split('/').map(Number);return b?a/b:NaN;}if(!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return NaN;return Number(s)}
export const matches=(value,answer)=>{const n=parseAnswer(value);return Number.isFinite(n)&&Math.abs(n-answer)<1e-7};
const tidy = n => Number(n.toFixed(8));
const gcd = (a,b) => b ? gcd(b,a%b) : Math.abs(a);
const fraction = (a,b) => { const g=gcd(a,b);return b/g===1?String(a/g):`${a/g}/${b/g}`; };
const ranges = {
  addition: [[[5,25],[5,25],[1,9],[1,9]],[[75,450],[35,350],[10,99],[1,9]],[[450,4999],[250,3999],[125,2999],[1,9]]],
  subtraction: [[[12,30],[1,12],[1,9],[1,9]],[[250,999],[25,249],[10,99],[1,9]],[[1000,4999],[100,999],[100,999],[1,9]]],
  multiplication: [[[2,9],[2,10],[1,9],[1,9]],[[12,49],[6,15],[1,9],[1,9]],[[12,49],[12,29],[10,39],[2,9]]],
  division: [[[2,10],[2,10],[1,9],[1,9]],[[6,15],[15,75],[1,9],[1,9]],[[12,25],[20,80],[10,50],[1,9]]],
  decimals: [[[1,99],[1,99],[1,9],[1,9]],[[110,999],[11,99],[10,99],[1,9]],[[11,99],[12,49],[25,399],[1,9]]],
  fractions: [[[1,5],[6,12],[1,5],[6,12]],[[1,9],[2,12],[1,9],[2,12]],[[2,9],[3,12],[2,9],[3,12]]],
  percentage: [[[1,5],[2,20],[1,2],[1,9]],[[5,85],[5,35],[1,2],[1,9]],[[12,45],[10,99],[1,2],[1,9]]],
  ratios: [[[1,5],[2,7],[2,8],[1,9]],[[2,9],[3,12],[3,15],[1,9]],[[2,9],[3,12],[8,25],[1,9]]],
  tricks: [[[11,89],[1,9],[1,9],[1,9]],[[12,99],[2,9],[1,9],[1,9]],[[12,99],[12,89],[1,2],[1,9]]],
  equations: [[[1,20],[1,20],[1,9],[1,9]],[[2,12],[5,45],[2,25],[1,9]],[[3,12],[2,20],[1,2],[2,25]]],
};
export function boundsFor(topic,level) {
  if(!Number.isInteger(level)||level<0||level>2||!Object.hasOwn(ranges,topic))throw new Error('Invalid question');
  return ranges[topic][level];
}
export function buildQuestion(topic,level,values) {
  const bounds=boundsFor(topic,level);
  if(!Array.isArray(values)||values.length!==4||values.some((n,i)=>!Number.isInteger(n)||n<bounds[i][0]||n>bounds[i][1]))throw new Error('Invalid question numbers');
  const [a,b,c,d]=values;
  let prompt,answer,hint,explanation,display,caption='';
  switch(topic){
    case 'addition':
      answer=a+b+(level?c:0);prompt=level?`${a} + ${b} + ${c}`:`${a} + ${b}`;
      hint='Add in parts. Make a friendly hundred first.';explanation=level?`${a} + ${b} = ${a+b}; then add ${c}: ${answer}.`:`${a} + ${b} = ${answer}.`;break;
    case 'subtraction':
      answer=a-b-(level===2?c:0);prompt=level===2?`${a} − ${b} − ${c}`:`${a} − ${b}`;
      hint='Subtract one part at a time. You may go below zero.';explanation=level===2?`${a} − ${b} = ${a-b}; then subtract ${c}: ${answer}.`:`Check: ${a-b} + ${b} = ${a}.`;break;
    case 'multiplication':
      answer=a*b+(level===2?c*d:0);prompt=level===2?`${a} × ${b} + ${c} × ${d}`:`${a} × ${b}`;
      hint=level===2?'Do both multiplications before adding.':'Split a factor into tens and ones.';explanation=level===2?`${a*b} + ${c*d} = ${answer}.`:`${a} × ${b} = ${answer}.`;break;
    case 'division':
      answer=b+(level===2?c:0);prompt=level===2?`(${a*b} + ${a*c}) ÷ ${a}`:`${a*b} ÷ ${a}`;
      hint=level===2?'Divide each number in the brackets, then add.':`Use the ${a} times table.`;explanation=level===2?`${a*b} ÷ ${a} = ${b}; ${a*c} ÷ ${a} = ${c}. ${b} + ${c} = ${answer}.`:`${a} × ${b} = ${a*b}, so the answer is ${b}.`;break;
    case 'decimals':
      if(level===0){answer=(a+b)/10;prompt=`${a/10} + ${b/10}`;hint='Line up the decimal points.';explanation=`Add ${a} and ${b} tenths: ${tidy(answer)}.`;}
      else if(level===1){answer=(a-b+c)/100;prompt=`${a/100} − ${b/100} + ${c/100}`;hint='Keep the decimal points lined up.';explanation=`${a} − ${b} + ${c} = ${a-b+c} hundredths, or ${tidy(answer)}.`;}
      else{answer=(a*b+c)/100;prompt=`${a/10} × ${b/10} + ${c/100}`;hint='Multiply first, then add. Check the decimal places.';explanation=`${a/10} × ${b/10} = ${tidy(a*b/100)}; add ${c/100} to get ${tidy(answer)}.`;}break;
    case 'fractions': {
      const den=b,other=level===0?b:(d===b?(d===12?11:d+1):d);
      const num=level===0?a:1+(a-1)%(den-1);
      let second=level===0?c:1+(c-1)%(other-1);
      if(level===2&&num*other===second*den)second=second%(other-1)+1;
      if(level===0){answer=(num+second)/den;display=fraction(num+second,den);prompt=`${num}/${den} + ${second}/${den}`;hint='Add the top numbers. Keep the bottom number.';explanation=`${num+second}/${den} = ${display}.`;}
      else if(level===1){answer=num/den+second/other;display=fraction(num*other+second*den,den*other);prompt=`${num}/${den} + ${second}/${other}`;hint='Find a common denominator, then add.';explanation=`${num*other}/${den*other} + ${second*den}/${den*other} = ${display}.`;}
      else{answer=num*other/(den*second);display=fraction(num*other,den*second);prompt=`${num}/${den} ÷ ${second}/${other}`;hint='Flip the second fraction, then multiply.';explanation=`${num}/${den} × ${other}/${second} = ${num*other}/${den*second} = ${display}.`;}break;}
    case 'percentage': {
      const percent=level===0?[10,20,25,50,75][a-1]:a,total=b*10;
      if(level<2){answer=total*percent/100;prompt=`${percent}% of ${total}`;hint='Find 1% by dividing by 100, then multiply.';explanation=`${total} × ${percent} ÷ 100 = ${tidy(answer)}.`;}
      else{const up=c===1,change=total*percent/100;answer=total+(up?change:-change);prompt=`${total} ${up?'increased':'decreased'} by ${percent}%`;caption='Find the new amount';hint=`Find ${percent}% first, then ${up?'add':'subtract'} it.`;explanation=`${percent}% of ${total} is ${tidy(change)}. ${total} ${up?'+':'−'} ${tidy(change)} = ${tidy(answer)}.`;}break;}
    case 'ratios':
      if(level<2){answer=b*c;prompt=`${a} : ${b} = ${a*c} : ?`;caption='Find ?';hint='Multiply both parts by the same number.';explanation=`${a*c} ÷ ${a} = ${c}; ${b} × ${c} = ${answer}.`;}
      else{answer=a*c;prompt=`Red : blue = ${a} : ${b}`;caption=`${(a+b)*c} beads in all. How many red?`;hint=`There are ${a+b} equal parts. Find one part first.`;explanation=`${(a+b)*c} ÷ ${a+b} = ${c} per part. Red has ${a} parts: ${a} × ${c} = ${answer}.`;}break;
    case 'tricks':
      if(level===0){answer=a+9;prompt=`${a} + 9`;hint='Add 10, then take away 1.';explanation=`${a} + 10 − 1 = ${answer}.`;}
      else if(level===1){answer=a*99;prompt=`${a} × 99`;hint='Multiply by 100, then take away one copy.';explanation=`${a*100} − ${a} = ${answer}.`;}
      else if(c===1){answer=a*100;prompt=`${a} × ${b} + ${a} × ${100-b}`;hint='Look for the repeated number. Add the other two factors.';explanation=`${a} × (${b} + ${100-b}) = ${a} × 100 = ${answer}.`;}
      else{answer=a*125;prompt=`${a*5} × 25`;hint='Multiply by 100, then divide by 4.';explanation=`${a*5} × 100 ÷ 4 = ${answer}.`;}break;
    case 'equations':
      caption='Find x';
      if(level===0){answer=a;prompt=`x + ${b} = ${a+b}`;hint=`Subtract ${b} from both sides.`;explanation=`x = ${a+b} − ${b} = ${a}.`;}
      else if(level===1){answer=c;prompt=`${a}x + ${b} = ${a*c+b}`;hint=`Subtract ${b}, then divide by ${a}.`;explanation=`${a}x = ${a*c}, so x = ${c}.`;}
      else{answer=d;const right=(a-c)*d+a*b;prompt=`${a}(x + ${b}) = ${c}x + ${right}`;hint=`Expand the brackets. Move ${c}x to the left and ${a*b} to the right.`;explanation=`${a-c}x = ${right} − ${a*b} = ${(a-c)*d}, so x = ${d}.`;}break;
  }
  return {topic,level,prompt,caption,answer:tidy(answer),display:display??String(tidy(answer)),hint,explanation};
}
export function generate(topic,level,random=Math.random,operation){
  if(operation!==undefined&&hasOperations(topic))return {...operationQuestion(topic,[1,3,5][level],operation,random),level};
  return buildQuestion(topic,level,boundsFor(topic,level).map(([lo,hi])=>lo+Math.floor(random()*(hi-lo+1))));
}
export function seededRandom(seed){
  let n=2166136261;for(const char of seed){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}
  return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
}
export function dailyFallback(seed,level){const random=seededRandom(seed);return topics.map(([topic])=>generate(topic,level,random));}
