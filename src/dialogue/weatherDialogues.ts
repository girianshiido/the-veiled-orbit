import type { DialogueNode } from './dialogues';

export const WEATHER_DIALOGUES: Readonly<Record<string, DialogueNode>> = {
  'stormbreak-arrival': {id:'stormbreak-arrival',speaker:'SERA',text:'The dome lies beyond these switchbacks. The wind has dropped since the shuttle reopened the supply route. Keep to the stone shelves.'},
  'stormbreak-scout': {id:'stormbreak-scout',speaker:'SCOUT TERN',text:'Sen found a quiet corridor, but the dome still makes its own storms. Follow the ridge east, then north. The western alcove holds emergency supplies.'},
  'weather-gallery-entry': {id:'weather-gallery-entry',speaker:'NOX',text:'Two regulators feed the upper lift. Pressure is in the west; charge is in the east. We need both. The side lockers may help.',next:'weather-gallery-retreat'},
  'weather-gallery-retreat': {id:'weather-gallery-retreat',speaker:'IONE',text:'A Return Beacon will extract us to the ridge from either floor. We can rest in Skyglass and come back; repaired regulators will stay repaired.'},
  'weather-pressure-restored': {id:'weather-pressure-restored',speaker:'SERA',text:'The pressure is falling. Those storms were being driven toward the settlements, not away from them. Check the charge regulator in the east.'},
  'weather-charge-restored': {id:'weather-charge-restored',speaker:'NOX',text:'The charge is grounded. Stabilize the western pressure regulator too to open the lift. The guardian above is still active.'},
  'weather-eye-entry': {id:'weather-eye-entry',speaker:'IONE',text:'The eye of the storm is quiet. That machine is protecting the command record. We can turn back and prepare before confronting it.'},
  'tempest-regent-challenge': {id:'tempest-regent-challenge',speaker:'TEMPEST REGENT',text:'SHELTER NETWORK: HOSTILE. STORM FRONT: LOCKED ON. ORIGINAL WARNING: SEALED.',next:'tempest-regent-warning'},
  'tempest-regent-warning': {id:'tempest-regent-warning',speaker:'NOX',text:'Destroy its support drone first. When the turbine rings charge for STORM SURGE, defend. We need the record behind it intact.'},
  'tempest-regent-defeated': {id:'tempest-regent-defeated',speaker:'TEMPEST REGENT',text:'TARGET OVERRIDE DISCONNECTED. WEATHER CONTROL RESTORED. ORIGINAL COMMAND RECORD RELEASED.'},
  'weather-record-revelation': {id:'weather-record-revelation',speaker:'WEATHER ARCHIVE',text:'ORIGINAL ORDER: PRESERVE ALL SHELTERS. REPLACEMENT ORDER: PURGE ALL SHELTERS. RELAY SOURCE: CROWN ARRAY. AUTHORIZATION: THE CURATOR.',next:'weather-record-ione'},
  'weather-record-ione': {id:'weather-record-ione',speaker:'IONE',text:'The Curator was an archive office, sworn to preserve life through the glass storms. Someone is using its authority to erase the people it protected.',next:'weather-record-nox'},
  'weather-record-nox': {id:'weather-record-nox',speaker:'NOX',text:'This record proves the warning was altered. I have copied the original and disabled the hostile storm targets. Take it back to Sen.',next:'weather-record-ash'},
  'weather-record-ash': {id:'weather-record-ash',speaker:'ASH',text:'We have a name and a source. First, let us tell Skyglass their homes are safe. Then we find a route to the Crown Array.'},
  'skyglass-observer-after': {id:'skyglass-observer-after',speaker:'OBSERVER SEN',text:'The storms are breaking! Your record names the Crown Array beyond our eastern charts. I will compare its carrier with the old observation logs.',next:'skyglass-observer-next'},
  'skyglass-observer-next': {id:'skyglass-observer-next',speaker:'OBSERVER SEN',text:'Your weather carrier clears the causeway. Go east along Stormbreak Ridge, beyond the dome, to the Crown Array. Find its original signed charter.'},
  'rhea-weather-after': {id:'rhea-weather-after',speaker:'ENGINEER RHEA',text:'The Curator... that signature appears on the original shelter plans. Keep the unaltered warning safe. Sen may be able to trace the Crown Array.'},
};
