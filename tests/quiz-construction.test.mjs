import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constructionState} from '../quiz/construction-state.js';
import {existsSync} from 'node:fs';
test('every floor and project branch has four construction plates',()=>{
 for(const detail of ['ground','g1','g2','g3']){
  const s=constructionState({type:'home',detail},5);assert.equal(s.variant,`home-${detail}`);
  for(let i=0;i<4;i++)assert.ok(existsSync(`public/construction/${s.variant}/${i}.webp`));
 }
 for(const type of ['pg','commercial','interiors']){
  const s=constructionState({type},0);assert.equal(s.variant,type);
  for(let i=0;i<4;i++)assert.ok(existsSync(`public/construction/${type}/${i}.webp`));
 }
});
test('construction advances to complete and back navigation restores an earlier stage',()=>{
 const answers={type:'home',detail:'g2',budget:'20to50',timeline:'now',concerns:['quality'],map:'help'};
 const values=Array.from({length:10},(_,i)=>constructionState(answers,i).progress);
 assert.ok(values.every((v,i)=>i===0||v>=values[i-1]));assert.equal(values[9],3);
 assert.ok(constructionState(answers,5).progress<3);assert.equal(constructionState(answers,6).duration,1000);
});
