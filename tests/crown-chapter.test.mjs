import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DialogueSystem } from '../src/dialogue/DialogueSystem.ts';
import { DIALOGUES } from '../src/dialogue/dialogues.ts';
import { CROWN_DIALOGUES } from '../src/dialogue/crownDialogues.ts';
import { resolveInteraction } from '../src/world/InteractionResolver.ts';
import { synchronizeCentralQuestFlags, centralChapterDialogue } from '../src/world/CentralTowerQuest.ts';
import { BattleSystem } from '../src/battle/BattleSystem.ts';
import { createAsh, createIone, createNox, createSera, createDefaultInventory } from '../src/battle/battleData.ts';
import { statsForLevel, knownSpellsAtLevel } from '../src/progression/levelData.ts';
import { EQUIPMENT } from '../src/progression/equipmentData.ts';
import { SaveManager } from '../src/core/SaveManager.ts';

const map = async id => JSON.parse(await readFile(new URL(`../public/assets/maps/${id}.json`,import.meta.url),'utf8'));
const layer = (m,name) => m.layers.find(l=>l.name===name).objects;
const props = o => Object.fromEntries(o.properties.map(p=>[p.name,p.value]));
const interaction = o => ({...props(o),kind:props(o).interactionKind});
const collision = m => m.layers.find(l=>l.name==='collision').data;
function reachable(m,start,flags=new Set()) {
  const blocks=new Set(),seen=new Set([start.join(',')]),queue=[start];
  for(const o of layer(m,'interactions'))if(props(o).interactionKind==='barrier'&&!flags.has(props(o).requiredFlag)) {
    for(let y=o.y/16;y<(o.y+o.height)/16;y++)for(let x=o.x/16;x<(o.x+o.width)/16;x++)blocks.add(`${x},${y}`);
  }
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const [x,y]=[queue[i][0]+dx,queue[i][1]+dy],key=`${x},${y}`;
    if(x<0||y<0||x>=m.width||y>=m.height||collision(m)[y*m.width+x]||blocks.has(key)||seen.has(key))continue;
    seen.add(key);queue.push([x,y]);
  }
  return seen;
}
class Input {
  pressed=new Set();clearPresses(){this.pressed.clear();}consumePress(action){return this.pressed.delete(action);}
}
test('the Weather record opens the Crown causeway but retreat is always possible',async()=>{
  const m=await map('crown-causeway');
  assert.ok(reachable(m,[3,30]).has('1,30'));
  assert.equal(reachable(m,[3,30]).has('39,1'),false);
  assert.ok(reachable(m,[3,30],new Set(['quest.weather-record-recovered'])).has('39,1'));
  const ridge=await map('stormbreak-ridge');
  assert.ok(reachable(ridge,[36,4],new Set(['quest.launch-cradle-online'])).has('45,12'));
});
test('all testimonies are accessible, but a wrong order never authenticates the charter',async()=>{
  const m=await map('crown-archives'),flags=new Set(),inventory=createDefaultInventory();
  const records=layer(m,'interactions').filter(o=>props(o).interactionKind==='control-console');
  const terminal=interaction(layer(m,'interactions').find(o=>props(o).interactionKind==='archive-authenticator'));
  assert.equal(resolveInteraction(terminal,inventory,flags).changed,false);
  for(const [i,o] of records.entries()) {
    assert.ok(reachable(m,[24,36]).has(`${o.x/16},${o.y/16+1}`),o.name);
    resolveInteraction(interaction(o),inventory,flags);synchronizeCentralQuestFlags(flags);
    assert.equal(flags.has('crown.evidence-complete'),i===2);
    assert.equal(reachable(m,[24,36],flags).has('24,1'),false);
  }
  const input=new Input(),dialogue=new DialogueSystem(input);
  const open=()=>dialogue.start('crown-authenticate',()=>resolveInteraction(terminal,inventory,flags));
  const press=key=>{input.pressed.add(key);dialogue.update(0);};
  for(const choice of [1,2]) {
    open();dialogue.update(100);
    for(let i=0;i<choice;i++)press('down');
    press('confirm');dialogue.update(100);press('confirm');
    assert.equal(dialogue.active,false);
    assert.equal(flags.has('crown.order-authenticated'),false);
  }
  open();dialogue.update(100);press('confirm');dialogue.update(100);press('confirm');
  assert.ok(flags.has('crown.order-authenticated'));
  assert.ok(reachable(m,[24,36],flags).has('24,1'));
  assert.equal(resolveInteraction(terminal,inventory,flags).changed,false);
});
test('every Crown landing is clear, off its exit trigger, and has a route back',async()=>{
  const flags=new Set(['quest.weather-record-recovered','quest.launch-cradle-online','crown.order-authenticated','crown.judicator-defeated']);
  for(const [id,start] of [['crown-causeway',[3,30]],['crown-archives',[24,36]],['crown-sanctum',[16,26]]]) {
    const m=await map(id),seen=reachable(m,start,flags);
    for(const t of layer(m,'triggers')) {
      const p=props(t),target=await map(p.targetMap);
      assert.equal(collision(target)[p.targetY*target.width+p.targetX],0,`${id}:${t.name}`);
      for(const other of layer(target,'triggers'))assert.ok(!(p.targetX*16>=other.x&&p.targetX*16<other.x+other.width&&p.targetY*16>=other.y&&p.targetY*16<other.y+other.height));
      assert.ok(seen.has(`${Math.floor((t.x+t.width/2)/16)},${t.y/16}`),`${id}:${t.name} cannot be reached`);
    }
    for(const o of layer(m,'interactions').filter(o=>props(o).interactionKind!=='barrier'))assert.ok(seen.has(`${o.x/16},${o.y/16+1}`),`${id}:${o.name} has no approach`);
  }
});
test('the peaceful Judgment hall locks the command and reward until its guardian is defeated',async()=>{
  const m=await map('crown-sanctum'),flags=new Set(),inventory=createDefaultInventory();
  assert.equal(layer(m,'encounters').length,0);
  assert.ok(reachable(m,[16,26]).has('16,29'));
  assert.equal(reachable(m,[16,26]).has('16,5'),false);
  for(const o of layer(m,'interactions').filter(o=>props(o).interactionKind!=='barrier'))assert.equal(resolveInteraction(interaction(o),inventory,flags).changed,false);
  const boss=props(layer(m,'entities')[0]);assert.equal(boss.hiddenFlag,boss.defeatFlag);
  flags.add(boss.defeatFlag);
  for(const o of layer(m,'interactions').filter(o=>props(o).interactionKind!=='barrier')) {
    assert.equal(resolveInteraction(interaction(o),inventory,flags).changed,true);
    assert.equal(resolveInteraction(interaction(o),inventory,flags).changed,false);
  }
  assert.ok(flags.has('quest.crown-command-restored'));
  assert.equal(centralChapterDialogue('vesper-engineer',flags),'rhea-crown-after');
});
test('Crown dialogue fits, its gear improves prior equipment, and records survive saves',()=>{
  for(const [id,node] of Object.entries(CROWN_DIALOGUES)) {
    let lines=1,line='';
    for(const word of node.text.split(' '))if((line?line+' '+word:word).length>52&&line){lines++;line=word;}else line=line?line+' '+word:word;
    assert.ok(lines<=3,id);
    for(const next of [node.next,...(node.choices??[]).map(c=>c.next)].filter(Boolean))assert.ok(DIALOGUES[next],next);
  }
  for(const [next,old,stat] of [['crown-lash','prism-lash','attack'],['oath-mail','aeroweave-mail','defense'],['witness-core','vector-core','defense'],['crown-aegis','skyglass-guard','defense']])assert.ok(EQUIPMENT[next][stat]>EQUIPMENT[old][stat]);
  const records=new Map();globalThis.localStorage={get length(){return records.size;},key:i=>[...records.keys()][i]??null,getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
  const saves=new SaveManager(),ash=createAsh(),ione=createIone();ione.equipment.weapon='crown-lash';
  const gear=['crown-lash','oath-mail','witness-core','crown-aegis'];
  const old={version:13,savedAt:1,mapId:'lumen-hollow',player:{x:160,y:160,direction:'down'},worldFlags:['existing.old-record'],party:{activeMemberIds:['ash'],roster:[ash]},inventory:createDefaultInventory()};
  saves.save(old,2);
  const untouched=records.get('science-fantasy-jrpg-manual-save-slot-2');
  saves.save({...old,mapId:'crown-archives',worldFlags:['crown.foundation-read','crown.evacuation-read','crown.override-read','crown.order-authenticated'],party:{activeMemberIds:['ash','ione'],roster:[ash,ione]},inventory:{...createDefaultInventory(),gear}},1);
  const loaded=saves.loadSlot(1);assert.deepEqual(loaded.inventory.gear,gear);assert.equal(loaded.party.roster[1].equipment.weapon,'crown-lash');
  const flags=new Set(loaded.worldFlags);synchronizeCentralQuestFlags(flags);assert.ok(flags.has('crown.evidence-complete'));
  assert.equal(records.get('science-fantasy-jrpg-manual-save-slot-2'),untouched);
});
test('the Judicator announces its verdict and an equipped level-26 quartet can win',()=>{
  const members=[createAsh(),createIone(),createNox(),createSera()],weapons=['thunder-edge','crown-lash','ion-carbine','tempest-disc'];
  members.forEach((m,i)=>{
    Object.assign(m,statsForLevel(m.id,26));m.level=26;m.hp=m.maxHp;m.mp=m.maxMp;m.spells=knownSpellsAtLevel(m.id,26);
    m.equipment={weapon:weapons[i],armor:['oath-mail','pressure-mantle','aeroweave-mail','aurora-mantle'][i],shield:'skyglass-guard',core:i===1?'witness-core':'vector-core'};
  });
  const input=new Input(),battle=new BattleSystem(input),inventory=createDefaultInventory();
  let outcome=null,sawWarning=false;const random=Math.random;Math.random=()=>0.5;
  try {
    battle.start({activeMemberIds:members.map(m=>m.id),roster:members},inventory,'crown-judicator',result=>{outcome=result;});
    for(let tick=0;tick<8000&&battle.active;tick++) {
      const view=battle.view(),charged=view.enemies.some(e=>e.intent==='VERDICT PULSE');if(charged)sawWarning=true;
      if(view.acceptingCommand) {
        if(view.targetingEnemy)input.pressed.add('confirm');
        else if(view.choosingSpell)input.pressed.add(view.availableSpells[view.selectedSpell]==='renewal-wave'?'confirm':'down');
        else {
          const heal=view.activeMemberId==='ione'&&members[1].mp>=12&&members.some(m=>m.hp>0&&m.hp<m.maxHp*0.7);
          const action=heal?1:charged?3:0;
          input.pressed.add(view.selectedAction===action?'confirm':(view.selectedAction<3)!==(action<3)?(action<3?'left':'right'):'down');
        }
      }else if(view.results)input.pressed.add('confirm');
      battle.update(0.15);
    }
    assert.equal(outcome,'victory');assert.ok(sawWarning);assert.ok(members.every(m=>m.hp>0));
  }finally{Math.random=random;}
});
