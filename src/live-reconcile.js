// PopDEX live order reconciliation. Read-only polling plus fill-driven replacement.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const unwrap = j => j?.data ?? j?.result ?? j ?? {};
const listOf = x => Array.isArray(x) ? x : (x?.list || x?.rows || x?.orders || x?.fills || []);

export function attachLiveReconciliation(LiveClass) {
  LiveClass.prototype._rpc = async function(method, params=[]) {
    const r = await fetch(this.c.rpcUrl, {
      method:'POST',
      headers:{'content-type':'application/json',Origin:'https://app.popdex.xyz',Referer:'https://app.popdex.xyz/'},
      body:JSON.stringify({jsonrpc:'2.0',method,params,id:String(Date.now())}),
      signal:AbortSignal.timeout(10000)
    });
    const text=await r.text(); let j;
    try { j=JSON.parse(text); } catch { throw Error(`PopDEX RPC 返回非 JSON：${text}`); }
    if (!r.ok || j.error) throw Error(j?.error?.message || `PopDEX RPC HTTP ${r.status}`);
    return j.result;
  };
  LiveClass.prototype.waitReceipt = async function(txHash, timeoutMs=30000) {
    const end=Date.now()+timeoutMs;
    while(Date.now()<end){
      const receipt=await this._rpc('eth_getTransactionReceipt',[txHash]);
      if(receipt){
        const ok=receipt.status===undefined||receipt.status==='0x1'||receipt.status===1||receipt.status==='0x01';
        if(!ok){let failure='';try{failure=JSON.stringify(await this._rpc('core_getTransactionFailure',[txHash]))}catch{}throw Error(`交易回执失败：${txHash}${failure?`，${failure}`:''}`);}
        return receipt;
      }
      await new Promise(r=>setTimeout(r,1000));
    }
    throw Error(`等待交易回执超时：${txHash}`);
  };
  LiveClass.prototype._accountGet = async function(path, query={}) {
    const u=new URL(`https://api.popdex.xyz${path}`);
    for(const [k,v] of Object.entries(query)) if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,String(v));
    const headers={Accept:'application/json',Origin:'https://app.popdex.xyz',Referer:'https://app.popdex.xyz/',website:'mix',terminaltype:'1',language:'en',locale:'en',enterPointSource:'web'};
    const token=this.c.apiToken;
    if(token){headers.Authorization=`Bearer ${token}`;headers['dy-token']=token;}
    const r=await fetch(u,{headers,signal:AbortSignal.timeout(10000)}); const text=await r.text(); let j;
    try{j=JSON.parse(text)}catch{throw Error(`PopDEX 账户接口返回非 JSON：${text}`)}
    if(!r.ok || (j?.code!==undefined && !['200','0',200,0].includes(j.code))) throw Error(j?.msg||`账户接口 HTTP ${r.status}`);
    return unwrap(j);
  };
  LiveClass.prototype.reconcile = async function() {
    const wallet=this.c.mainAccount;
    const [orders, fills] = await Promise.all([
      this._accountGet(`/api/v1/account/${wallet}/orders`,{limit:100,symbol:this.c.symbol||'BTCUSDT'}),
      this._accountGet(`/api/v1/account/${wallet}/trade/fills`,{limit:100,symbol:this.c.symbol||'BTCUSDT'})
    ]);
    return {open:listOf(orders),fills:listOf(fills),at:Date.now()};
  };
  LiveClass.prototype.cancelOrder = async function(order) {
    const orderId = BigInt(order?.orderId ?? order?.id ?? 0);
    const client = order?.clientOrderId || order?.clientId || '0x' + '00'.repeat(32);
    const clientBytes = client.startsWith?.('0x') ? client : '0x' + Buffer.from(String(client)).toString('hex').padEnd(64,'0').slice(0,64);
    const data = this.cancelIface.encodeFunctionData('cancelOrder',[this.c.mainAccount,orderId,clientBytes]);
    const raw = await this.wallet.signTransaction({to:this.orderContract,data,nonce:Date.now(),gas:1000000,gasPrice:0,type:0,chainId:2184});
    const txHash=await this._rpc('eth_sendRawTransaction',[raw]);
    await this.waitReceipt(txHash);
    return {txHash,orderId:String(orderId)};
  };
  LiveClass.prototype.waitUntilOrderGone = async function(orderId, timeoutMs=30000) {
    const end=Date.now()+timeoutMs;
    while(Date.now()<end){
      const r=await this.reconcile();
      const found=r.open.some(x=>String(x.orderId??x.id??'')===String(orderId));
      if(!found)return true;
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    throw Error(`撤单回执成功但官方订单仍存在：${orderId}`);
  };
  LiveClass.prototype.cancelAndConfirm = async function(order) {
    const result=await this.cancelOrder(order);
    await this.waitUntilOrderGone(result.orderId);
    return {...result,cancelled:true};
  };
  LiveClass.prototype.cancelAll = async function(orders=[]) { const results=[]; for(const order of orders) results.push(await this.cancelAndConfirm(order)); return results; };
}

export function orderSide(x){return String(x?.side||x?.orderSide||'').toLowerCase().includes('sell')?'sell':'buy';}
export function orderPrice(x){return Number(x?.price ?? x?.orderPrice ?? x?.avgPrice ?? x?.execPrice ?? 0);}
export function fillKey(x){return String(x?.tradeId||x?.fillId||x?.id||`${x?.orderId||''}:${x?.execTime||x?.timestamp||''}:${orderPrice(x)}`);}
export { sleep };
