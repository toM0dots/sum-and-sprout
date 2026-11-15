export const OPERATIONS=[['mixed','Mix','Mixed operations'],['add','+','Addition'],['subtract','−','Subtraction'],['multiply','×','Multiplication'],['divide','÷','Division']];
export const OPERATION_IDS=OPERATIONS.slice(1).map(o=>o[0]);
export const hasOperations=topic=>topic==='decimals'||topic==='fractions';
export const validOperation=op=>OPERATIONS.some(o=>o[0]===op);
const tidy=n=>Number(n.toFixed(8));
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const fraction=(n,d)=>{const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;};
const decimal=(n,scale)=>String(tidy(n/scale));

// Operation access is independent of grade. Grade changes quantities and precision.
export function operationQuestion(topic,band,operation='mixed',random=Math.random){
  if(!hasOperations(topic)||!Number.isInteger(band)||band<0||band>7||!validOperation(operation))throw new Error('Invalid operation question');
  const pick=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
  if(operation==='mixed')operation=OPERATION_IDS[pick(0,3)];
  const symbol=OPERATIONS.find(o=>o[0]===operation)[1];
  let prompt,answer,display,hint,explanation;
  if(topic==='decimals'){
    if(operation==='divide'){
      // Build dividend = divisor × quotient in integer units: all answers terminate.
      const divisorScale=band<2?1:band<4?10:100,quotientScale=band<4?10:100;
      let d=pick(2,[5,9,9,39,99,199,499,999][band]);
      if(divisorScale>1&&d%10===0)d++;
      let q=pick(2,[9,19,29,99,199,499,999,1999][band]);
      while(q%10===0||(d*q)%(divisorScale*quotientScale)===0)q++;
      const dividend=decimal(d*q,divisorScale*quotientScale),divisor=decimal(d,divisorScale);
      answer=q/quotientScale;prompt=`${dividend} ÷ ${divisor}`;
      hint=divisorScale===1?'Use multiplication to check your answer.':`Multiply both numbers by ${divisorScale} to make the divisor a whole number.`;
      explanation=divisorScale===1?`${tidy(answer)} × ${divisor} = ${dividend}, so ${prompt} = ${tidy(answer)}.`:`${dividend} ÷ ${divisor} = ${decimal(d*q,quotientScale)} ÷ ${d} = ${tidy(answer)}. Check: ${tidy(answer)} × ${divisor} = ${dividend}.`;
    }else{
      const scale=band<4?10:100,max=[9,29,99,299,999,2999,9999,29999][band];
      let a=pick(1,max),b=pick(1,max);
      if(a%10===0)a++;if(b%10===0)b++;
      if(operation==='subtract'&&a<b)[a,b]=[b,a];
      const secondScale=operation==='multiply'&&band<2?1:scale;
      const left=decimal(a,scale),right=decimal(b,secondScale);
      prompt=`${left} ${symbol} ${right}`;
      if(operation==='multiply'){
        answer=a*b/(scale*secondScale);hint='Multiply as whole numbers, then put back the decimal places.';
        explanation=`${a} × ${b} = ${a*b}. Divide by ${scale*secondScale}: ${tidy(answer)}.`;
      }else{
        const units=operation==='add'?a+b:a-b;answer=units/scale;hint='Line up the decimal points.';
        explanation=`${a} ${symbol} ${b} = ${units} ${scale===10?'tenths':'hundredths'} = ${tidy(answer)}.`;
      }
    }
  }else{
    const maxDen=[4,6,10,12,16,20,24,30][band];
    let d=pick(2,maxDen),e=(operation==='add'||operation==='subtract')&&band<3?d:pick(2,maxDen);
    if(band>=3&&e===d)e=d===maxDen?d-1:d+1;
    let a=pick(1,band<4?d-1:2*d-1),b=pick(1,band<4?e-1:2*e-1);
    if(a%d===0)a++;if(b%e===0)b++;
    if(operation==='subtract'&&a*e<b*d){[a,b]=[b,a];[d,e]=[e,d];}
    prompt=`${a}/${d} ${symbol} ${b}/${e}`;
    let numerator,denominator;
    if(operation==='add'||operation==='subtract'){
      numerator=operation==='add'?a*e+b*d:a*e-b*d;denominator=d*e;
      hint=d===e?`Keep the denominator and ${operation==='add'?'add':'subtract'} the numerators.`:'Find a common denominator first.';
      explanation=`${a*e}/${d*e} ${symbol} ${b*d}/${d*e} = ${fraction(numerator,denominator)}.`;
    }else if(operation==='multiply'){
      numerator=a*b;denominator=d*e;hint='Multiply the numerators and the denominators, then simplify.';
      explanation=`(${a} × ${b}) / (${d} × ${e}) = ${fraction(numerator,denominator)}.`;
    }else{
      numerator=a*e;denominator=d*b;hint='Flip the second fraction, then multiply.';
      explanation=`${a}/${d} × ${e}/${b} = ${fraction(numerator,denominator)}.`;
    }
    // Strong students keep the chosen operation, with three fractions at the top bands.
    if(band>=6){
      const c=pick(1,7),f=pick(8,12);
      prompt=`(${prompt}) ${symbol} ${c}/${f}`;
      const first=fraction(numerator,denominator);
      if(operation==='add'){numerator=numerator*f+c*denominator;denominator*=f;}
      else if(operation==='subtract'){numerator=numerator*f-c*denominator;denominator*=f;}
      else if(operation==='multiply'){numerator*=c;denominator*=f;}
      else{numerator*=f;denominator*=c;}
      explanation+=` Then ${first} ${symbol} ${c}/${f} = ${fraction(numerator,denominator)}.`;
    }
    answer=numerator/denominator;display=fraction(numerator,denominator);
  }
  return {topic,operation,prompt,caption:'',answer:tidy(answer),display:display??String(tidy(answer)),hint,explanation};
}
