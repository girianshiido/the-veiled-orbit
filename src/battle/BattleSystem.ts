import { InputManager } from "../core/InputManager.ts";
import { effectiveStats, isCarbineEquipment } from "../progression/equipmentData.ts";
import { SPELLS } from "../progression/spellData.ts";
import type {
  FormationId,
  InventoryState,
  PartyMemberId,
  PartyMemberProgress,
  PartyState,
  BattleStatusId,
  SpellId,
} from "../types/game";
import { ENEMIES, FORMATIONS, type EnemyDefinition, type FormationDefinition } from "./battleData.ts";
import { applyVictoryProgress, type BattleResultMember } from "./BattleProgression.ts";

export type { BattleResultMember } from "./BattleProgression";

export type BattleAction = "ATTACK" | "TECH" | "ITEM" | "DEFEND" | "ESCAPE";
export type BattleAnimation =
  | "idle"
  | "enemy-arrive"
  | "hero-strike"
  | "hero-cast"
  | "enemy-cast"
  | "enemy-hit"
  | "enemy-strike"
  | "hero-hit"
  | "victory";
export type BattleEffect = "none" | "arc-bolt" | "flare-lance" | "mend" | "static-field" | "barrier" | "weaken" | "shock" | "burn" | "storm";
export type BattleOutcome = "victory" | "escaped" | "defeat";

interface EnemyCombatant {
  combatId: string;
  definition: EnemyDefinition;
  hp: number;
  statuses: BattleStatus[];
  actionsTaken: number;
  intent: EnemyIntent | null;
}

type EnemyIntent = "BLACKOUT PULSE" | "PHASE NOVA" | "STORM SURGE" | "VERDICT PULSE";

export interface BattleStatus {
  id: BattleStatusId;
  turns: number;
}

interface MemberCommand {
  kind: "member";
  memberId: PartyMemberId;
  action: BattleAction;
  targetEnemyId?: string;
  targetMemberId?: PartyMemberId;
  spellId?: SpellId;
}

interface EnemyCommand {
  kind: "enemy";
  enemyId: string;
}

type TurnCommand = MemberCommand | EnemyCommand;

export interface EnemyBattleView {
  combatId: string;
  definition: EnemyDefinition;
  hp: number;
  statuses: readonly BattleStatus[];
  intent: EnemyIntent | null;
}

export interface BattleResultsView {
  experience: number;
  credits: number;
  members: readonly BattleResultMember[];
}

export interface BattlePopupView {
  text: string;
  tone: "damage" | "heal";
  targetEnemyId?: string;
  targetMemberId?: PartyMemberId;
}

export interface BattleView {
  party: readonly PartyMemberProgress[];
  inventory: InventoryState;
  formationName: string;
  enemies: readonly EnemyBattleView[];
  actions: readonly BattleAction[];
  selectedAction: number;
  acceptingCommand: boolean;
  choosingSpell: boolean;
  selectedSpell: number;
  availableSpells: readonly SpellId[];
  targetingEnemy: boolean;
  targetingMember: boolean;
  selectedEnemyId: string | null;
  selectedMemberId: PartyMemberId | null;
  memberStatuses: Readonly<Partial<Record<PartyMemberId, readonly BattleStatus[]>>>;
  activeMemberId: PartyMemberId | null;
  animationMemberId: PartyMemberId | null;
  animationTargetId: PartyMemberId | null;
  animationEnemyId: string | null;
  message: string;
  animation: BattleAnimation;
  effect: BattleEffect;
  animationProgress: number;
  popups: readonly BattlePopupView[];
  defeatedEnemyIds: readonly string[];
  results: BattleResultsView | null;
}

const ACTIONS: readonly BattleAction[] = ["ATTACK", "TECH", "ITEM", "DEFEND", "ESCAPE"];

export class BattleSystem {
  private readonly input: InputManager;
  private party: PartyState | null = null;
  private inventory: InventoryState | null = null;
  private formation: FormationDefinition | null = null;
  private enemies: EnemyCombatant[] = [];
  private selectedAction = 0;
  private selectedSpell = 0;
  private selectedEnemyIndex = 0;
  private selectedMemberIndex = 0;
  private choosingSpell = false;
  private targetingEnemy = false;
  private targetingMember = false;
  private pendingAction: BattleAction | null = null;
  private pendingSpell: SpellId | null = null;
  private readonly memberStatuses = new Map<PartyMemberId, BattleStatus[]>();
  private acceptingCommand = false;
  private commandMemberIds: PartyMemberId[] = [];
  private commandPosition = 0;
  private queuedCommands: MemberCommand[] = [];
  private turnQueue: TurnCommand[] = [];
  private readonly defending = new Set<PartyMemberId>();
  private message = "";
  private animation: BattleAnimation = "idle";
  private effect: BattleEffect = "none";
  private animationMemberId: PartyMemberId | null = null;
  private animationTargetId: PartyMemberId | null = null;
  private animationEnemyId: string | null = null;
  private timer = 0;
  private duration = 1;
  private afterTimer: (() => void) | null = null;
  private popups: BattlePopupView[] = [];
  private defeatedEnemyIds: string[] = [];
  private escapeAttempts = 0;
  private results: BattleResultsView | null = null;
  private awaitingResults = false;
  private endCallback: ((outcome: BattleOutcome) => void) | null = null;

  constructor(input: InputManager) {
    this.input = input;
  }

  public get active(): boolean {
    return this.party !== null && this.inventory !== null && this.formation !== null;
  }

