# PopDEX 主网网格交易机器人

本项目是一个本地仪表盘形式的 PopDEX 网格机器人，参考 `3xx-wangge` 的核心策略：等间距算术网格、初始两侧挂单、成交后相邻反向补单，支持中性/做多/做空三种模式。

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

`.env.example` 已预填 PopDEX Mainnet 的公开接口，但公开副本默认使用安全的 `MODE=paper`，不会发送链上交易。只有在本地完成配置并明确改为 `MODE=live` 后，才会进入实盘流程：

```ini
MODE=paper
POPDEX_NETWORK=mainnet
POPDEX_API_BASE=https://api.popdex.xyz
POPDEX_PUBLIC_WS=wss://ws.popdex.xyz/v1/ws/public
POPDEX_TICKER_PATH=/api/v1/public/market/tickers
POPDEX_TICKER_JSON_PATH=data.0.lastPrice
POPDEX_API_CATEGORY=Futures
```

实盘配置时，用户通常只需要填写两个与自己账户相关的值：

```ini
# 主账户地址：用于存放资金、持仓和挂单
POPDEX_MAIN_ACCOUNT=0x<你的主钱包地址>

# Agent 钱包私钥：只能填写专门创建的 Agent 钱包私钥
POPDEX_AGENT_PRIVATE_KEY=0x<Agent 钱包私钥>
```

以下参数由公开配置和前端自动读取/预填，一般不需要用户手动修改：

- 交易对：前端从 PopDEX Trading 市场列表读取，默认优先选择 `BTCUSDT`
- `POPDEX_RPC_URL`
- `POPDEX_ORDER_CONTRACT`
- `POPDEX_SYMBOL_ID`
- `POPDEX_CATEGORY`
- `POPDEX_POSITION_SIDE`
- Futures API 地址和公开行情接口
- 网格默认数量、每格数量、杠杆和轮询间隔

如果用户选择其他交易对，前端会根据市场列表自动读取对应的市场信息；不要随意手动填写不匹配的 symbol ID 或合约参数。

## 创建 Agent 钱包并授权

Agent 钱包不是主钱包，也不是交易资金账户。它只是一个由脚本使用私钥进行签名的独立钱包。推荐使用 OKX Wallet 创建一个新的独立钱包作为 Agent。

### 1. 在 OKX Wallet 创建独立 Agent 钱包

1. 打开 OKX Wallet，创建一个新的钱包/账户。
2. 不要使用主钱包作为 Agent。
3. 导出并离线保存这个新钱包的私钥。
4. 记录这个新钱包的地址，确认它与私钥匹配。
5. Agent 钱包不需要存放资金，不要把主账户资产转入 Agent 钱包。

### 2. 填写本地配置

复制配置文件：

```bash
cp .env.example .env
```

编辑 `.env`，只填写：

```ini
MODE=live
POPDEX_MAIN_ACCOUNT=0x<你的主钱包地址>
POPDEX_AGENT_PRIVATE_KEY=0x<新建 Agent 钱包的私钥>
```

`POPDEX_MAIN_ACCOUNT` 是主钱包地址；`POPDEX_AGENT_PRIVATE_KEY` 必须是新建 Agent 钱包的私钥，二者不是同一个钱包。

### 3. 用主钱包授权 Agent 地址

1. 在安装了 OKX Wallet 的浏览器打开仪表盘。
2. 连接主钱包，而不是 Agent 钱包。
3. 确认网络为 PopDEX Mainnet，Chain ID 为 `2184`。
4. 在 PopDEX 的 Agent/账户授权页面，将新建 Agent 钱包的地址添加为 Agent。
5. 使用主钱包确认授权交易。
6. 等待交易在链上确认。

授权关系必须是：

```text
主钱包 / 主账户  --授权-->  Agent 钱包地址
Agent 私钥       --签名-->  网格脚本下单
```

授权交易目标为 PopDEX Account 预编译：

```text
0x0000000000000000000000000000000000001008
```

对应调用为 `approveAgent(...)`。授权只建立 Agent 权限，不会自动启动网格，也不会自动下单。

### 4. 启动前检查

```bash
# 确认私钥没有提交到 GitHub
git status --short
# 保护本地配置文件
chmod 600 .env
```

确认 `.gitignore` 包含：

```text
.env
.runtime-state.json
*.log
node_modules/
```

启动服务本身不会下单。只有在前端明确点击“启动 PopDEX 网格”后，脚本才会根据当前策略向主账户提交订单。
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




