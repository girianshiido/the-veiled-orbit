import type { DialogueNode } from './dialogues';

export const CROWN_DIALOGUES: Readonly<Record<string, DialogueNode>> = {
  'crown-causeway-arrival': {id:'crown-causeway-arrival',speaker:'SERA',text:'The storms have left a narrow shelf east of the dome. The Crown Array is beyond it. We can return to Skyglass at any time.'},
  'crown-survey-drone': {id:'crown-survey-drone',speaker:'SURVEY DRONE',text:'ORIGINAL WEATHER CARRIER DETECTED. EASTERN CAUSEWAY RELEASED. ARCHIVE RECORDS CONFLICT. LIVING WITNESSES MUST VERIFY THE ORIGINAL ORDER.'},
  'crown-archive-arrival': {id:'crown-archive-arrival',speaker:'IONE',text:'New orders cover the old records. Find the foundation, evacuation and override testimonies. Their dates will identify the original command.',next:'crown-archive-retreat'},
  'crown-archive-retreat': {id:'crown-archive-retreat',speaker:'NOX',text:'Copy all three testimonies, then choose an order at the central terminal. A Return Beacon takes us outside the array. Copied records will remain.'},
  'crown-foundation-record': {id:'crown-foundation-record',speaker:'FOUNDATION RECORD',text:'YEAR 0. CROWN CHARTER: PRESERVE LIVING SHELTERS. RECORDS EXIST TO SERVE THEIR PEOPLE. NO LATER INSTRUCTION MAY REVOKE THIS CHARTER.'},
  'crown-evacuation-record': {id:'crown-evacuation-record',speaker:'EVACUATION RECORD',text:'YEAR 317. FIVE SHELTERS RECEIVED STORM REFUGEES. THEIR DESCENDANTS KEEP YEAR 0 PROTECTION. TEMPORARY ROUTE SEALS DO NOT REVOKE THE CHARTER.'},
  'crown-override-record': {id:'crown-override-record',speaker:'OVERRIDE RECORD',text:'RECENT UNVERIFIED INSERT. PURGE LIVING SHELTERS TO PRESERVE THE ARCHIVE. AUTHORITY CLAIM: THE CURATOR. THE INSERT CARRIES NO FOUNDATION SIGNATURE.'},
  'crown-authenticate': {id:'crown-authenticate',speaker:'ADJUDICATION TERMINAL',text:'The three testimonies are copied. Which command is supported by the original signed charter?',choices:[
    {label:'Preserve living shelters',next:'crown-order-accepted'},
    {label:'Purge living shelters',next:'crown-order-rejected'},
    {label:'Seal every route forever',next:'crown-order-rejected'},
  ]},
  'crown-order-accepted': {id:'crown-order-accepted',speaker:'IONE',text:'Preserve living shelters. The charter comes first; the purge has no signature. The upper lift opens, but its guardian may still resist.'},
  'crown-order-rejected': {id:'crown-order-rejected',speaker:'ADJUDICATION TERMINAL',text:'UNSIGNED OR TEMPORARY INSTRUCTION. CHARTER MISMATCH. No records have been erased. Reconsider the foundation testimony and try again.',choices:[{label:'Return to the records',close:true,cancelCallback:true}]},
  'crown-sanctum-arrival': {id:'crown-sanctum-arrival',speaker:'ASH',text:'The guardian still stands between us and the network. We can retreat and save in Skyglass before confronting it.'},
  'crown-judicator-challenge': {id:'crown-judicator-challenge',speaker:'CROWN JUDICATOR',text:'CHARTER AUTHENTIC. LIVING WITNESS: DISPUTED. CURATOR OVERRIDE REMAINS ACTIVE. JUDGMENT WILL BE EXECUTED.',next:'crown-judicator-warning'},
  'crown-judicator-warning': {id:'crown-judicator-warning',speaker:'IONE',text:'When its crown opens for VERDICT PULSE, defend. Sera can slow it, and Nox can pierce its armor. I will keep us standing.'},
  'crown-judicator-defeated': {id:'crown-judicator-defeated',speaker:'CROWN JUDICATOR',text:'LIVING WITNESS CONFIRMED. LOCAL OVERRIDE DISCONNECTED. ORIGINAL CHARTER RESTORED. COMMAND TERMINAL RELEASED.'},
  'crown-command-restored': {id:'crown-command-restored',speaker:'CROWN ARRAY',text:'SHELTER TARGETING CANCELLED. ORIGINAL CHARTER BROADCAST TO ALL RELAYS. CURATOR SIGNAL: EXTERNAL ROOT. SOURCE ADDRESS: ORISON DEPTHS, BELOW NYDRA.',next:'crown-command-ione'},
  'crown-command-ione': {id:'crown-command-ione',speaker:'IONE',text:'The Crown relayed the purge; it did not create it. The Curator speaks through a buried root below the shelters. We have only silenced this relay.',next:'crown-command-nox'},
  'crown-command-nox': {id:'crown-command-nox',speaker:'NOX',text:'I have locked the original charter into every repaired tower. That should keep the towns safe while Sen traces the Orison address.',next:'crown-command-ash'},
  'crown-command-ash': {id:'crown-command-ash',speaker:'ASH',text:'Then we go back with proof. The people in those towns are not records to be erased. Whatever waits below Nydra will have to answer for that.'},
  'skyglass-crown-after': {id:'skyglass-crown-after',speaker:'OBSERVER SEN',text:'The relays broadcast their original charter again. You have given the towns breathing room. I will trace the buried Orison carrier.',next:'skyglass-orison-route'},
  'skyglass-orison-route': {id:'skyglass-orison-route',speaker:'OBSERVER SEN',text:'The descent route is not open yet. Rest, save your records, and visit the people you protected. The shuttle and all transit gates remain available.'},
  'rhea-crown-after': {id:'rhea-crown-after',speaker:'ENGINEER RHEA',text:'The towers finally agree on the shelter charter. Orison was an underground service name on the oldest plans. Keep that address; Sen will need it.'},
};
