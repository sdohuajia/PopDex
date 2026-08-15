/** Read-only multi-timeframe trend classification used by the dashboard. */
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
export function ema(values,period){
  if(values.length<period)return null;
  let value=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  const alpha=2/(period+1);
  for(const price of values.slice(period))value=price*alpha+value*(1-alpha);
  return value;
}
export function rsi(values,period=14){
  if(values.length<=period)return 50;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){const delta=values[i]-values[i-1];if(delta>=0)gain+=delta;else loss-=delta;}
  let avgGain=gain/period,avgLoss=loss/period;
  for(let i=period+1;i<values.length;i++){const delta=values[i]-values[i-1];avgGain=(avgGain*(period-1)+Math.max(delta,0))/period;avgLoss=(avgLoss*(period-1)+Math.max(-delta,0))/period;}
  return avgLoss===0?100:100-100/(1+avgGain/avgLoss);
}
export function atrPct(rows,period=14){
  if(rows.length<=period)return null;
  const ranges=[];
  for(let i=1;i<rows.length;i++)ranges.push(Math.max(rows[i].high-rows[i].low,Math.abs(rows[i].high-rows[i-1].close),Math.abs(rows[i].low-rows[i-1].close)));
  const atr=ranges.slice(-period).reduce((sum,value)=>sum+value,0)/Math.min(period,ranges.length);
  return rows.at(-1).close?100*atr/rows.at(-1).close:null;
}
export function analyzeCandles(rows){
  const clean=rows.filter(x=>[x.open,x.high,x.low,x.close].every(Number.isFinite));
  if(clean.length<30)throw Error('K线数量不足，至少需要 30 根完整K线');
  const closes=clean.map(x=>x.close),last=closes.at(-1),ema20=ema(closes,20),ema50=ema(closes,50),previous=closes.at(-6);
  const returnPct=previous?100*(last-previous)/previous:0,relativeAtr=Math.max(atrPct(clean)||0.01,0.01),relativeRsi=rsi(closes);
  // Normalize price direction by that timeframe's volatility. This remains useful
  // when EMA/RSI are not perfectly aligned, unlike the former all-or-nothing rule.
  const emaSignal=(100*(ema20-ema50)/last)/relativeAtr;
  const momentumSignal=returnPct/relativeAtr;
  const rsiSignal=(relativeRsi-50)/25;
  const score=clamp(emaSignal*.55+momentumSignal*.30+rsiSignal*.15,-1.5,1.5);
  const trend=score>.20?'up':score<-.20?'down':'range';
  return {last,ema20,ema50,rsi:relativeRsi,returnPct,atrPct:relativeAtr,score,strength:clamp(Math.abs(score)/.9,0,1),trend,recommended:trend==='up'?'long':trend==='down'?'short':'neutral'};
}
export function combineTrend(frames){
  if(!Array.isArray(frames)||frames.length!==3)throw Error('趋势分析需要 15m、1h、4h 三个周期');
  const [m15,h1,h4]=frames;
  const score=clamp(m15.score*.45+h1.score*.35+h4.score*.20,-1.5,1.5);
  const trend=score>.18?'up':score<-.18?'down':'range';
  const strength=clamp(Math.abs(score)/.9,0,1);
  const label=x=>x.trend==='up'?'偏多':x.trend==='down'?'偏空':'震荡';
  return {trend,recommended:trend==='up'?'long':trend==='down'?'short':'neutral',strength,score,price:m15.last,atrPct:m15.atrPct,detail:`15m ${label(m15)}｜1h ${label(h1)}｜4h ${label(h4)}；RSI(15m) ${m15.rsi.toFixed(1)}，综合方向强度 ${(strength*100).toFixed(0)}%（EMA、动量、RSI 按各周期波动率归一）。`,frames};
}