  public start(
    party: PartyState,
    inventory: InventoryState,
    formationId: FormationId,
    onEnd: (outcome: BattleOutcome) => void,
  ): void {
    this.input.clearPresses();
    this.party = party;
    this.inventory = inventory;
    this.formation = FORMATIONS[formationId];
    this.enemies = this.formation.enemyIds.map((enemyId, index) => {
      const base = ENEMIES[enemyId];
      const definition = this.formation?.boss
        ? {
            ...base,
            name: index === 0 ? this.formation.name : base.name,
            maxHp: Math.round(base.maxHp * 1.35),
            attack: Math.round(base.attack * 1.1),
            defense: base.defense + 2,
            experience: Math.round(base.experience * 1.5),
            credits: Math.round(base.credits * 1.5),
          }
        : base;
      return {
        combatId: `${enemyId}-${index}`,
        definition,
        hp: definition.maxHp,
        statuses: [],
        actionsTaken: 0,
        intent: null,
      };
    });
    this.selectedAction = 0;
    this.selectedSpell = 0;
    this.selectedEnemyIndex = 0;
    this.selectedMemberIndex = 0;
    this.choosingSpell = false;
    this.targetingEnemy = false;
    this.targetingMember = false;
    this.pendingAction = null;
    this.pendingSpell = null;
    this.memberStatuses.clear();
    this.defending.clear();
    this.escapeAttempts = 0;
    this.results = null;
    this.awaitingResults = false;
    this.endCallback = onEnd;
    this.animationMemberId = null;
    this.animationTargetId = null;
    this.animationEnemyId = null;
    this.popups = [];
    this.defeatedEnemyIds = [];
    this.schedule(0.9, "enemy-arrive", `${this.formation.name} converges.`, () => this.beginCommandPhase());
  }

  public update(deltaSeconds: number): void {
    if (!this.active) return;
    if (this.awaitingResults) {
      if (this.input.consumePress("confirm") || this.input.consumePress("menu")) this.finish("victory");
      return;
    }
    if (this.acceptingCommand) {
      if (this.targetingEnemy) {
        if (this.input.consumePress("left")) this.moveEnemySelection(-1);
        if (this.input.consumePress("right")) this.moveEnemySelection(1);
        if (this.input.consumePress("menu")) this.cancelTargetSelection();
        if (this.input.consumePress("confirm")) this.confirmTarget();
      } else if (this.targetingMember) {
        if (this.input.consumePress("left") || this.input.consumePress("up")) this.moveMemberSelection(-1);
        if (this.input.consumePress("right") || this.input.consumePress("down")) this.moveMemberSelection(1);
        if (this.input.consumePress("menu")) this.cancelTargetSelection();
        if (this.input.consumePress("confirm")) this.confirmTarget();
      } else if (this.choosingSpell) {
        if (this.input.consumePress("up")) this.moveSpellSelection(-1);
        if (this.input.consumePress("down")) this.moveSpellSelection(1);
        if (this.input.consumePress("menu")) this.cancelSpellSelection();
        if (this.input.consumePress("confirm")) this.chooseSpell();
      } else {
        if (this.input.consumePress("menu")) {
          this.rewindCommand();
          return;
        }
        if (this.input.consumePress("left")) this.moveSelectionHorizontal(-1);
        if (this.input.consumePress("right")) this.moveSelectionHorizontal(1);
        if (this.input.consumePress("up")) this.moveSelectionVertical(-1);
        if (this.input.consumePress("down")) this.moveSelectionVertical(1);
        if (this.input.consumePress("confirm")) this.chooseAction(ACTIONS[this.selectedAction] ?? "ATTACK");
      }
      return;
    }

    this.timer = Math.max(0, this.timer - deltaSeconds);
    if (this.timer > 0) return;
    const callback = this.afterTimer;
    this.afterTimer = null;
    callback?.();
  }

  public view(): BattleView | null {
    if (!this.party || !this.inventory || !this.formation) return null;
    return {
      party: this.activeMembers(),
      inventory: this.inventory,
      formationName: this.formation.name,
      enemies: this.enemies,
      actions: ACTIONS,
      selectedAction: this.selectedAction,
      acceptingCommand: this.acceptingCommand,
      choosingSpell: this.choosingSpell,
      selectedSpell: this.selectedSpell,
      availableSpells: this.currentCommandMember()?.spells ?? [],
      targetingEnemy: this.targetingEnemy,
      targetingMember: this.targetingMember,
      selectedEnemyId: this.selectedEnemy()?.combatId ?? null,
      selectedMemberId: this.targetingMember ? (this.selectedMember()?.id ?? null) : null,
      memberStatuses: Object.fromEntries(this.memberStatuses.entries()),
      activeMemberId: this.acceptingCommand ? (this.commandMemberIds[this.commandPosition] ?? null) : null,
      animationMemberId: this.animationMemberId,
      animationTargetId: this.animationTargetId,
      animationEnemyId: this.animationEnemyId,
      message: this.message,
      animation: this.animation,
      effect: this.effect,
      animationProgress: this.acceptingCommand ? 0 : Math.min(1, 1 - this.timer / this.duration),
      popups: this.popups,
      defeatedEnemyIds: this.defeatedEnemyIds,
      results: this.awaitingResults ? this.results : null,
    };
  }

  private chooseAction(action: BattleAction): void {
    const member = this.currentCommandMember();
    if (!member || !this.inventory) return;
    if (action === "TECH") {
      if (member.spells.length === 0) {
        this.message = `${member.name} knows no techniques.`;
        return;
      }
      this.choosingSpell = true;
      this.selectedSpell = 0;
      this.message = `${member.name}: choose a technique.`;
      return;
    }
    if (action === "ITEM") {
      if (this.inventory.tonics <= 0) {
        this.animationMemberId = member.id;
        this.schedule(0.8, "idle", "No FIELD TONICS remain.", () => this.resumeCommand());
        return;
      }
      if (!this.mostInjuredMember()) {
        this.animationMemberId = member.id;
        this.schedule(0.8, "idle", "No one needs a FIELD TONIC.", () => this.resumeCommand());
        return;
      }
    }

    if (action === "ATTACK" && member.id !== "sera" && this.livingEnemies().length > 1) {
      this.pendingAction = action;
      this.pendingSpell = null;
      this.targetingEnemy = true;
      this.selectedEnemyIndex = 0;
      this.message = `${member.name}: choose a target.`;
      return;
    }
    this.commitCommand(action, action === "ATTACK" ? this.livingEnemies()[0]?.combatId : undefined);
  }

