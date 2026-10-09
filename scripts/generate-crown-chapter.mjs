import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { plan, object, transition, narrative, prop } from './generate-central-chapter.mjs';

const directory = new URL('../public/assets/maps/', import.meta.url);
const npc = (id,name,x,y,spriteId,dialogueId,extra={}) => ({...object(id,name,x,y,{spriteId,dialogueId,movement:'fixed',direction:'down',...extra}),type:'npc'});
const barrier = (id,name,x,y,w,h,requiredFlag,text) => object(id,name,x,y,{interactionKind:'barrier',requiredFlag,text},w,h);
function terminal(map,id,name,x,y,flag,dialogueId,extra={}) {
  map.block(x,y,true);
  return object(id,name,x,y,{interactionKind:'control-console',flag,dialogueId,
    text:'The archive record is copied.',restoredText:'This record is already copied. Compare the three testimonies at the central adjudication terminal.',
    emptyText:'The Judicator still holds the command seal.',...extra});
}
function locker(map,id,name,x,y,equipmentId='',credits=550,requiredFlag='') {
  map.block(x,y);
  return object(id,name,x,y,{interactionKind:'cache',flag:`cache.crown.${name}`,equipmentId,credits,tonics:5,returnBeacons:1,requiredFlag,
    text:'The sealed supply locker opens.',emptyText:'This locker is empty, or its command seal is still active.'});
}
const zone = (id,name,x,y,w,h,formations) => ({...object(id,name,x,y,{biome:'crown-array',formations,minDistance:310,maxDistance:440},w,h),type:'encounter-zone'});

