import https from 'node:https';

function telegramRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const u=new URL(url);
    const req=https.request({hostname:u.hostname,path:u.pathname,method:'POST',family:4,timeout:10000,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)}},res=>{let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>{try{resolve({status:res.statusCode||0,json:JSON.parse(data||'{}')})}catch(e){reject(e)}})});
    req.on('timeout',()=>req.destroy(Error('Telegram 请求超时'))); req.on('error',reject); req.write(payload); req.end();
  });
}

export async function sendTelegram(text, env=process.env) {
  const token=String(env.TELEGRAM_BOT_TOKEN||'').trim();
  const chatId=String(env.TELEGRAM_CHAT_ID||'').trim();
  if(!token||!chatId) return {ok:false,skipped:true,reason:'未配置 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID'};
  const payload=JSON.stringify({chat_id:chatId,text:String(text).slice(0,3900),disable_web_page_preview:true});
  const r=await telegramRequest(`https://api.telegram.org/bot${token}/sendMessage`,payload);
  if(r.status<200||r.status>=300||r.json.ok!==true) throw Error(r.json.description||`Telegram HTTP ${r.status}`);
  return {ok:true,messageId:r.json.result?.message_id??null};
}