  private chooseSpell(): void {
    const member = this.currentCommandMember();
    const spellId = member?.spells[this.selectedSpell];
    if (!member || !spellId) return;
    const spell = SPELLS[spellId];
    if (member.mp < spell.cost) {
      this.message = `Not enough MP for ${spell.name}.`;
      return;
    }
    if (spell.target === "enemy" && this.livingEnemies().length > 1) {
      this.choosingSpell = false;
      this.pendingAction = "TECH";
      this.pendingSpell = spellId;
      this.targetingEnemy = true;
      this.selectedEnemyIndex = 0;
      this.message = `${member.name}: choose a target.`;
      return;
    }
    if (spell.target === "ally" && this.livingMembers().length > 1) {
      this.choosingSpell = false;
      this.pendingAction = "TECH";
      this.pendingSpell = spellId;
      this.targetingMember = true;
      this.selectedMemberIndex = Math.max(0, this.livingMembers().findIndex((candidate) => candidate.id === member.id));
      this.message = `${member.name}: choose an ally.`;
      return;
    }
    this.commitCommand(
      "TECH",
      spell.target === "enemy" ? this.livingEnemies()[0]?.combatId : undefined,
      spellId,
      spell.target === "ally" || spell.target === "self" ? member.id : undefined,
    );
  }

  private confirmTarget(): void {
    if (!this.pendingAction) return;
    if (this.targetingMember) {
      const target = this.selectedMember();
      if (!target) return;
      this.commitCommand(this.pendingAction, undefined, this.pendingSpell ?? undefined, target.id);
      return;
    }
    const target = this.selectedEnemy();
    if (!target) return;
    this.commitCommand(this.pendingAction, target.combatId, this.pendingSpell ?? undefined);
  }

  private cancelTargetSelection(): void {
    const returnToSpells = this.pendingAction === "TECH";
    this.targetingEnemy = false;
    this.targetingMember = false;
    this.pendingAction = null;
    this.pendingSpell = null;
    this.choosingSpell = returnToSpells;
    const member = this.currentCommandMember();
    this.message = returnToSpells
      ? `${member?.name ?? "PARTY"}: choose a technique.`
      : `${member?.name ?? "PARTY"}: choose a command.`;
  }

  private cancelSpellSelection(): void {
    this.choosingSpell = false;
    const member = this.currentCommandMember();
    this.message = `${member?.name ?? "PARTY"}: choose a command.`;
  }

  private rewindCommand(): void {
    if (this.commandPosition <= 0) {
      const member = this.currentCommandMember();
      this.message = `${member?.name ?? "PARTY"}: no earlier command.`;
      return;
    }
    const previous = this.queuedCommands.pop();
    this.commandPosition -= 1;
    this.selectedAction = previous ? Math.max(0, ACTIONS.indexOf(previous.action)) : 0;
    const member = this.currentCommandMember();
    this.selectedSpell = previous?.spellId && member
      ? Math.max(0, member.spells.indexOf(previous.spellId))
      : 0;
    this.resumeCommand();
  }

  private commitCommand(action: BattleAction, targetEnemyId?: string, spellId?: SpellId, targetMemberId?: PartyMemberId): void {
    const member = this.currentCommandMember();
    if (!member) return;
    this.queuedCommands.push({ kind: "member", memberId: member.id, action, targetEnemyId, targetMemberId, spellId });
    this.commandPosition += 1;
    this.selectedAction = 0;
    this.selectedSpell = 0;
    this.choosingSpell = false;
    this.targetingEnemy = false;
    this.targetingMember = false;
    this.pendingAction = null;
    this.pendingSpell = null;
    if (this.commandPosition < this.commandMemberIds.length) {
      this.resumeCommand();
    } else {
      this.acceptingCommand = false;
      this.buildTurnQueue();
      this.executeNextCommand();
    }
  }

  private buildTurnQueue(): void {
    const entries = [
      ...this.queuedCommands.map((command) => {
        const member = this.member(command.memberId);
        const baseAgility = member ? effectiveStats(member).agility : 0;
        const overclocked = member && this.hasMemberStatus(member.id, "overclock") ? 1.4 : 1;
        const hasted = member && this.hasMemberStatus(member.id, "haste") ? 1.5 : 1;
        return { command, agility: Math.floor(baseAgility * overclocked * hasted) };
      }),
      ...this.livingEnemies().map((enemy) => ({
        command: { kind: "enemy", enemyId: enemy.combatId } as EnemyCommand,
        agility: this.hasStatus(enemy.statuses, "slow") ? Math.floor(enemy.definition.agility * 0.55) : enemy.definition.agility,
      })),
    ];
    entries.sort((left, right) => right.agility - left.agility);
    this.turnQueue = entries.map((entry) => entry.command);
  }

  private executeNextCommand(): void {
    if (!this.active) return;
    if (this.livingEnemies().length === 0) {
      this.resolveVictory();
      return;
    }
    const command = this.turnQueue.shift();
    if (!command) {
      this.beginCommandPhase();
      return;
    }
    if (command.kind === "enemy") {
      const enemy = this.enemies.find((candidate) => candidate.combatId === command.enemyId);
      if (!enemy || enemy.hp <= 0) this.executeNextCommand();
      else this.prepareEnemyAction(enemy, () => this.executeEnemyCommand(enemy));
      return;
    }
    const member = this.member(command.memberId);
    if (!member || member.hp <= 0) {
      this.executeNextCommand();
      return;
    }
    this.prepareMemberAction(member, () => this.executeMemberCommand(member, command));
  }

