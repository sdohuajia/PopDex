/** Arithmetic grid and the adjacent reverse-order replacement rule. */
export function roundToTick(price,tickSize=0) {
  const tick=Number(tickSize);
  if (!(tick>0)) return round(price);
  // Integer units avoid floating-point residues such as 61749.800000000003.
  const decimals=decimalPlaces(tick);
  const scale=10**decimals;
  const units=Math.round(Number(price)*scale/Math.round(tick*scale));
  return Number((units*Math.round(tick*scale)/scale).toFixed(decimals));
}
export function buildGrid({ lower, upper, gridCount, tickSize=0 }) {
  if (!(upper > lower)) throw new Error('UPPER must be greater than LOWER');
  if (!Number.isInteger(gridCount) || gridCount < 2) throw new Error('GRID_COUNT must be an integer >= 2');
  const spacing=(upper-lower)/gridCount;
  const levels=Array.from({length:gridCount+1},(_,i)=>roundToTick(lower+i*spacing,tickSize));
  // A coarse tick can collapse neighbouring rungs; never submit duplicate prices.
  if (new Set(levels).size!==levels.length) throw new Error(`网格间距 ${(spacing)} 小于价格步长 ${tickSize}，请减少网格数或扩大区间`);
  return {count:gridCount,spacing:roundToTick(spacing,tickSize),levels};
}
export function reduceOnly(side,mode) { return (mode==='long'&&side==='sell')||(mode==='short'&&side==='buy'); }
export function seedOrders({levels,spacing,price,mode,skipBand=.25}) { const band=spacing*skipBand, result=[]; levels.forEach((level,levelIndex)=>{if(Math.abs(level-price)<band)return; if(level<price&&(mode==='neutral'||mode==='long'))result.push({levelIndex,price:level,side:'buy',reduceOnly:reduceOnly('buy',mode)}); if(level>price&&(mode==='neutral'||mode==='short'))result.push({levelIndex,price:level,side:'sell',reduceOnly:reduceOnly('sell',mode)});}); return result; }
export function replacementFor(fill,levels,mode) { const levelIndex=fill.side==='buy'?fill.levelIndex+1:fill.levelIndex-1; if(levelIndex<0||levelIndex>=levels.length)return null; const side=fill.side==='buy'?'sell':'buy'; return {levelIndex,price:levels[levelIndex],side,reduceOnly:reduceOnly(side,mode)}; }
const round=n=>Math.round(n*1e8)/1e8;
function decimalPlaces(value){const text=String(value);if(/e-/i.test(text)){const [base,exp]=text.toLowerCase().split('e-');return (base.split('.')[1]?.length||0)+Number(exp);}return (text.split('.')[1]||'').length;}
