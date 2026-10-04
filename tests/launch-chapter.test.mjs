import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DIALOGUES } from "../src/dialogue/dialogues.ts";
import { resolveInteraction } from "../src/world/InteractionResolver.ts";
import { entityCollisionRect, rectanglesOverlap, playerCollisionRect } from "../src/world/ActorCollision.ts";
import { FORMATIONS, createDefaultInventory, createAsh, createIone, createNox, createSera } from "../src/battle/battleData.ts";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { statsForLevel } from "../src/progression/levelData.ts";
import { centralChapterDialogue } from "../src/world/CentralTowerQuest.ts";
import { EQUIPMENT, canEquip } from "../src/progression/equipmentData.ts";

const readMap = async id => JSON.parse(await readFile(new URL(`../public/assets/maps/${id}.json`,import.meta.url),"utf8"));
const props = o => Object.fromEntries((o.properties ?? []).map(p => [p.name,p.value]));
const objects = (map,name) => map.layers.find(l=>l.name===name).objects;
const collision = map => map.layers.find(l=>l.name==="collision").data;
function reachable(map,start,flags=new Set()) {
  const blocks=new Set();
  for(const o of objects(map,"interactions")) if(props(o).interactionKind==="barrier" && !flags.has(props(o).requiredFlag)) {
    for(let y=o.y/16;y<(o.y+o.height)/16;y++) for(let x=o.x/16;x<(o.x+o.width)/16;x++) blocks.add(`${x},${y}`);
  }
  const queue=[start],visited=new Set([start.join(",")]);
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      const key=`${nx},${ny}`;
      if(nx<0||ny<0||nx>=map.width||ny>=map.height||collision(map)[ny*map.width+nx]||blocks.has(key)||visited.has(key)) continue;
      visited.add(key);queue.push([nx,ny]);
    }
  }
  return visited;
}
test("archive carrier alone unlocks the winding cliff route; old southern landmarks stay in place", async()=>{
  const map=await readMap("windscar-cliffs");
  assert.equal(reachable(map,[3,29]).has("23,2"),false);
  assert.equal(reachable(map,[3,29],new Set(["quest.central-archive-read"])).has("23,2"),true);
  const south=await readMap("southern-landing");
  const entry=objects(south,"triggers").find(o=>o.name==="windscar-cliff-road");
  assert.equal(props(entry).targetMap,"windscar-cliffs");
  assert.equal(collision(south)[21*south.width+10],0);
});
test("coupler and reactor cannot be bypassed; workshop loot is reachable and only paid once",async()=>{
  const map=await readMap("cradle-workshop"), flags=new Set(), inventory=createDefaultInventory();
  const approach=reachable(map,[19,29]);
  assert.ok(approach.size>300);
  assert.equal(approach.has("19,1"),false);
  for(const o of objects(map,"interactions").filter(o=>props(o).interactionKind!=="barrier")) {
    assert.ok(approach.has(`${o.x/16},${o.y/16+1}`),o.name);
  }
  const interaction=name=>{const o=objects(map,"interactions").find(o=>o.name===name);return {...props(o),kind:props(o).interactionKind};};
  const reactor=interaction("cradle-reactor");
  assert.equal(resolveInteraction(reactor,inventory,flags).changed,false);
  const coupler=interaction("magnetic-coupler");
  assert.equal(resolveInteraction(coupler,inventory,flags).changed,true);
  const credits=inventory.credits;
  assert.equal(resolveInteraction(coupler,inventory,flags).changed,false);
  assert.equal(inventory.credits,credits);
  assert.equal(resolveInteraction(reactor,inventory,flags).changed,true);
  assert.equal(reachable(map,[19,29],flags).has("19,1"),true);
});
test("hangar guardian locks flight controls until victory; peaceful deck has no random combat",async()=>{
  const map=await readMap("cradle-hangar"),flags=new Set(),inventory=createDefaultInventory();
  assert.equal(objects(map,"encounters").length,0);
  assert.equal(reachable(map,[15,23]).has("22,6"),false);
  const boss=props(objects(map,"entities").find(o=>o.name==="Cradle Warden"));
  assert.equal(FORMATIONS[boss.battleFormation].boss,true);
  assert.equal(FORMATIONS[boss.battleFormation].enemyIds.length,2);
  assert.equal(boss.defeatFlag,boss.hiddenFlag);
  const computer=props(objects(map,"interactions").find(o=>o.name==="flight-control"));
  assert.equal(resolveInteraction({...computer,kind:"control-console"},inventory,flags).changed,false);
  flags.add(boss.defeatFlag);
  assert.equal(reachable(map,[15,23],flags).has("22,6"),true);
  assert.equal(resolveInteraction({...computer,kind:"control-console"},inventory,flags).changed,true);
  assert.ok(flags.has("quest.launch-cradle-online"));
  assert.equal(centralChapterDialogue("vesper-engineer",flags),"rhea-cradle-after");
});
test("all transitions and shuttle landings are clear and do not retrigger an exit",async()=>{
  for(const id of ["windscar-cliffs","cradle-workshop","cradle-hangar","skyglass-relay"]) {
    const map=await readMap(id);
    for(const object of [...objects(map,"triggers"),...objects(map,"entities").filter(o=>props(o).travelMap)]) {
      const p=props(object),target=await readMap(p.targetMap??p.travelMap),x=p.targetX??p.travelX,y=p.targetY??p.travelY;
      assert.equal(collision(target)[y*target.width+x],0,`${id}:${object.name}`);
      for(const exit of objects(target,"triggers")) assert.ok(!(x*16>=exit.x&&x*16<exit.x+exit.width&&y*16>=exit.y&&y*16<exit.y+exit.height),`${id} lands on ${exit.name}`);
    }
  }
});
test("shuttle routes are reversible, cancellable and have a southern boarding approach",async()=>{
  for(const [id,target] of [["cradle-hangar","skyglass-relay"],["skyglass-relay","cradle-hangar"]]) {
    const map=await readMap(id),ship=objects(map,"entities").find(o=>props(o).travelMap);
    const p=props(ship);
    assert.equal(p.travelMap,target);
    assert.equal(p.requiredFlag,"quest.launch-cradle-online");
    assert.equal(DIALOGUES[p.dialogueId].choices[1].cancelCallback,true);
    assert.equal(rectanglesOverlap(playerCollisionRect(ship.x+2,ship.y+16),entityCollisionRect(ship.x,ship.y,p.spriteId)),false);
  }
  const map=await readMap("skyglass-relay");
  assert.equal(objects(map,"encounters").length,0);
  assert.deepEqual(objects(map,"interactions").map(o=>props(o).interactionKind).sort(),["inn","item-shop","revival-shop","save-shop","teleport"].sort());
  const visited=reachable(map,[6,15]);
  for(const o of objects(map,"interactions")) assert.ok(visited.has(`${Math.floor(o.x/16)},${o.y/16+1}`),`no approach to ${o.name}`);
});
test("new chapter conversations, gear and formations are registered",async()=>{
  for(const id of ["windscar-cliffs","cradle-workshop","cradle-hangar","skyglass-relay"]) {
    const map=await readMap(id);
    for(const o of [...objects(map,"entities"),...objects(map,"narrative"),...objects(map,"interactions")]) {
      const p=props(o);
      if(p.equipmentId) assert.ok(EQUIPMENT[p.equipmentId]);
      for(const key of ["dialogueId","victoryDialogueId"]) {
        let next=p[key],seen=new Set();
        while(next) {
          assert.ok(DIALOGUES[next],`${id}: ${next}`);assert.ok(!seen.has(next));seen.add(next);
          // 9px monospace: conservative 52 characters per line, three lines.
          let lines=1,line="";
          for(const word of DIALOGUES[next].text.split(" ")) {
            const candidate=line?`${line} ${word}`:word;
            if(candidate.length>52&&line){lines++;line=word;}else line=candidate;
          }
          assert.ok(lines<=3,`${next} overflows the dialogue box`);
          next=DIALOGUES[next].next;
        }
      }
    }
    for(const zone of objects(map,"encounters")) for(const entry of props(zone).formations.split(",")) assert.ok(FORMATIONS[entry.split(":")[0]]);
  }
  assert.ok(canEquip("nox","aeroweave-mail"));
  assert.ok(!canEquip("ione","aeroweave-mail"));
  assert.ok(canEquip("sera","vector-core"));
  assert.ok(EQUIPMENT["skyglass-guard"].defense>EQUIPMENT["meridian-guard"].defense);
});