  private executeMemberCommand(member: PartyMemberProgress, command: MemberCommand): void {
    this.animationMemberId = member.id;
    this.animationTargetId = null;
    this.animationEnemyId = null;
    this.effect = "none";
    if (command.action === "ATTACK") {
      if (member.id === "sera") {
        const targets = this.livingEnemies();
        if (targets.length === 0) { this.executeNextCommand(); return; }
        const results = targets.map((target) => {
          const raw = this.damage(Math.floor(this.memberAttack(member) * 0.8), target.definition.defense, 2);
          return { target, damage: this.hasStatus(target.statuses, "barrier") ? Math.max(1, Math.floor(raw / 2)) : raw };
        });
        this.schedule(0.72, "hero-strike", `${member.name}'s disc sweeps the formation.`, () => {
          results.forEach(({ target, damage }) => { target.hp = Math.max(0, target.hp - damage); });
          this.schedule(0.58, "enemy-hit", `The formation takes ${results.reduce((sum, result) => sum + result.damage, 0)} damage.`, () => {
            this.executeNextCommand();
          }, results.map(({ target, damage }) => ({ text: `-${damage}`, tone: "damage" as const, targetEnemyId: target.combatId })),
          results.filter(({ target }) => target.hp <= 0).map(({ target }) => target.combatId));
        });
        return;
      }
      const target = this.resolveEnemyTarget(command.targetEnemyId);
      if (!target) { this.executeNextCommand(); return; }
      const rawDamage = this.damage(this.memberAttack(member), target.definition.defense, 2);
      const damage = this.hasStatus(target.statuses, "barrier") ? Math.max(1, Math.floor(rawDamage / 2)) : rawDamage;
      this.animationEnemyId = target.combatId;
      const attackMessage = member.id === "nox" && isCarbineEquipment(member.equipment.weapon)
        ? `${member.name} fires his carbine.`
        : `${member.name} closes the distance.`;
      this.schedule(0.72, "hero-strike", attackMessage, () => {
        target.hp = Math.max(0, target.hp - damage);
        this.schedule(0.58, "enemy-hit", `${target.definition.name} takes ${damage} damage.`, () => {
          this.executeNextCommand();
        }, [{ text: `-${damage}`, tone: "damage", targetEnemyId: target.combatId }],
        target.hp <= 0 ? [target.combatId] : []);
      });
      return;
    }

    if (command.action === "TECH") {
      const spell = command.spellId ?? member.spells[0] ?? "arc-bolt";
      this.castTechnique(member, spell, command.targetEnemyId, command.targetMemberId);
      return;
    }

    if (command.action === "ITEM") {
      const target = this.mostInjuredMember() ?? member;
      const restored = Math.min(16, target.maxHp - target.hp);
      this.inventory!.tonics -= 1;
      target.hp += restored;
      this.animationTargetId = target.id;
      this.effect = "mend";
      this.schedule(0.72, "hero-cast", `FIELD TONIC restores ${restored} HP to ${target.name}.`, () => {
        this.executeNextCommand();
      }, restored > 0 ? [{ text: `+${restored}`, tone: "heal", targetMemberId: target.id }] : []);
      return;
    }

    if (command.action === "DEFEND") {
      this.defending.add(member.id);
      this.schedule(0.58, "idle", `${member.name} raises a light shield.`, () => this.executeNextCommand());
      return;
    }

    this.escapeAttempts += 1;
    const escaped = Math.random() < Math.min(0.9, 0.35 + this.escapeAttempts * 0.2);
    this.schedule(0.7, "idle", escaped ? "The hostile signal is broken." : "Escape route denied.", () => {
      if (escaped) this.finish("escaped");
      else this.executeNextCommand();
    });
  }

  private castTechnique(
    member: PartyMemberProgress,
    spellId: SpellId,
    targetEnemyId?: string,
    targetMemberId?: PartyMemberId,
  ): void {
    const technique = SPELLS[spellId];
    member.mp -= technique.cost;
    this.effect = technique.visual;

    if (technique.kind === "heal") {
      const targets = technique.target === "all-allies"
        ? this.livingMembers()
        : [this.member(targetMemberId ?? member.id) ?? member].filter((target) => target.hp > 0);
      const results = targets.map((target) => {
        const restored = Math.min(technique.power + member.level * 2, target.maxHp - target.hp);
        target.hp += restored;
        return { target, restored };
      });
      this.animationTargetId = targets.length === 1 ? (targets[0]?.id ?? null) : null;
      this.schedule(0.92, "hero-cast", `${member.name} invokes ${technique.name}.`, () => {
        const total = results.reduce((sum, result) => sum + result.restored, 0);
        this.schedule(0.62, "idle", total > 0 ? `The party recovers ${total} HP.` : "No wounds answer.", () => this.executeNextCommand(),
          results.filter(({ restored }) => restored > 0).map(({ target, restored }) => ({ text: `+${restored}`, tone: "heal" as const, targetMemberId: target.id })));
      });
      return;
    }

    if (technique.kind === "status" && (technique.target === "ally" || technique.target === "all-allies" || technique.target === "self")) {
      const targets = technique.target === "all-allies"
        ? this.livingMembers()
        : [this.member(technique.target === "self" ? member.id : (targetMemberId ?? member.id)) ?? member];
      targets.forEach((target) => this.applyMemberStatus(target.id, technique.status!, technique.statusTurns ?? 2));
      this.animationTargetId = targets.length === 1 ? (targets[0]?.id ?? null) : null;
      this.schedule(0.9, "hero-cast", `${member.name} invokes ${technique.name}.`, () => {
        this.schedule(0.56, "idle", `${this.statusName(technique.status!)} surrounds ${targets.length > 1 ? "the party" : targets[0]?.name}.`, () => this.executeNextCommand());
      });
      return;
    }

    const targets = technique.target === "all-enemies"
      ? this.livingEnemies()
      : [this.resolveEnemyTarget(targetEnemyId)].filter((target): target is EnemyCombatant => !!target);
    if (targets.length === 0) { this.executeNextCommand(); return; }
    this.animationEnemyId = targets.length === 1 ? (targets[0]?.combatId ?? null) : null;
    const results = targets.map((target) => {
      const piercedDefense = Math.floor(target.definition.defense * (1 - (technique.defensePiercing ?? 0)));
      const attackPower = technique.kind === "damage"
        ? technique.power + member.level + Math.floor(this.memberAttack(member) / 3)
        : 0;
      const rawDamage = technique.kind === "damage" ? this.damage(attackPower, piercedDefense, 2) : 0;
      const dealt = technique.kind === "damage" && this.hasStatus(target.statuses, "barrier")
        ? Math.max(1, Math.floor(rawDamage / 2))
        : rawDamage;
      return { target, dealt };
    });
    this.schedule(0.92, "hero-cast", `${member.name} invokes ${technique.name}.`, () => {
      const applied: string[] = [];
      results.forEach(({ target, dealt }) => {
        target.hp = Math.max(0, target.hp - dealt);
        if (target.hp > 0 && technique.status && Math.random() < (technique.statusChance ?? 1)) {
          this.applyEnemyStatus(target, technique.status, technique.statusTurns ?? 2);
          applied.push(this.statusName(technique.status));
        }
      });
      const total = results.reduce((sum, result) => sum + result.dealt, 0);
      const resultMessage = technique.kind === "damage"
        ? `${targets.length > 1 ? "The formation" : targets[0]?.definition.name} takes ${total} damage${applied.length ? ` · ${[...new Set(applied)].join("/")}` : ""}.`
        : `${this.statusName(technique.status!)} disrupts ${targets.length > 1 ? "the formation" : targets[0]?.definition.name}.`;
      this.schedule(0.66, "enemy-hit", resultMessage, () => this.executeNextCommand(),
        results.filter(({ dealt }) => dealt > 0).map(({ target, dealt }) => ({ text: `-${dealt}`, tone: "damage" as const, targetEnemyId: target.combatId })),
        results.filter(({ target }) => target.hp <= 0).map(({ target }) => target.combatId));
    });
  }

