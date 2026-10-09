import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolveInteraction } from '../src/world/InteractionResolver.ts';
import { synchronizeCentralQuestFlags } from '../src/world/CentralTowerQuest.ts';
import { DIALOGUES } from '../src/dialogue/dialogues.ts';
import { WEATHER_DIALOGUES } from '../src/dialogue/weatherDialogues.ts';
import { createDefaultInventory, createAsh, createIone, createNox, createSera } from '../src/battle/battleData.ts';
import { BattleSystem } from '../src/battle/BattleSystem.ts';
import { statsForLevel, knownSpellsAtLevel } from '../src/progression/levelData.ts';
import { EQUIPMENT } from '../src/progression/equipmentData.ts';
import { SaveManager } from '../src/core/SaveManager.ts';

const map = async id => JSON.parse(await readFile(new URL(`../public/assets/maps/${id}.json`,import.meta.url),'utf8'));
const objects = (m,name) => m.layers.find(l=>l.name===name).objects;
const props = o => Object.fromEntries(o.properties.map(p=>[p.name,p.value]));
const tileData = m => m.layers.find(l=>l.name==='collision').data;
function reachable(m,start,flags=new Set()) {
  const blocks=new Set();
  for(const o of objects(m,'interactions')) if(props(o).interactionKind==='barrier'&&!flags.has(props(o).requiredFlag)) {
    for(let y=o.y/16;y<(o.y+o.height)/16;y++)for(let x=o.x/16;x<(o.x+o.width)/16;x++)blocks.add(`${x},${y}`);
  }
  const queue=[start],seen=new Set([start.join(',')]);
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const [x,y]=[queue[i][0]+dx,queue[i][1]+dy],key=`${x},${y}`;
    if(x<0||y<0||x>=m.width||y>=m.height||tileData(m)[y*m.width+x]||blocks.has(key)||seen.has(key))continue;
    seen.add(key);queue.push([x,y]);
  }
  return seen;
}
test('weather regulators both remain reachable while either alone cannot open the eye',async()=>{
  const m=await map('weather-dome'),flags=new Set(),inventory=createDefaultInventory();
  const switches=objects(m,'interactions').filter(o=>props(o).interactionKind==='control-console');
  for(const o of switches)assert.ok(reachable(m,[22,32]).has(`${o.x/16},${o.y/16+1}`),o.name);
  assert.equal(reachable(m,[22,32]).has('22,1'),false);
  for(const o of switches){
    resolveInteraction({...props(o),kind:'control-console'},inventory,flags);
    synchronizeCentralQuestFlags(flags);
    assert.equal(reachable(m,[22,32],flags).has('22,1'),flags.has('weather.pressure-stable')&&flags.has('weather.charge-stable'));
  }
  for(const o of objects(m,'interactions').filter(o=>props(o).interactionKind==='cache')){
    assert.ok(reachable(m,[22,32]).has(`${o.x/16},${o.y/16+1}`),o.name);
    const p={...props(o),kind:'cache'};
    assert.equal(resolveInteraction(p,inventory,flags).changed,true);
    assert.equal(resolveInteraction(p,inventory,flags).changed,false);
  }
});
test('weather transitions have clear landings, retraceable exits and persistent boss locks',async()=>{
  for(const id of ['skyglass-relay','stormbreak-ridge','weather-dome','weather-eye']){
    const m=await map(id);
    for(const o of objects(m,'triggers')){
      const p=props(o),target=await map(p.targetMap);
      assert.equal(tileData(target)[p.targetY*target.width+p.targetX],0,`${id}:${o.name}`);
      for(const t of objects(target,'triggers'))assert.ok(!(p.targetX*16>=t.x&&p.targetX*16<t.x+t.width&&p.targetY*16>=t.y&&p.targetY*16<t.y+t.height));
    }
  }
  const ridge=await map('stormbreak-ridge');
  assert.ok(reachable(ridge,[3,29],new Set(['quest.launch-cradle-online'])).has('36,1'));
  const eye=await map('weather-eye');
  assert.equal(objects(eye,'encounters').length,0);
  assert.ok(reachable(eye,[15,24]).has('15,27'));
  assert.equal(reachable(eye,[15,24]).has('15,5'),false);
  const terminal={...props(objects(eye,'interactions').find(o=>o.name==='weather-command-record')),kind:'control-console'};
  const flags=new Set(),inventory=createDefaultInventory();
  assert.equal(resolveInteraction(terminal,inventory,flags).changed,false);
  flags.add('weather.regent-defeated');
  assert.ok(reachable(eye,[15,24],flags).has('15,5'));
  assert.equal(resolveInteraction(terminal,inventory,flags).changed,true);
  assert.ok(flags.has('quest.weather-record-recovered'));
});
test('weather conversations fit the dialogue box and every reward survives a save round trip',()=>{
  for(const [id,node] of Object.entries(WEATHER_DIALOGUES)){
    let lines=1,line='';
    for(const word of node.text.split(' ')){
      if((line?line+' '+word:word).length>52&&line){lines++;line=word;}else line=line?line+' '+word:word;
    }
    assert.ok(lines<=3,`${id} needs ${lines} lines`);
    if(node.next)assert.ok(DIALOGUES[node.next]);
  }
  const data=new Map();
  globalThis.localStorage={get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const saves=new SaveManager(),member=createNox();member.equipment.weapon='ion-carbine';
  const gear=['thunder-edge','ion-carbine','tempest-disc','pressure-mantle'];
  for(const id of gear)assert.ok(EQUIPMENT[id]);
  saves.save({version:13,savedAt:1,mapId:'weather-eye',player:{x:242,y:384,direction:'down'},worldFlags:['weather.pressure-stable','weather.charge-stable','weather.regent-defeated','quest.weather-record-recovered'],party:{activeMemberIds:['ash','nox'],roster:[createAsh(),member]},inventory:{...createDefaultInventory(),gear}},1);
  const loaded=saves.loadSlot(1);
  assert.deepEqual(loaded.inventory.gear,gear);
  assert.equal(loaded.party.roster[1].equipment.weapon,'ion-carbine');
  assert.ok(loaded.worldFlags.includes('quest.weather-record-recovered'));
});
test('an equipped level-25 quartet can defeat the Regent, which warns before its group strike',()=>{
  const members=[createAsh(),createIone(),createNox(),createSera()];
  const weapons=['thunder-edge','prism-lash','ion-carbine','tempest-disc'];
  members.forEach((m,i)=>{
    Object.assign(m,statsForLevel(m.id,25));m.level=25;m.hp=m.maxHp;m.mp=m.maxMp;m.spells=knownSpellsAtLevel(m.id,25);
    m.equipment={weapon:weapons[i],armor:i===0||i===2?'aeroweave-mail':'aurora-mantle',shield:'skyglass-guard',core:'vector-core'};
  });
  const input={pressed:new Set(),clearPresses(){this.pressed.clear();},consumePress(a){return this.pressed.delete(a);}};
  const battle=new BattleSystem(input),inventory=createDefaultInventory();inventory.tonics=20;
  let outcome=null,sawWarning=false;const random=Math.random;Math.random=()=>0.5;
  try{
    battle.start({activeMemberIds:members.map(m=>m.id),roster:members},inventory,'tempest-regent',result=>{outcome=result;});
    for(let tick=0;tick<6000&&battle.active;tick++){
      const view=battle.view(),charged=view.enemies.some(e=>e.intent!==null);
      if(charged)sawWarning=true;
      if(view.acceptingCommand){
        if(view.targetingEnemy){
          if(view.enemies[1]?.hp>0&&view.selectedEnemyId!==view.enemies[1].combatId)input.pressed.add('right');
          else input.pressed.add('confirm');
        }else if(view.choosingSpell){
          if(view.availableSpells[view.selectedSpell]!=='renewal-wave')input.pressed.add('down');
          else input.pressed.add('confirm');
        }else{
          const heal=view.activeMemberId==='ione'&&members[1].mp>=12&&members.some(m=>m.hp>0&&m.hp<m.maxHp*0.7);
          const action=heal?1:charged?3:0;
          if(view.selectedAction!==action)input.pressed.add((view.selectedAction<3)!==(action<3)?(action<3?'left':'right'):'down');
          else input.pressed.add('confirm');
        }
      }else if(view.results)input.pressed.add('confirm');
      battle.update(0.15);
    }
    assert.equal(outcome,'victory');assert.ok(sawWarning);assert.ok(members.every(m=>m.hp>0));
  }finally{Math.random=random;}
});
