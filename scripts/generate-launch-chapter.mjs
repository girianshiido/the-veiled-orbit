import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { plan, object, transition, narrative, prop } from "./generate-central-chapter.mjs";

const directory = new URL("../public/assets/maps/", import.meta.url);
const readMap = async (id) => JSON.parse(await readFile(new URL(`${id}.json`, directory), "utf8"));
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name,p.value]));
const layer = (map,name) => map.layers.find((l) => l.name === name).objects;
const writeMap = async (id,map) => writeFile(new URL(`${id}.json`,directory), `${JSON.stringify(map,null,2)}\n`);
const zone = (id,name,x,y,w,h,formations) => ({ ...object(id,name,x,y,{biome:"launch-route",formations,minDistance:240,maxDistance:350},w,h),type:"encounter-zone" });
const npc = (id,name,x,y,spriteId,dialogueId,extras={}) => ({...object(id,name,x,y,{spriteId,dialogueId,movement:"fixed",direction:"down",...extras}),type:"npc"});
const barrier = (id,name,x,y,width,requiredFlag,text,height=1) => object(id,name,x,y,{interactionKind:"barrier",requiredFlag,text},width,height);
function cache(map,id,name,x,y,equipmentId="",flag=`cache.launch.${name}`) {
  map.block(x,y);
  return object(id,name,x,y,{interactionKind:"cache",equipmentId,flag,credits:360,tonics:4,returnBeacons:1,text:name==="magnetic-coupler"?"An intact magnetic coupler is recovered. Nox can now connect the reactor.":"The service locker opens.",emptyText:"This locker is empty."});
}
function consoleObject(map,id,name,x,y,flag,requiredFlag,text,dialogueId="",restoredText="The system remains online.") {
  map.block(x,y,true);
  return object(id,name,x,y,{interactionKind:"control-console",flag,requiredFlag,text,dialogueId,restoredText,emptyText:requiredFlag==="quest.cradle-coupler-recovered"?"The reactor's magnetic coupler is missing. Search the western service rooms.":"The security command is still active. Disable the Warden first."});
}
function cliffs() {
  const map = plan("Southwake · Windscar Cliffs",48,34,{ground:16,wall:18,floor:1,detail:21});
  map.room(1,25,8,32); map.room(8,20,16,26); map.room(20,19,29,27); map.room(27,9,36,16); map.room(6,5,16,12); map.room(18,2,27,8);
  map.path([[2,29],[12,29],[12,23],[24,23],[24,13],[32,13],[32,6],[23,6]]);
  map.path([[24,13],[12,13],[12,8]]);
  // A real uneven coastline, not a rectangular border around the route.
  for(let y=0;y<34;y++) for(let x=39+Math.round(2*Math.sin(y/3));x<48;x++) {
    const index=y*48+x; map.layers.terrain[index]=0; map.layers.collision[index]=1;
  }
  const document = map.document([
    transition(1,"southwake-return",1,29,"southern-landing",10,21,"right"),
    transition(2,"cradle-workshop-entry",22,2,"cradle-workshop",19,29,"up",3),
  ],[
    barrier(10,"archive-access-seal",17,22,1,"quest.central-archive-read","The old route is locked to the central archive carrier. Read the sealed core in the Central Control Tower first.",3),
    cache(map,11,"cliff-provisions",9,7),
  ],[npc(20,"Cliff Surveyor Dain",5,27,"surveyor-leth","windscar-surveyor")],[narrative(30,"windscar-arrival",2,26,6,6,"windscar-arrival")],[zone(40,"Windscar coast",2,3,35,29,"southwake-patrol:3,cipher-patrol:3,cipher-wing:1")]);
  document.layers.find((l)=>l.name==="scenery").objects.push({...object(50,"Abandoned Launch Works",20,1,{spriteId:"world-moonfall-array",anchorX:24,anchorY:56,footprintX:0,footprintY:48,footprintWidth:48,footprintHeight:16,blocksMovement:false},3,4),type:"scenery"});
  return document;
}
function workshop() {
  const map=plan("Launch Cradle · Service Works",38,32);
  map.room(15,26,23,31); map.room(3,20,11,26); map.room(25,19,34,25); map.room(3,5,11,12); map.room(15,10,23,17); map.room(27,4,34,11); map.room(15,1,23,5);
  map.path([[19,29],[19,23],[7,23],[7,8],[19,8],[19,3]]);
  map.path([[19,23],[30,23],[30,8],[19,8]]);
  map.path([[7,16],[19,16],[30,16]]);
  return map.document([
    transition(1,"workshop-down",18,31,"windscar-cliffs",23,4,"down",3),
    transition(2,"workshop-hangar",18,1,"cradle-hangar",15,23,"up",3),
  ],[
    cache(map,10,"magnetic-coupler",4,8,"","quest.cradle-coupler-recovered"),
    cache(map,11,"aeroweave-mail",32,7,"aeroweave-mail"),
    cache(map,12,"vector-core",32,22,"vector-core"),
    consoleObject(map,13,"cradle-reactor",19,12,"quest.cradle-reactor-online","quest.cradle-coupler-recovered","Nox fits the coupler. A stable cyan current reaches the hangar lifts.","cradle-reactor-online"),
    barrier(14,"hangar-power-seal",17,6,5,"quest.cradle-reactor-online","The lift has no power. Recover the magnetic coupler and reconnect the reactor in the central service room."),
  ],[],[narrative(30,"cradle-workshop-arrival",15,26,9,5,"cradle-workshop-arrival")],[zone(40,"Abandoned service circuits",2,2,34,29,"cipher-patrol:4,cipher-wing:3,aegis-command:3")]);
}
function shuttle(id,x,y,targetMap,targetX,targetY,dialogueId) {
  return npc(id,"Atmospheric Shuttle",x,y,"cradle-shuttle",dialogueId,{requiredFlag:"quest.launch-cradle-online",travelMap:targetMap,travelX:targetX,travelY:targetY});
}
function hangar() {
  const map=plan("Launch Cradle · Hangar",30,26);
  map.room(10,19,20,25); map.room(6,8,24,18); map.room(7,2,23,7); map.path([[15,23],[15,5]]);
  return map.document([transition(1,"hangar-return",14,25,"cradle-workshop",19,3,"down",3)], [
    barrier(10,"warden-command-seal",6,8,19,"cradle.warden-defeated","The Warden holds the flight-control deck in lockdown."),
    consoleObject(map,11,"flight-control",22,5,"quest.launch-cradle-online","cradle.warden-defeated","The archive route reaches the flight computer.","cradle-flight-restored","The shuttle is ready. Board from the southern ramp to fly to Skyglass Relay."),
    cache(map,12,"skyglass-guard",9,6,"skyglass-guard"),
  ],[
    npc(20,"Cradle Warden",15,12,"archive-custodian","cradle-warden-challenge",{battleFormation:"cradle-warden",defeatFlag:"cradle.warden-defeated",hiddenFlag:"cradle.warden-defeated",victoryDialogueId:"cradle-warden-defeated"}),
    npc(21,"Dormant Shuttle",15,6,"cradle-shuttle","cradle-shuttle-dormant",{hiddenFlag:"quest.launch-cradle-online"}),
    shuttle(22,15,6,"skyglass-relay",6,15,"board-skyglass-shuttle"),
  ],[narrative(30,"cradle-hangar-arrival",10,19,11,6,"cradle-hangar-arrival")]);
}
function skyglass() {
  const width=36,height=26;
  const map=plan("Skyglass Relay",width,height,{ground:14,wall:18,floor:14,detail:0});
  map.room(2,3,33,23);
  for(let x=2;x<=33;x++) for(const y of [10,17,22]) map.layers.terrain[y*width+x]=15;
  for(let y=3;y<=23;y++) for(const x of [6,15,24,31]) map.layers.terrain[y*width+x]=15;
  const buildings=[
    {id:40,name:"Skyglass Memory Archive",role:"memory",x:160,y:32,w:64,doorX:184,doorY:96,kind:"save-shop",price:0},
    {id:41,name:"Skyglass Rest House",role:"inn",x:272,y:32,w:80,doorX:304,doorY:96,kind:"inn",price:110},
    {id:42,name:"Skyglass Transit Beacon",role:"transit",x:400,y:32,w:64,doorX:424,doorY:96,kind:"teleport",price:180},
    {id:43,name:"Skyglass Supply Depot",role:"item",x:160,y:192,w:64,doorX:184,doorY:256,kind:"item-shop",price:46},
    {id:44,name:"Skyglass Clinic",role:"clinic",x:288,y:192,w:64,doorX:312,doorY:256,kind:"revival-shop",price:55},
  ];
  const services=buildings.map((b)=>{
    // Match the same solid footprint and real door contract as other villages.
    for(let x=b.x/16;x<(b.x+b.w)/16;x++) map.layers.collision[(b.y/16+4)*width+x]=1;
    map.layers.collision[Math.floor(b.doorY/16)*width+Math.floor(b.doorX/16)]=0;
    return {...object(b.id-30,`skyglass-${b.role}-service`,b.doorX/16,b.doorY/16,{interactionKind:b.kind,price:b.price,text:"The restored relay welcomes registered travellers.",...(b.kind==="teleport"?{destinationMap:"cairn-meridian,tideglass-harbor,vesper-crossing,aster-reach,lumen-hollow",destinationName:"CAIRN MERIDIAN|TIDEGLASS HARBOR|VESPER CROSSING|ASTER REACH|LUMEN HOLLOW",requiredFlag:"village.cairn-meridian.visited|village.tideglass-harbor.visited|village.vesper-crossing.visited|village.aster-reach.visited|village.lumen-hollow.visited"}:{})}),type:"service"};
  });
  const document=map.document([],services,[
    shuttle(20,6,12,"cradle-hangar",15,7,"board-cradle-return-shuttle"),
    npc(21,"Relay Keeper Elian",22,12,"hollow-host","skyglass-keeper"),
    npc(22,"Observer Sen",29,19,"archive-adept","skyglass-observer"),
    {...npc(23,"Deck Technician Mara",17,20,"vesper-engineer","skyglass-technician"),properties:[...npc(23,"Deck Technician Mara",17,20,"vesper-engineer","skyglass-technician").properties.filter(p=>p.name!=="movement"),prop("movement","patrol"),prop("patrolAxis","horizontal"),prop("patrolRange",32),prop("speed",9)]},
  ],[narrative(30,"skyglass-arrival",3,13,7,6,"skyglass-arrival")]);
  document.layers.find((l)=>l.name==="scenery").objects=buildings.map(b=>({...object(b.id,b.name,b.x/16,b.y/16,{spriteId:`tideglass-hd-${b.role}`,anchorX:b.w/2,anchorY:72,footprintX:0,footprintY:64,footprintWidth:b.w,footprintHeight:16},b.w/16,5),type:"scenery"}));
  return document;
}
async function addSouthernAccess() {
  const map=await readMap("southern-landing");
  for(const name of ["triggers","interactions","scenery"]) map.layers.find(l=>l.name===name).objects=layer(map,name).filter(o=>!o.name.startsWith("windscar-"));
  layer(map,"triggers").push(transition(60,"windscar-cliff-road",8,20,"windscar-cliffs",3,29,"right",2));
  layer(map,"scenery").push({...object(61,"windscar-old-observatory",7,16,{spriteId:"world-moonfall-array",anchorX:24,anchorY:56,footprintX:0,footprintY:48,footprintWidth:48,footprintHeight:16,blocksMovement:false},3,4),type:"scenery"});
  const collision=map.layers.find(l=>l.name==="collision").data, terrain=map.layers.find(l=>l.name==="terrain").data;
  // Link the new approach to Tideglass's existing western road without moving old sites.
  for(let y=20;y<=23;y++) for(let x=8;x<=14;x++) {collision[y*map.width+x]=0;terrain[y*map.width+x]=(y===21||y===22)?2:1;}
  await writeMap("southern-landing",map);
}
export async function generateLaunchChapter() {
  for(const [id,map] of [["windscar-cliffs",cliffs()],["cradle-workshop",workshop()],["cradle-hangar",hangar()],["skyglass-relay",skyglass()]]) await writeMap(id,map);
  await addSouthernAccess();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await generateLaunchChapter();
