import assert from 'node:assert/strict';
import { buildGrid, seedOrders, replacementFor } from '../src/grid.js';
import { analyzeCandles, combineTrend } from '../src/trend.js';
const g=buildGrid({lower:100,upper:200,gridCount:10}); assert.deepEqual([g.spacing,g.levels.length],[10,11]);
const orders=seedOrders({...g,price:151,mode:'neutral'}); assert(orders.some(x=>x.side==='buy'&&x.price===140)); assert(orders.some(x=>x.side==='sell'&&x.price===160));
assert.deepEqual(replacementFor({side:'buy',levelIndex:3},g.levels,'neutral'),{levelIndex:4,price:140,side:'sell',reduceOnly:false});
assert.equal(replacementFor({side:'sell',levelIndex:0},g.levels,'neutral'),null);

// Regression: partially aligned but non-flat frames must report non-zero strength.
function synthetic(direction){let price=100;return Array.from({length:60},(_,i)=>{price*=1+(direction*(i%4===0?.0003:.001));return {open:price*.999,high:price*1.002,low:price*.998,close:price};});}
const mixed=combineTrend([analyzeCandles(synthetic(1)),analyzeCandles(synthetic(-1)),analyzeCandles(synthetic(-1))]);
assert(mixed.strength>0,'mixed market direction should not be reported as 0% strength');
assert(mixed.strength<=1);
console.log('grid tests passed');