test("equipped level-24 quartet can beat the Warden while preserving the drone's identity",()=>{
  const members=[createAsh(),createIone(),createNox(),createSera()];
  const weapons=["dawn-saber","prism-lash","cipher-carbine","horizon-disc"];
  members.forEach((m,i)=>{
    Object.assign(m,statsForLevel(m.id,24));m.level=24;m.hp=m.maxHp;m.mp=m.maxMp;
    m.equipment.weapon=weapons[i];m.equipment.armor=i===0||i===2?"aeroweave-mail":"aurora-mantle";
    m.equipment.shield="meridian-guard";
  });
  const input={pressed:new Set(),clearPresses(){this.pressed.clear();},consumePress(a){return this.pressed.delete(a);}};
  const inventory=createDefaultInventory();inventory.tonics=20;
  const battle=new BattleSystem(input);
  let outcome=null,sawWarning=false;
  const random=Math.random;Math.random=()=>0.5;
  try {
    battle.start({activeMemberIds:members.map(m=>m.id),roster:members},inventory,"cradle-warden",result=>{outcome=result;});
    assert.equal(battle.view().enemies[1].definition.name,"CIPHER DRONE");
    for(let tick=0;tick<4000&&battle.active;tick++) {
      const view=battle.view();
      const charged=view.enemies.some(e=>e.intent!==null);
      if(charged)sawWarning=true;
      if(view.acceptingCommand) {
        if(view.targetingEnemy) {
          if(view.enemies[1]?.hp>0&&view.selectedEnemyId!==view.enemies[1].combatId) input.pressed.add("right");
        } else if(view.activeMemberId==="ione"&&members.some(m=>m.hp>0&&m.hp<m.maxHp*0.65)&&inventory.tonics>0) input.pressed.add("up");
        else if(charged) input.pressed.add("right");
        input.pressed.add("confirm");
      } else if(view.results) input.pressed.add("confirm");
      battle.update(0.15);
    }
    assert.equal(outcome,"victory");assert.ok(sawWarning);assert.ok(members.every(m=>m.hp>0));
  } finally {Math.random=random;}
});
