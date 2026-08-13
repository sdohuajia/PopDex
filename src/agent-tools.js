import { Interface, Wallet, ZeroHash, encodeBytes32String } from 'ethers';
const ACCOUNT_PRECOMPILE='0x0000000000000000000000000000000000001008';
const abi=['function approveAgent(address agent,address delegator,bytes32 name,uint64 expiresAt,uint64 initialNonce,bool isGlobal) external'];
export function createAgentKey(){const wallet=Wallet.createRandom();return {agentAddress:wallet.address,agentPrivateKey:wallet.privateKey};}
export function prepareAgentApproval({agentAddress,delegator,name='',expiresAt=0,isGlobal=true}){if(!agentAddress||!delegator)throw Error('agentAddress and delegator are required');const initialNonce=BigInt(Date.now());const label=name?encodeBytes32String(String(name).slice(0,31)):ZeroHash;const data=new Interface(abi).encodeFunctionData('approveAgent',[agentAddress,delegator,label,BigInt(expiresAt),initialNonce,Boolean(isGlobal)]);return {to:ACCOUNT_PRECOMPILE,data,value:'0x0',initialNonce:initialNonce.toString(),chainId:2184};}