function causeway() {
  const m=plan('Crown Array · Broken Causeway',48,36,{ground:16,wall:18,floor:1,detail:21});
  m.room(1,27,8,34);m.room(10,18,19,25);m.room(25,18,34,25);m.room(34,7,44,16);m.room(33,1,44,6);
  m.path([[3,30],[14,30],[14,22],[30,22],[30,12],[39,12],[39,3]]);
  m.path([[14,22],[7,22],[7,15]]);m.room(3,11,10,16);
  return m.document([
    transition(1,'causeway-ridge-return',1,30,'stormbreak-ridge',42,12,'left'),
    transition(2,'crown-archive-entry',38,1,'crown-archives',24,36,'up',3),
  ],[
    barrier(10,'crown-weather-seal',10,29,1,3,'quest.weather-record-recovered','The causeway is sealed by a hostile storm carrier. Recover the original warning in the Weather Dome first.'),
    locker(m,11,'causeway-supplies',6,13,'',300),
  ],[npc(20,'Survey Drone',5,29,'cipher-drone','crown-survey-drone')],
  [narrative(30,'crown-causeway-arrival',2,27,7,7,'crown-causeway-arrival')],
  [zone(40,'Exposed command shelves',2,2,43,32,'crown-patrol:4,nimbus-patrol:3,gale-flight:2')]);
}
function archives() {
  const m=plan('Crown Array · Palimpsest Archives',48,40);
  m.room(20,33,28,39);m.room(3,25,11,33);m.room(36,25,44,33);m.room(3,4,11,12);m.room(36,4,44,12);
  m.room(18,14,30,22);m.room(19,7,29,12);m.room(20,1,28,4);
  m.path([[24,36],[24,30],[7,30],[7,8]]);
  m.path([[24,30],[40,30],[40,8]]);
  m.path([[7,18],[24,18],[40,18]]);
  m.path([[7,8],[18,8],[18,18]]);m.path([[40,8],[30,8],[30,18]]);
  m.path([[24,30],[24,3]]);
  return m.document([
    transition(1,'crown-archive-return',23,39,'crown-causeway',39,4,'down',3),
    transition(2,'crown-adjudication-lift',23,1,'crown-sanctum',16,26,'up',3),
  ],[
    terminal(m,10,'foundation-testimony',7,7,'crown.foundation-read','crown-foundation-record'),
    terminal(m,11,'evacuation-testimony',40,29,'crown.evacuation-read','crown-evacuation-record'),
    terminal(m,12,'override-testimony',40,7,'crown.override-read','crown-override-record'),
    terminal(m,13,'crown-adjudication-terminal',24,10,'crown.order-authenticated','crown-authenticate',{
      interactionKind:'archive-authenticator',requiredFlag:'crown.evidence-complete',
      emptyText:'Three testimonies are needed: foundation in the northwest, evacuation in the southeast, and override in the northeast.',
      restoredText:'The original shelter order is authenticated. The upper lift is open.',
    }),
    barrier(14,'crown-original-order-seal',22,5,5,1,'crown.order-authenticated','The upper lift needs an authenticated original order. Read the three records, then use the central terminal.'),
    locker(m,15,'crown-lash',5,30,'crown-lash'),
    locker(m,16,'oath-mail',42,30,'oath-mail'),
    locker(m,17,'witness-core',9,9,'witness-core'),
  ],[],[narrative(30,'crown-archive-arrival',20,34,9,5,'crown-archive-arrival')],
  [zone(40,'Contested archive corridors',2,2,44,35,'crown-patrol:4,crown-enforcers:3,weather-security:2')]);
}
function sanctum() {
  const m=plan('Crown Array · Hall of Judgment',32,30);
  m.room(12,22,20,29);m.room(6,10,26,21);m.room(6,2,26,8);m.path([[16,26],[16,4]]);
  return m.document([transition(1,'crown-sanctum-return',15,29,'crown-archives',24,3,'down',3)],[
    barrier(10,'judicator-command-seal',6,9,21,1,'crown.judicator-defeated','The Judicator denies the living witness. Confront it before restoring the shelter network.'),
    terminal(m,11,'crown-original-command',16,4,'quest.crown-command-restored','crown-command-restored',{
      requiredFlag:'crown.judicator-defeated',restoredText:'The shelter network is protected. Return to Sen in Skyglass with the Orison address.',
    }),
    locker(m,12,'crown-aegis',9,5,'crown-aegis',900,'crown.judicator-defeated'),
  ],[npc(20,'Crown Judicator',16,14,'crown-judicator','crown-judicator-challenge',{
    battleFormation:'crown-judicator',defeatFlag:'crown.judicator-defeated',hiddenFlag:'crown.judicator-defeated',victoryDialogueId:'crown-judicator-defeated',
  })],[narrative(30,'crown-sanctum-arrival',12,23,9,5,'crown-sanctum-arrival')]);
}
export async function generateCrownChapter() {
  const ridge=JSON.parse(await readFile(new URL('stormbreak-ridge.json',directory),'utf8'));
  for(let y=11;y<=13;y++)for(let x=40;x<ridge.width;x++) {
    ridge.layers.find(l=>l.name==='terrain').data[y*ridge.width+x]=1;
    ridge.layers.find(l=>l.name==='collision').data[y*ridge.width+x]=0;
  }
  const triggers=ridge.layers.find(l=>l.name==='triggers');
  triggers.objects=triggers.objects.filter(o=>o.name!=='crown-causeway-east');
  triggers.objects.push(transition(61,'crown-causeway-east',45,12,'crown-causeway',3,30,'right'));
  const skyglass=JSON.parse(await readFile(new URL('skyglass-relay.json',directory),'utf8'));
  const observer=skyglass.layers.find(l=>l.name==='entities').objects.find(o=>o.name==='Observer Sen');
  for(const [key,value] of Object.entries({dialogueMiddleFlag:'quest.weather-record-recovered',dialogueMiddleId:'skyglass-observer-after',dialogueAfterFlag:'quest.crown-command-restored',dialogueAfterId:'skyglass-crown-after'})) {
    observer.properties=observer.properties.filter(p=>p.name!==key);observer.properties.push(prop(key,value));
  }
  for(const [id,m] of [['stormbreak-ridge',ridge],['skyglass-relay',skyglass],['crown-causeway',causeway()],['crown-archives',archives()],['crown-sanctum',sanctum()]]) {
    await writeFile(new URL(`${id}.json`,directory),`${JSON.stringify(m,null,2)}\n`);
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await generateCrownChapter();
