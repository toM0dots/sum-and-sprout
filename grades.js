import {topics} from './math.js';

export const GRADES=[1,2,3,4,5,6];
export const CHALLENGES=['Start','Stretch','Challenge'];
export const isGrade=g=>GRADES.includes(g);
export const gradeBand=(grade,challenge)=>grade-1+challenge;
export const gradeRewardLevel=(grade,challenge)=>Math.min(2,Math.floor(gradeBand(grade,challenge)/2));
const tidy=n=>Number(n.toFixed(8));
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const frac=(n,d)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};

// Broad practice starting points, not a claim of alignment to a particular curriculum.
// Every grade has two further challenge steps, including Grade 6.
export function generateGrade(topic,grade,challenge,random=Math.random){
  if(!isGrade(grade)||!Number.isInteger(challenge)||challenge<0||challenge>2||!topics.some(t=>t[0]===topic))throw new Error('Invalid grade question');
  const band=gradeBand(grade,challenge),pick=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
  const wholeMax=[9,49,499,4999,49999,999999,4999999,9999999][band];
  let prompt,answer,display,caption='',hint,explanation;
  if(topic==='addition'||topic==='subtraction'){
    const lo=band<2?1:Math.floor(wholeMax/4);
    const a=pick(lo,wholeMax),b=pick(1,band<2?a:wholeMax),c=pick(lo,wholeMax),d=pick(lo,wholeMax);
    if(topic==='addition'){
      const ns=band<3?[a,b]:band<6?[a,b,c]:[a,b,c,d];
      answer=ns.reduce((sum,n)=>sum+n,0);prompt=ns.join(' + ');hint='Add by place value. Group friendly numbers.';
    }else{
      // Younger starting points stay nonnegative; older challenges include several steps.
      const tail=band<4?[b]:[b,c],first=a+tail.reduce((sum,n)=>sum+n,0);
      answer=a;prompt=[first,...tail].join(' − ');hint='Subtract one part at a time.';
    }
  }else if(topic==='multiplication'||topic==='division'){
    const a=pick(2,[5,10,12,99,999,999,9999,9999][band]);
    const b=pick(2,[5,5,12,9,12,99,99,999][band]);
    if(topic==='multiplication'){
      const c=pick(11,99),d=pick(2,12);
      answer=a*b+(band>=5?c*d:0);prompt=band>=5?`${a} × ${b} + ${c} × ${d}`:`${a} × ${b}`;
      hint=band>=5?'Multiply each pair first, then add.':'Split a factor into smaller parts.';
    }else{
      const divisor=pick(2,[3,5,12,9,25,49,75,99][band]),q=pick(2,[5,10,12,99,199,299,499,999][band]),extra=pick(12,99);
      answer=q+(band>=5?extra:0);prompt=band>=5?`(${divisor*q} + ${divisor*extra}) ÷ ${divisor}`:`${divisor*q} ÷ ${divisor}`;
      hint=band>=5?'Divide both parts, then add.':'Which number times the divisor makes the total?';
    }
  }else if(topic==='decimals'){
    const scale=band<3?10:100,a=pick(1,band<2?9:band>=6?9999:999),b=pick(1,band<2?9:band>=6?999:99),c=pick(10,399);
    if(band<4){answer=(a+b)/scale;prompt=`${a/scale} + ${b/scale}`;hint='Line up the decimal points.';}
    else if(band===4){answer=(a+b-c)/100;prompt=`${a/100} + ${b/100} − ${c/100}`;hint='Keep the decimal points lined up.';}
    else{const divisor=band===7?pick(2,9):1;answer=(a*b/100+c/100)/divisor;prompt=band===7?`(${a/10} × ${b/10} + ${c/100}) ÷ ${divisor}`:`${a/10} × ${b/10} + ${c/100}`;hint='Multiply first. Then add, and divide if needed.';}
  }else if(topic==='fractions'){
    const den=pick(2,band<2?6:12),num=pick(1,den-1),other=den===12?11:den+1,second=pick(1,other-1);
    if(band===0){const total=pick(1,5)*2;answer=total/2;prompt=`1/2 of ${total}`;hint='Share the number into two equal groups.';}
    else if(band<3){const n=pick(1,den-1);answer=(num+n)/den;display=frac(num+n,den);prompt=`${num}/${den} + ${n}/${den}`;hint='Add the top numbers. Keep the bottom number.';}
    else if(band===3){answer=num/den+second/other;display=frac(num*other+second*den,den*other);prompt=`${num}/${den} + ${second}/${other}`;hint='Find a common denominator, then add.';}
    else if(band===4){answer=num*second/(den*other);display=frac(num*second,den*other);prompt=`${num}/${den} × ${second}/${other}`;hint='Multiply the top numbers and the bottom numbers.';}
    else if(band===5){answer=num*other/(den*second);display=frac(num*other,den*second);prompt=`${num}/${den} ÷ ${second}/${other}`;hint='Flip the second fraction, then multiply.';}
    else{const n=pick(1,5),d=pick(6,9),top=num*other+second*den,bottom=den*other,multiply=band===6;
      answer=multiply?top*n/(bottom*d):top*d/(bottom*n);display=multiply?frac(top*n,bottom*d):frac(top*d,bottom*n);
      prompt=`(${num}/${den} + ${second}/${other}) ${multiply?'×':'÷'} ${n}/${d}`;
      hint=`Add the fractions in brackets first, then ${multiply?'multiply':'flip the last fraction and multiply'}.`;
    }
  }else if(topic==='percentage'){
    const percent=band===0?50:band<3?[10,25,50][pick(0,2)]:pick(12,85),total=pick(2,[10,20,50,100,250,500,1000,2000][band])*20;
    if(band<5){answer=total*percent/100;prompt=`${percent}% of ${total}`;hint='Find 1% (divide by 100), then multiply.';}
    else if(band===5){answer=total*(1-percent/100);prompt=`${total} decreased by ${percent}%`;caption='Find the new amount';hint='Find the percentage, then subtract it.';}
    else{const second=pick(5,25);answer=total*(1-percent/100)*(1+second/100);prompt=`${total}: −${percent}%, then +${second}%`;caption='Find the final amount';hint='Apply the second percentage to the new amount.';}
  }else if(topic==='ratios'){
    const a=pick(1,band<2?3:9),b=a+pick(1,band<2?3:9),factor=pick(2,[3,5,8,12,20,50,99,199][band]);
    if(band<4){answer=b*factor;prompt=`${a} : ${b} = ${a*factor} : ?`;caption='Find ?';hint='Multiply both parts by the same number.';}
    else if(band<6){answer=a*factor;prompt=`Red : blue = ${a} : ${b}`;caption=`${(a+b)*factor} beads in all. How many red?`;hint=`Divide the total into ${a+b} equal parts.`;}
    else{const c=pick(2,9);answer=b*factor;prompt=`Red : blue : green = ${a} : ${b} : ${c}`;caption=`${(a+b+c)*factor} beads in all. How many blue?`;hint=`Divide the total into ${a+b+c} equal parts, then take ${b} parts.`;}
  }else if(topic==='tricks'){
    const a=pick(band<2?1:band===7?100:12,band<2?20:band===7?999:199);
    if(band<2){answer=a+9;prompt=`${a} + 9`;hint='Add 10, then take away 1.';}
    else if(band<4){answer=a*99;prompt=`${a} × 99`;hint='Multiply by 100, then subtract one copy.';}
    else if(band<6){const b=pick(12,88);answer=a*100;prompt=`${a} × ${b} + ${a} × ${100-b}`;hint='Find the repeated factor. Add the other two factors.';}
    else{const b=pick(2,band===7?99:20);answer=a*a-b*b;prompt=`(${a} + ${b}) × (${a} − ${b})`;hint='Try the square of the first number minus the square of the second.';}
  }else if(topic==='equations'){
    const x=pick(1,[9,20,30,40,50,75,99,199][band]),a=pick(2,12),b=pick(2,band<2?10:49);
    answer=x;caption='Find x';
    if(band<2){prompt=`x + ${b} = ${x+b}`;hint=`Subtract ${b} from both sides.`;}
    else if(band<4){prompt=`${a}x + ${b} = ${a*x+b}`;hint=`Subtract ${b}, then divide by ${a}.`;}
    else if(band<6){const c=pick(1,a-1),right=(a-c)*x+a*b;prompt=`${a}(x + ${b}) = ${c}x + ${right}`;hint='Expand the brackets. Collect x terms on one side.';}
    else{const d=pick(2,9),c=pick(1,a*d-1),right=(a*d-c)*x+b*d;prompt=`${a}x + ${b} = (${c}x + ${right}) ÷ ${d}`;hint=`Multiply both sides by ${d}. Then collect x terms.`;}
  }
  answer=tidy(answer);display??=String(answer);
  explanation=topic==='equations'?`x = ${display}. Put ${display} in place of x to check both sides.`:`${prompt}${caption?` (${caption})`:''} → ${display}. ${hint}`;
  return {topic,grade,challenge,level:gradeRewardLevel(grade,challenge),prompt,answer,display,caption,hint,explanation};
}