  private executeEnemyCommand(enemy: EnemyCombatant): void {
    const living = this.livingMembers();
    if (living.length === 0) {
      this.resolveDefeat();
      return;
    }
    enemy.actionsTaken += 1;

    if (enemy.intent === "VERDICT PULSE") {
      enemy.intent = null;
      this.performGroupAttack(enemy, "VERDICT PULSE", 0.88, "storm");
      return;
    }
    if (enemy.intent === "STORM SURGE") {
      enemy.intent = null;
      this.performGroupAttack(enemy, "STORM SURGE", 0.82, "storm");
      return;
    }
    if (enemy.intent === "PHASE NOVA") {
      enemy.intent = null;
      this.performGroupAttack(enemy, "PHASE NOVA", 0.68, "weaken", "weaken");
      return;
    }
    if (enemy.intent === "BLACKOUT PULSE") {
      enemy.intent = null;
      this.performGroupAttack(enemy, "BLACKOUT PULSE", 0.72, "storm", "shock");
      return;
    }

    if (this.formation?.boss && enemy.definition.id === "phase-warden" && enemy.actionsTaken % 4 === 0) {
      this.prepareEnemyIntent(enemy, "PHASE NOVA", "Its core opens. DEFEND before the next action!");
      return;
    }
    if (this.formation?.boss && enemy.definition.id === "signal-wraith" && enemy.actionsTaken % 4 === 0) {
      this.prepareEnemyIntent(enemy, "BLACKOUT PULSE", "The tower lights collapse inward. DEFEND before the next action!");
      return;
    }
    if (this.formation?.boss && enemy.definition.id === "archive-custodian" && enemy.actionsTaken % 3 === 0) {
      this.prepareEnemyIntent(enemy, "PHASE NOVA", "The memory sphere overloads. DEFEND before the next action!");
      return;
    }
    if (enemy.definition.id === "tempest-regent" && enemy.actionsTaken % 3 === 0) {
      this.prepareEnemyIntent(enemy, "STORM SURGE", "The turbine rings charge. DEFEND before the next action!");
      return;
    }

    if (enemy.definition.id === "crown-judicator") {
      if (enemy.actionsTaken % 4 === 0) this.prepareEnemyIntent(enemy, "VERDICT PULSE", "The crown opens. DEFEND before the next action!");
      else if (enemy.actionsTaken % 4 === 3) this.performEnemyDisruption(enemy, this.strongestMember());
      else this.performEnemyStrike(enemy, this.randomLivingMember(), "IVORY LANCE", 1.05, 0.2);
      return;
    }

    switch (enemy.definition.behavior) {
      case "disruptor": {
        const target = this.mostFragileMember();
        if (enemy.actionsTaken % 3 === 0) this.performEnemyStrike(enemy, target, "PRISM STING", 0.85, 0, "shock", 2, "shock");
        else this.performEnemyStrike(enemy, target);
        return;
      }
      case "skirmisher":
        this.performEnemyStrike(enemy, this.mostFragileMember(), "GLINT DIVE", 0.92);
        return;
      case "protector": {
        const ally = this.enemyNeedingProtection();
        if (ally && enemy.actionsTaken % 3 === 2) this.performEnemyBarrier(enemy, ally);
        else this.performEnemyStrike(enemy, this.randomLivingMember());
        return;
      }
      case "predator": {
        const target = this.mostWoundedMember();
        if (enemy.actionsTaken % 3 === 0) this.performEnemyStrike(enemy, target, "EMBER CLAW", 0.9, 0, "burn", 3, "burn");
        else this.performEnemyStrike(enemy, target, "HUNTER CLAW", 1.05);
        return;
      }
      case "controller": {
        const ally = this.enemyNeedingProtection();
        if (ally && enemy.actionsTaken % 3 === 2) this.performEnemyBarrier(enemy, ally);
        else if (enemy.actionsTaken % 3 === 0) this.performEnemyDisruption(enemy, this.strongestMember());
        else this.performEnemyStrike(enemy, this.randomLivingMember());
        return;
      }
      case "piercer":
        this.performEnemyStrike(enemy, this.highestDefenseMember(), enemy.actionsTaken % 2 === 0 ? "RIFT LANCE" : "RIFT SHOT", 1, enemy.actionsTaken % 2 === 0 ? 0.4 : 0);
        return;
      case "artillery":
        if (enemy.actionsTaken % 4 === 0) this.prepareEnemyIntent(enemy, "STORM SURGE", "Energy floods its frame. DEFEND before the next action!");
        else this.performEnemyStrike(enemy, this.randomLivingMember(), "THUNDER FIST", 1.05);
        return;
    }
  }

