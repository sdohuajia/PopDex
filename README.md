# PopDEX 主网网格交易机器人

本项目是一个本地仪表盘形式的 PopDEX 网格机器人，参考 `3xx-wangge` 的核心策略：等间距算术网格、初始两侧挂单、成交后相邻反向补单，支持中性/做多/做空三种模式。趋势分析使用 15m、1H、4H 多周期 EMA20/EMA50、RSI、ATR 进行只读判断，不会自动改变网格或下单。Telegram 仅推送分析报告和风控哨兵，不推送买卖成交、同步异常或普通运行错误。

# 8.19 修复已知的下单bug

# 8.15 修复了无法授权agent问题

# 8.14 更新了K线图趋势分析bug以及env填写问题

# 8.13 脚本发布

## 启动仪表盘

```powershell
cd <项目目录>
Copy-Item .env.example .env
# 填写 .env 中的主网配置
npm install
npm start
```

然后浏览器打开 `http://127.0.0.1:8080`。

仪表盘支持：自动读取 PopDEX Futures/Spot 全部 Trading 交易对供选择，选择后自动填充 symbolId 并加载 K 线；可进行趋势分析，一键采用推荐的 long/short/neutral 策略和自动区间；还支持前端保存/修改网格策略，保存/修改主网执行信息，启动/停止、查看价格、网格层级、活动订单、成交和运行日志。服务默认监听 `0.0.0.0:8080`，可通过服务器公网 IP 访问。启动服务本身不会创建策略或发送订单；只有在页面确认点击“启动主网网格”后才会执行。

## 主网配置

`.env.example` 已预填 PopDEX Mainnet 的公开接口：

```ini
MODE=live
POPDEX_NETWORK=mainnet
POPDEX_API_BASE=https://api.popdex.xyz
POPDEX_PUBLIC_WS=wss://ws.popdex.xyz/v1/ws/public
POPDEX_TICKER_PATH=/api/v1/public/market/tickers
POPDEX_TICKER_JSON_PATH=data.0.lastPrice
POPDEX_API_CATEGORY=Futures
```

实盘启动前，普通使用只需要在 PopDEX 页面的钱包授权区域填写 **Agent 私钥** 和 **主账户地址**；也可以连接钱包自动读取主账户地址。交易对、K线周期、网格上下边界、网格数量、网格模式、每格数量和杠杆均在前端选择/填写。

`.env` 中不需要再填写交易对、RPC、订单合约、Symbol ID、Category 或 Position Side；这些固定的 PopDEX 运行参数由程序默认提供，市场和策略参数由前端处理。只需要填写：

```ini
POPDEX_AGENT_PRIVATE_KEY=0x<已授权 Agent Account 私钥>
POPDEX_MAIN_ACCOUNT=0x<主账户地址>
```

私钥只能是经主账户链上授权、仅用于交易的 **Agent Account** 私钥；不要填写主钱包私钥。

## Agent Key 创建与链上授权

仪表盘新增了 **创建并授权 Agent Key** 卡片；启动服务不触发它。

1. 点击“生成 Agent Key”。页面会生成一个独立的私钥和 Agent 地址，并仅在当前页面显示一次；立即复制并离线保存私钥。
2. 在安装了 OKX Wallet 扩展的浏览器打开 `http://127.0.0.1:8080`。
3. 让 OKX Wallet 连接主账户；如果当前不在 PopDEX Mainnet，页面会自动请求添加并切换网络。
4. 点击“连接钱包并授权”，确认钱包弹出的 `approveAgent` 链上交易。
5. 钱包返回交易哈希后，等待链上确认；Agent 私钥已经自动填入本地前端的执行设置框。
6. 再填写其余交易参数并选择保存。此操作依然不会启动网格。

授权交易目标为 PopDEX Account 预编译 `0x0000000000000000000000000000000000001008`，调用 `approveAgent(...)`。创建/授权 Agent 与启动网格是两个分离动作：授权不会下单。
## 前端设置与主网操作边界

- 页面中的“保存策略设置”和“保存主网设置”只写入当前后端内存，不启动策略、不写入磁盘、也不广播交易；\n- Agent 私钥输入框不回显现有私钥；如果 `.env` 中已有私钥，页面只显示已配置状态。\n- “启动主网网格”会依照当前页面配置调用 PopDEX `placeOrder(...)` 广播限价单；启动服务本身不会自动执行策略；
- 如果现价不在设定的网格区间内，程序拒绝启动；
- “停止程序”不会撤销已经在链上的订单；
- 当前版本在主网已支持初始限价网格下单和仪表盘监控；自动成交对账、撤单和成交后链上补单必须在确认 PopDEX 的账户级 Fill / Pending Order API 中订单 ID 映射后再启用，因此主网 UI 会清晰显示这一约束；
- 可先把 `MODE=paper` 用于不广播交易的本地策略演练。

## 测试

```powershell
npm test
```




