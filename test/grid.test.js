import assert from 'node:assert/strict';
import { buildGrid, seedOrders, replacementFor } from '../src/grid.js';
import { GridRunner } from '../src/runner.js';
const g=buildGrid({lower:100,upper:200,gridCount:10}); assert.deepEqual([g.spacing,g.levels.length],[10,11]);
const orders=seedOrders({...g,price:151,mode:'neutral'}); assert(orders.some(x=>x.side==='buy'&&x.price===140)); assert(orders.some(x=>x.side==='sell'&&x.price===160));
assert.deepEqual(replacementFor({side:'buy',levelIndex:3},g.levels,'neutral'),{levelIndex:4,price:140,side:'sell',reduceOnly:false});
assert.equal(replacementFor({side:'sell',levelIndex:0},g.levels,'neutral'),null);

// PopDEX BTCUSDT's tickSize is 1: every generated grid price must be an integer.
const tickGrid=buildGrid({lower:61000,upper:62000,gridCount:6,tickSize:1});
assert.deepEqual(tickGrid.levels,[61000,61167,61333,61500,61667,61833,62000]);
assert(tickGrid.levels.every(price=>Number.isInteger(price)));

// This public bot is real-trading only: paper and one-order test switches must not exist.
const liveRunner=new GridRunner({});
assert.equal(liveRunner.settings.mode,'live');
assert.deepEqual(Object.keys(liveRunner.settings).filter(k=>k.startsWith('live')&&k.endsWith('Only')),[]);
const envPaperRunner=new GridRunner({MODE:'paper'});
assert.equal(envPaperRunner.settings.mode,'live');
console.log('grid tests passed');