  private performEnemyStrike(
    enemy: EnemyCombatant,
    target: PartyMemberProgress | undefined,
    moveName = "STRIKE",
    powerScale = 1,
    defensePiercing = 0,
    status?: BattleStatusId,
    statusTurns = 2,
    effect: BattleEffect = "none",
  ): void {
    if (!target) { this.resolveDefeat(); return; }
    this.animationMemberId = null;
    this.animationTargetId = target.id;
    this.animationEnemyId = enemy.combatId;
    this.effect = effect;
    const animation: BattleAnimation = effect === "none" ? "enemy-strike" : "enemy-cast";
    this.schedule(0.7, animation, `${enemy.definition.name} uses ${moveName} on ${target.name}.`, () => {
      const attack = Math.max(1, Math.floor(this.enemyAttack(enemy) * powerScale));
      const defense = Math.floor(effectiveStats(target).defense * (1 - defensePiercing));
      const damage = this.guardedDamage(target, this.damage(attack, defense, 1));
      target.hp = Math.max(0, target.hp - damage);
      if (target.hp > 0 && status) this.applyMemberStatus(target.id, status, statusTurns);
      const statusText = target.hp > 0 && status ? ` · ${this.statusName(status)}` : "";
      this.schedule(0.66, "hero-hit", `${target.name} takes ${damage} damage${statusText}.`, () => {
        if (this.livingMembers().length === 0) this.resolveDefeat();
        else this.executeNextCommand();
      }, [{ text: `-${damage}`, tone: "damage", targetMemberId: target.id }]);
    });
  }

  private performEnemyBarrier(enemy: EnemyCombatant, target: EnemyCombatant): void {
    this.animationMemberId = null;
    this.animationTargetId = null;
    this.animationEnemyId = target.combatId;
    this.effect = "barrier";
    this.applyEnemyStatus(target, "barrier", 3);
    this.schedule(0.82, "enemy-cast", `${enemy.definition.name} projects SENTINEL VEIL.`, () => {
      this.schedule(0.54, "idle", `BARRIER protects ${target.definition.name}.`, () => this.executeNextCommand());
    });
  }

  private performEnemyDisruption(enemy: EnemyCombatant, target: PartyMemberProgress | undefined): void {
    if (!target) { this.resolveDefeat(); return; }
    this.animationMemberId = null;
    this.animationTargetId = target.id;
    this.animationEnemyId = enemy.combatId;
    this.effect = "weaken";
    this.applyMemberStatus(target.id, "weaken", 3);
    this.schedule(0.82, "enemy-cast", `${enemy.definition.name} casts SIGNAL BREAK on ${target.name}.`, () => {
      this.schedule(0.54, "idle", `${target.name}'s attack signal is weakened.`, () => this.executeNextCommand());
    });
  }

  private prepareEnemyIntent(enemy: EnemyCombatant, intent: EnemyIntent, warning: string): void {
    enemy.intent = intent;
    this.animationMemberId = null;
    this.animationTargetId = null;
    this.animationEnemyId = enemy.combatId;
    this.effect = "storm";
    this.schedule(0.9, "enemy-cast", `${enemy.definition.name} prepares ${intent}.`, () => {
      this.schedule(0.72, "idle", warning, () => this.executeNextCommand());
    });
  }

