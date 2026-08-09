import { deterministic, scoreOpportunity } from './api/analyze.js';
const items=deterministic('earn money',0);
if(items.length!==3) throw new Error('expected 3 ranked opportunities');
if(items.some(x=>x.capital>0)) throw new Error('capital filter failed');
if(items.some((x,i)=>x.rank!==i+1)) throw new Error('ranking failed');
if(!(scoreOpportunity({payout:100,probability:.5,daysToCash:10,effortHours:5,capital:0})>0)) throw new Error('score failed');
console.log('OpportunityOS tests passed:', items.map(x=>`${x.rank}:${x.name}`).join(' | '));
