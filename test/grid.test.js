import assert from 'node:assert/strict';
import { buildGrid, seedOrders, replacementFor } from '../src/grid.js';
const g=buildGrid({lower:100,upper:200,gridCount:10}); assert.deepEqual([g.spacing,g.levels.length],[10,11]);
const orders=seedOrders({...g,price:151,mode:'neutral'}); assert(orders.some(x=>x.side==='buy'&&x.price===140)); assert(orders.some(x=>x.side==='sell'&&x.price===160));
assert.deepEqual(replacementFor({side:'buy',levelIndex:3},g.levels,'neutral'),{levelIndex:4,price:140,side:'sell',reduceOnly:false});
assert.equal(replacementFor({side:'sell',levelIndex:0},g.levels,'neutral'),null); console.log('grid tests passed');

