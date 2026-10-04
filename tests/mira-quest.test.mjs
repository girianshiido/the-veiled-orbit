import assert from "node:assert/strict";
import test from "node:test";
import { isMapEntityVisible } from "../src/world/EntityVisibility.ts";
import {
  completeMiraEscort,
  MIRA_ESCORTING_FLAG,
  MIRA_HOME_FLAG,
  SOUTH_BRIDGE_OPEN_FLAG,
} from "../src/world/MiraQuest.ts";

test("Mira follows Ash until her Lumen Hollow homecoming opens the southern bridge", () => {
  const flags = new Set([MIRA_ESCORTING_FLAG]);
  assert.equal(completeMiraEscort(flags), true);
  assert.equal(flags.has(MIRA_ESCORTING_FLAG), false);
  assert.equal(flags.has(MIRA_HOME_FLAG), true);
  assert.equal(flags.has(SOUTH_BRIDGE_OPEN_FLAG), true);
  assert.equal(completeMiraEscort(flags), false);
});

test("quest entities obey required and hidden world flags", () => {
  const hiddenAfterRescue = { requiredFlag: "", hiddenFlag: "quest.mira-rescued" };
  const appearsAtHome = { requiredFlag: MIRA_HOME_FLAG, hiddenFlag: "" };
  assert.equal(isMapEntityVisible(hiddenAfterRescue, new Set()), true);
  assert.equal(isMapEntityVisible(hiddenAfterRescue, new Set(["quest.mira-rescued"])), false);
  assert.equal(isMapEntityVisible(appearsAtHome, new Set()), false);
  assert.equal(isMapEntityVisible(appearsAtHome, new Set([MIRA_HOME_FLAG])), true);
});