  private performGroupAttack(
    enemy: EnemyCombatant,
    moveName: string,
    powerScale: number,
    effect: BattleEffect,
    status?: BattleStatusId,
  ): void {
    const targets = this.livingMembers();
    this.animationMemberId = null;
    this.animationTargetId = null;
    this.animationEnemyId = enemy.combatId;
    this.effect = effect;
    this.schedule(0.9, "enemy-cast", `${enemy.definition.name} unleashes ${moveName}!`, () => {
      const results = targets.map((target) => {
        const attack = Math.max(1, Math.floor(this.enemyAttack(enemy) * powerScale));
        const damage = this.guardedDamage(target, this.damage(attack, effectiveStats(target).defense, 1));
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp > 0 && status) this.applyMemberStatus(target.id, status, 2);
        return { target, damage };
      });
      const total = results.reduce((sum, result) => sum + result.damage, 0);
      this.schedule(0.75, "hero-hit", `The party takes ${total} total damage${status ? ` · ${this.statusName(status)}` : ""}.`, () => {
        if (this.livingMembers().length === 0) this.resolveDefeat();
        else this.executeNextCommand();
      }, results.map(({ target, damage }) => ({ text: `-${damage}`, tone: "damage" as const, targetMemberId: target.id })));
    });
  }

  private resolveVictory(): void {
    if (!this.inventory) return;
    const experience = this.enemies.reduce((total, enemy) => total + enemy.definition.experience, 0);
    const credits = this.enemies.reduce((total, enemy) => total + enemy.definition.credits, 0);
    const members = applyVictoryProgress(this.activeMembers(), experience);
    this.inventory.credits += credits;
    this.results = { experience, credits, members };
    this.animationMemberId = null;
    this.animationTargetId = null;
    this.animationEnemyId = null;
    this.schedule(0.82, "victory", "Hostile formation dispersed.", () => {
      // Confirm presses made during the victory animation must not immediately
      // dismiss the results screen as soon as it becomes interactive.
      this.input.clearPresses();
      this.awaitingResults = true;
      this.animation = "idle";
      this.effect = "none";
      this.message = "Press A to return to the field.";
    });
  }

  private resolveDefeat(): void {
    this.animationMemberId = null;
    this.animationEnemyId = null;
    this.schedule(1.25, "hero-hit", "All party signals fall silent…", () => this.finish("defeat"));
  }

  private beginCommandPhase(): void {
    this.defending.clear();
    this.queuedCommands = [];
    this.turnQueue = [];
    this.commandMemberIds = this.livingMembers().map((member) => member.id);
    this.commandPosition = 0;
    this.selectedAction = 0;
    this.resumeCommand();
  }

  private resumeCommand(): void {
    const member = this.currentCommandMember();
    if (!member) {
      this.resolveDefeat();
      return;
    }
    // Inputs pressed while the previous animation or command transition was
    // running must never be interpreted as a choice for the next character.
    this.input.clearPresses();
    this.acceptingCommand = true;
    this.choosingSpell = false;
    this.targetingEnemy = false;
    this.targetingMember = false;
    this.pendingAction = null;
    this.pendingSpell = null;
    this.animation = "idle";
    this.effect = "none";
    this.animationMemberId = member.id;
    this.animationTargetId = null;
    this.animationEnemyId = null;
    this.message = `${member.name}: choose a command.`;
    this.timer = 0;
    this.afterTimer = null;
    this.popups = [];
    this.defeatedEnemyIds = [];
  }

  private schedule(
    duration: number,
    animation: BattleAnimation,
    message: string,
    callback: () => void,
    popups: readonly BattlePopupView[] = [],
    defeatedEnemyIds: readonly string[] = [],
  ): void {
    this.acceptingCommand = false;
    this.targetingEnemy = false;
    this.duration = duration;
    this.timer = duration;
    this.animation = animation;
    if (animation !== "hero-cast" && animation !== "enemy-cast") this.effect = "none";
    this.message = message;
    this.afterTimer = callback;
    this.popups = [...popups];
    this.defeatedEnemyIds = [...defeatedEnemyIds];
  }

  private finish(outcome: BattleOutcome): void {
    const callback = this.endCallback;
    this.party = null;
    this.inventory = null;
    this.formation = null;
    this.enemies = [];
    this.results = null;
    this.awaitingResults = false;
    this.popups = [];
    this.defeatedEnemyIds = [];
    this.memberStatuses.clear();
    this.endCallback = null;
    this.afterTimer = null;
    callback?.(outcome);
  }

  private activeMembers(): PartyMemberProgress[] {
    if (!this.party) return [];
    return this.party.activeMemberIds
      .map((id) => this.party?.roster.find((member) => member.id === id))
      .filter((member): member is PartyMemberProgress => !!member);
  }

  private livingMembers(): PartyMemberProgress[] {
    return this.activeMembers().filter((member) => member.hp > 0);
  }

  private livingEnemies(): EnemyCombatant[] {
    return this.enemies.filter((enemy) => enemy.hp > 0);
  }

  private member(id: PartyMemberId): PartyMemberProgress | undefined {
    return this.party?.roster.find((member) => member.id === id);
  }

  private currentCommandMember(): PartyMemberProgress | undefined {
    const id = this.commandMemberIds[this.commandPosition];
    return id ? this.member(id) : undefined;
  }

  private mostInjuredMember(): PartyMemberProgress | undefined {
    return this.livingMembers()
      .filter((member) => member.hp < member.maxHp)
      .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];
  }

  private randomLivingMember(): PartyMemberProgress | undefined {
    const living = this.livingMembers();
    return living[Math.floor(Math.random() * living.length)] ?? living[0];
  }

  private mostFragileMember(): PartyMemberProgress | undefined {
    return [...this.livingMembers()].sort((left, right) => {
      const healthDifference = left.hp / left.maxHp - right.hp / right.maxHp;
      return healthDifference || effectiveStats(left).defense - effectiveStats(right).defense;
    })[0];
  }

  private mostWoundedMember(): PartyMemberProgress | undefined {
    return [...this.livingMembers()].sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp)[0];
  }

  private highestDefenseMember(): PartyMemberProgress | undefined {
    return [...this.livingMembers()].sort((left, right) => effectiveStats(right).defense - effectiveStats(left).defense)[0];
  }

  private strongestMember(): PartyMemberProgress | undefined {
    return [...this.livingMembers()].sort((left, right) => this.memberAttack(right) - this.memberAttack(left))[0];
  }

  private enemyNeedingProtection(): EnemyCombatant | undefined {
    return [...this.livingEnemies()]
      .filter((enemy) => !this.hasStatus(enemy.statuses, "barrier"))
      .sort((left, right) => left.hp / left.definition.maxHp - right.hp / right.definition.maxHp)[0];
  }

  private resolveEnemyTarget(combatId?: string): EnemyCombatant | undefined {
    return this.livingEnemies().find((enemy) => enemy.combatId === combatId) ?? this.livingEnemies()[0];
  }

  private selectedEnemy(): EnemyCombatant | undefined {
    const living = this.livingEnemies();
    if (living.length === 0) return undefined;
    this.selectedEnemyIndex %= living.length;
    return living[this.selectedEnemyIndex];
  }

  private selectedMember(): PartyMemberProgress | undefined {
    const living = this.livingMembers();
    if (living.length === 0) return undefined;
    this.selectedMemberIndex %= living.length;
    return living[this.selectedMemberIndex];
  }

  private moveMemberSelection(direction: -1 | 1): void {
    const count = this.livingMembers().length;
    if (count === 0) return;
    this.selectedMemberIndex = (this.selectedMemberIndex + direction + count) % count;
  }

  private memberAttack(member: PartyMemberProgress): number {
    const base = effectiveStats(member).attack;
    if (this.hasMemberStatus(member.id, "weaken")) return Math.floor(base * 0.7);
    if (this.hasMemberStatus(member.id, "overclock")) return Math.floor(base * 1.45);
    return base;
  }

  private enemyAttack(enemy: EnemyCombatant): number {
    return this.hasStatus(enemy.statuses, "weaken")
      ? Math.floor(enemy.definition.attack * 0.7)
      : enemy.definition.attack;
  }

  private guardedDamage(target: PartyMemberProgress, baseDamage: number): number {
    const guarded = this.defending.has(target.id);
    const barrier = this.hasMemberStatus(target.id, "barrier");
    const damage = guarded || barrier ? Math.max(1, Math.floor(baseDamage / 2)) : baseDamage;
    this.defending.delete(target.id);
    return damage;
  }

  private prepareMemberAction(member: PartyMemberProgress, proceed: () => void): void {
    const statuses = this.memberStatuses.get(member.id) ?? [];
    const burning = this.hasStatus(statuses, "burn");
    const shocked = this.hasStatus(statuses, "shock") && Math.random() < 0.4;
    this.tickStatuses(statuses);
    if (burning) {
      const damage = Math.max(2, Math.ceil(member.maxHp * 0.06));
      member.hp = Math.max(0, member.hp - damage);
      this.animationTargetId = member.id;
      this.schedule(0.5, "hero-hit", `${member.name} takes ${damage} BURN damage.`, () => {
        if (member.hp <= 0) {
          if (this.livingMembers().length === 0) this.resolveDefeat();
          else this.executeNextCommand();
        } else if (shocked) {
          this.schedule(0.5, "idle", `${member.name} is interrupted by SHOCK.`, () => this.executeNextCommand());
        } else proceed();
      }, [{ text: `-${damage}`, tone: "damage", targetMemberId: member.id }]);
      return;
    }
    if (shocked) {
      this.schedule(0.5, "idle", `${member.name} is interrupted by SHOCK.`, () => this.executeNextCommand());
      return;
    }
    proceed();
  }

  private prepareEnemyAction(enemy: EnemyCombatant, proceed: () => void): void {
    const burning = this.hasStatus(enemy.statuses, "burn");
    const shocked = this.hasStatus(enemy.statuses, "shock") && Math.random() < 0.4;
    this.tickStatuses(enemy.statuses);
    if (burning) {
      const damage = Math.max(3, Math.ceil(enemy.definition.maxHp * 0.06));
      enemy.hp = Math.max(0, enemy.hp - damage);
      this.animationEnemyId = enemy.combatId;
      this.schedule(0.5, "enemy-hit", `${enemy.definition.name} takes ${damage} BURN damage.`, () => {
        if (enemy.hp <= 0 || shocked) this.executeNextCommand();
        else proceed();
      }, [{ text: `-${damage}`, tone: "damage", targetEnemyId: enemy.combatId }], enemy.hp <= 0 ? [enemy.combatId] : []);
      return;
    }
    if (shocked) {
      this.schedule(0.5, "idle", `${enemy.definition.name} is interrupted by SHOCK.`, () => this.executeNextCommand());
      return;
    }
    proceed();
  }

  private applyMemberStatus(memberId: PartyMemberId, id: BattleStatusId, turns: number): void {
    const statuses = this.memberStatuses.get(memberId) ?? [];
    this.upsertStatus(statuses, id, turns);
    this.memberStatuses.set(memberId, statuses);
  }

  private applyEnemyStatus(enemy: EnemyCombatant, id: BattleStatusId, turns: number): void {
    this.upsertStatus(enemy.statuses, id, turns);
  }

  private upsertStatus(statuses: BattleStatus[], id: BattleStatusId, turns: number): void {
    const existing = statuses.find((status) => status.id === id);
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else statuses.push({ id, turns });
  }

  private tickStatuses(statuses: BattleStatus[]): void {
    statuses.forEach((status) => { status.turns -= 1; });
    for (let index = statuses.length - 1; index >= 0; index -= 1) {
      if ((statuses[index]?.turns ?? 0) <= 0) statuses.splice(index, 1);
    }
  }

  private hasMemberStatus(memberId: PartyMemberId, id: BattleStatusId): boolean {
    return this.hasStatus(this.memberStatuses.get(memberId) ?? [], id);
  }

  private hasStatus(statuses: readonly BattleStatus[], id: BattleStatusId): boolean {
    return statuses.some((status) => status.id === id && status.turns > 0);
  }

  private statusName(id: BattleStatusId): string {
    return id.toUpperCase();
  }

  private moveEnemySelection(direction: -1 | 1): void {
    const count = this.livingEnemies().length;
    if (count === 0) return;
    this.selectedEnemyIndex = (this.selectedEnemyIndex + direction + count) % count;
  }

  private damage(attack: number, defense: number, variance: number): number {
    return Math.max(1, attack - Math.floor(defense / 2) + Math.floor(Math.random() * (variance + 1)));
  }

  private moveSelectionHorizontal(direction: -1 | 1): void {
    const inLeftColumn = this.selectedAction <= 2;
    if (direction > 0 && inLeftColumn) {
      const row = Math.min(this.selectedAction, 1);
      this.selectedAction = 3 + row;
    } else if (direction < 0 && !inLeftColumn) {
      this.selectedAction -= 3;
    }
  }

  private moveSelectionVertical(direction: -1 | 1): void {
    const column = this.selectedAction <= 2 ? [0, 1, 2] : [3, 4];
    const row = column.indexOf(this.selectedAction);
    const nextRow = (row + direction + column.length) % column.length;
    this.selectedAction = column[nextRow] ?? column[0] ?? 0;
  }

  private moveSpellSelection(direction: -1 | 1): void {
    const count = this.currentCommandMember()?.spells.length ?? 0;
    if (count === 0) return;
    this.selectedSpell = (this.selectedSpell + direction + count) % count;
  }
}
