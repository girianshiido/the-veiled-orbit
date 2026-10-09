import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { plan, object, transition, narrative, prop } from './generate-central-chapter.mjs';

const directory = new URL('../public/assets/maps/', import.meta.url);
const zone = (id, name, x, y, w, h, formations) => ({ ...object(id, name, x, y, {
  biome:'weather-dome', formations, minDistance:280, maxDistance:400,
}, w, h), type:'encounter-zone' });
const npc = (id, name, x, y, spriteId, dialogueId, extra={}) => ({ ...object(id,name,x,y,{
  spriteId,dialogueId,movement:'fixed',direction:'down',...extra,
}),type:'npc' });
const barrier = (id,name,x,y,w,requiredFlag,text,h=1) => object(id,name,x,y,{interactionKind:'barrier',requiredFlag,text},w,h);
function locker(map,id,name,x,y,equipmentId,credits=420) {
  map.block(x,y);
  return object(id,name,x,y,{interactionKind:'cache',flag:`cache.weather.${name}`,equipmentId,credits,tonics:4,returnBeacons:1,
    text:'The weather-station locker opens.',emptyText:'This locker is empty.'});
}
function consoleObject(map,id,name,x,y,flag,dialogueId,requiredFlag='') {
  map.block(x,y,true);
  return object(id,name,x,y,{interactionKind:'control-console',flag,dialogueId,requiredFlag,
    text:'The weather circuit accepts the archive carrier.',emptyText:'The Regent still controls the command record.',
    restoredText:name==='weather-command-record'?'The original warning is preserved. Return to Observer Sen in Skyglass.':'The regulator is stable. The upper seal needs both regulators.'});
}
function ridge() {
  const map=plan('Skyglass · Stormbreak Ridge',46,34,{ground:16,wall:18,floor:1,detail:21});
  map.room(1,26,8,32);map.room(8,17,16,24);map.room(20,17,29,24);map.room(30,8,40,16);
  map.room(9,5,17,11);map.room(30,1,41,6);
  map.path([[3,29],[12,29],[12,21],[25,21],[25,12],[36,12],[36,3]]);
  map.path([[25,12],[13,12],[13,8]]);
  return map.document([
    transition(1,'ridge-skyglass-return',1,29,'skyglass-relay',31,17,'left'),
    transition(2,'weather-dome-entry',35,1,'weather-dome',22,32,'up',3),
  ],[
    locker(map,10,'ridge-emergency-supplies',11,7,''),
    barrier(11,'ridge-archive-check',18,20,1,'quest.launch-cradle-online','The ridge checkpoint requires the restored shuttle carrier.',3),
  ],[npc(20,'Weather Scout Tern',5,28,'surveyor-leth','stormbreak-scout')],
  [narrative(30,'stormbreak-arrival',2,26,7,6,'stormbreak-arrival')],
  [zone(40,'Stormbreak wildlife',2,2,40,30,'gale-flight:4,nimbus-patrol:3,cipher-patrol:2')]);
}
function dome() {
  const map=plan('Weather Dome · Regulator Galleries',44,36);
  map.room(18,28,26,35);map.room(3,22,11,28);map.room(32,22,40,28);
  map.room(3,4,11,12);map.room(32,4,40,12);map.room(17,14,27,21);map.room(18,1,26,4);
  map.path([[22,32],[22,25],[7,25],[7,8]]);
  map.path([[22,25],[36,25],[36,8]]);
  map.path([[7,18],[22,18],[36,18]]);
  map.path([[7,13],[14,13],[14,8]]);map.path([[36,13],[29,13],[29,8]]);
  map.path([[22,18],[22,3]]);
  return map.document([
    transition(1,'dome-ridge-return',21,35,'stormbreak-ridge',36,4,'down',3),
    transition(2,'dome-eye-lift',21,1,'weather-eye',15,24,'up',3),
  ],[
    consoleObject(map,10,'pressure-regulator',7,7,'weather.pressure-stable','weather-pressure-restored'),
    consoleObject(map,11,'charge-regulator',36,7,'weather.charge-stable','weather-charge-restored'),
    barrier(12,'eye-pressure-seal',20,5,5,'weather.eye-open','The lift needs both regulators: pressure in the west and charge in the east.'),
    locker(map,13,'thunder-edge',5,25,'thunder-edge'),
    locker(map,14,'ion-carbine',38,25,'ion-carbine'),
    locker(map,15,'tempest-disc',14,8,'tempest-disc'),
  ],[],[narrative(30,'weather-gallery-entry',18,29,9,6,'weather-gallery-entry')],
  [zone(40,'Regulator security',2,2,40,32,'gale-flight:4,nimbus-patrol:4,weather-security:2')]);
}
function eye() {
  const map=plan('Weather Dome · Eye of the Storm',30,28);
  map.room(11,20,19,27);map.room(6,9,24,19);map.room(7,2,23,7);map.path([[15,24],[15,4]]);
  return map.document([
    transition(1,'weather-eye-return',14,27,'weather-dome',22,3,'down',3),
  ],[
    barrier(10,'regent-record-seal',7,8,17,'weather.regent-defeated','The Regent shields the original command record.'),
    consoleObject(map,11,'weather-command-record',15,4,'quest.weather-record-recovered','weather-record-revelation','weather.regent-defeated'),
    locker(map,12,'pressure-mantle',9,5,'pressure-mantle',650),
  ],[
    npc(20,'Tempest Regent',15,13,'tempest-regent','tempest-regent-challenge',{
      battleFormation:'tempest-regent',defeatFlag:'weather.regent-defeated',hiddenFlag:'weather.regent-defeated',victoryDialogueId:'tempest-regent-defeated',
    }),
  ],[narrative(30,'weather-eye-entry',11,21,9,6,'weather-eye-entry')]);
}
export async function generateWeatherChapter() {
  const skyglass=JSON.parse(await readFile(new URL('skyglass-relay.json',directory),'utf8'));
  const terrain=skyglass.layers.find(l=>l.name==='terrain').data;
  const collision=skyglass.layers.find(l=>l.name==='collision').data;
  for(let y=16;y<=18;y++)for(let x=31;x<=34;x++) {terrain[y*skyglass.width+x]=15;collision[y*skyglass.width+x]=0;}
  const triggers=skyglass.layers.find(l=>l.name==='triggers');
  triggers.objects=triggers.objects.filter(o=>o.name!=='stormbreak-east-road');
  triggers.objects.push(transition(60,'stormbreak-east-road',34,17,'stormbreak-ridge',3,29,'right'));
  const observer=skyglass.layers.find(l=>l.name==='entities').objects.find(o=>o.name==='Observer Sen');
  observer.properties=observer.properties.filter(p=>!['dialogueAfterFlag','dialogueAfterId'].includes(p.name));
  observer.properties.push(prop('dialogueAfterFlag','quest.weather-record-recovered'),prop('dialogueAfterId','skyglass-observer-after'));
  for(const [id,map] of [['skyglass-relay',skyglass],['stormbreak-ridge',ridge()],['weather-dome',dome()],['weather-eye',eye()]]) {
    await writeFile(new URL(`${id}.json`,directory),`${JSON.stringify(map,null,2)}\n`);
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await generateWeatherChapter();
