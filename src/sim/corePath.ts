export type CoreKey = "qing" | "li" | "yu" | "wu" | "ying";

export type CoreVector = Record<CoreKey, number>;

export type TileKind = "void" | "path" | "water" | "forest" | "stone" | "light" | "rift";

export interface Tile {
  kind: TileKind;
  resolved?: boolean;
}

export interface Choice {
  label: string;
  body: string;
  delta: Partial<CoreVector>;
  log: string;
  costInsight?: number;
}

export interface EchoNode {
  id: number;
  x: number;
  y: number;
  type: CoreKey;
  title: string;
  body: string;
  resolved: boolean;
  choices: Choice[];
}

export interface InsightShard {
  id: number;
  x: number;
  y: number;
  type: CoreKey;
  collected: boolean;
}

export interface WorldPalette {
  name: string;
  sky: number;
  path: number;
  pathEdge: number;
  water: number;
  forest: number;
  stone: number;
  light: number;
  accent: string;
}

export interface Ending {
  type: CoreKey;
  title: string;
  subtitle: string;
  body: string;
  seal: string;
}

export interface SimulationSnapshot {
  width: number;
  height: number;
  player: { x: number; y: number };
  tiles: Tile[][];
  nodes: EchoNode[];
  shards: InsightShard[];
  core: CoreVector;
  palette: WorldPalette;
  log: string[];
  insight: number;
  stability: number;
  resolvedCount: number;
  nearbyNode: EchoNode | null;
  ending: Ending | null;
}

const WIDTH = 28;
const HEIGHT = 20;
const NODE_COUNT = 5;
const START_CORE: CoreVector = {
  qing: 58,
  li: 48,
  yu: 44,
  wu: 52,
  ying: 30
};

const PALETTES: Record<CoreKey, WorldPalette> = {
  qing: {
    name: "绛珠还泪境",
    sky: 0x130f12,
    path: 0x6f374e,
    pathEdge: 0xff9cb8,
    water: 0x514169,
    forest: 0x355645,
    stone: 0x5a505f,
    light: 0xffd8e6,
    accent: "#ff9cb8"
  },
  li: {
    name: "荣府礼法域",
    sky: 0x0e0a09,
    path: 0x4a3627,
    pathEdge: 0xf2d58b,
    water: 0x233845,
    forest: 0x263629,
    stone: 0x443a34,
    light: 0xffedbc,
    accent: "#f2d58b"
  },
  yu: {
    name: "怡红迷香境",
    sky: 0x170d13,
    path: 0x823e60,
    pathEdge: 0xff7fb6,
    water: 0x432b52,
    forest: 0x52353b,
    stone: 0x69445d,
    light: 0xffc2d9,
    accent: "#ff7fb6"
  },
  wu: {
    name: "太虚观照境",
    sky: 0x0c1119,
    path: 0x435e7d,
    pathEdge: 0x9ed3ff,
    water: 0x1f5268,
    forest: 0x2e514b,
    stone: 0x556270,
    light: 0xe8f6ff,
    accent: "#9ed3ff"
  },
  ying: {
    name: "风月暗影境",
    sky: 0x08080c,
    path: 0x493758,
    pathEdge: 0xd5a7ff,
    water: 0x24233a,
    forest: 0x2e2733,
    stone: 0x5b526a,
    light: 0xffd8f6,
    accent: "#d5a7ff"
  }
};

const ENDINGS: Record<CoreKey, Omit<Ending, "type">> = {
  qing: {
    title: "绛珠还泪",
    subtitle: "以情入梦，以泪成径。",
    body: "你没有改掉命数最锋利的部分，却替它留住了柔软。太虚册上写着：凡真情不能全胜，亦不曾全败。",
    seal: "情"
  },
  li: {
    title: "朱门无声",
    subtitle: "以礼护局，以静藏伤。",
    body: "你让园中灯火重新归位，体面保住了裂缝。太虚册上写着：秩序能遮风，却未必能安魂。",
    seal: "礼"
  },
  yu: {
    title: "怡红不醒",
    subtitle: "以欲留春，以梦抵命。",
    body: "你把一瞬热闹护成了长夜里的花影。太虚册上写着：愿望不是罪，只是太像一场不肯醒的春梦。",
    seal: "欲"
  },
  wu: {
    title: "太虚出梦",
    subtitle: "以悟观局，以明照人。",
    body: "你读懂了判词，也读懂了判词之外的人。太虚册上写着：看破不是离开，而是不再替幻象作证。",
    seal: "悟"
  },
  ying: {
    title: "风月成谶",
    subtitle: "以影补白，以谶收场。",
    body: "你把未说出口的话都交给暗处，梦境因此完整，也因此更冷。太虚册上写着：被压下的心事，终会替人落款。",
    seal: "影"
  }
};

const NODE_TEMPLATES: Record<CoreKey, Omit<EchoNode, "id" | "x" | "y" | "resolved">> = {
  qing: {
    type: "qing",
    title: "葬花冢",
    body: "落花铺满小径，有人把残红一片片收进帕中。她问：花有去处，人心有没有？",
    choices: [
      {
        label: "与她同葬落花",
        body: "情 +16 / 礼 -4",
        delta: { qing: 16, li: -4 },
        log: "你与她同葬落花，梦境生出一条带泪的暖径。"
      },
      {
        label: "追问花魂判词",
        body: "悟 +12 / 情 +4",
        delta: { wu: 12, qing: 4 },
        costInsight: 1,
        log: "你在落花下读到半句判词，怜惜忽然变成了洞明。"
      },
      {
        label: "劝她收泪入席",
        body: "礼 +10 / 影 +5",
        delta: { li: 10, ying: 5 },
        log: "你把泪意按回礼数里，廊下的灯亮了，影子也深了。"
      }
    ]
  },
  li: {
    type: "li",
    title: "抄检大观园",
    body: "夜色里灯火一盏盏逼近，箱笼被打开，体面与秘密同时暴露。",
    choices: [
      {
        label: "维护规矩",
        body: "礼 +16 / 影 +6",
        delta: { li: 16, ying: 6 },
        log: "你维护了规矩，朱门更高，园中的风却冷了一寸。"
      },
      {
        label: "暗藏关键物",
        body: "情 +12 / 礼 -5",
        delta: { qing: 12, li: -5 },
        log: "你把一件小物藏进袖中，有人的命数暂时避开了灯火。"
      },
      {
        label: "借判词查源头",
        body: "悟 +14",
        delta: { wu: 14, ying: -3 },
        costInsight: 1,
        log: "你不争一时清白，只顺着判词看见了整座府的裂缝。"
      }
    ]
  },
  yu: {
    type: "yu",
    title: "怡红夜宴",
    body: "杯盏、花签、笑语和香气都挤在一处。热闹像一场很美的误会。",
    choices: [
      {
        label: "入席尽欢",
        body: "欲 +16",
        delta: { yu: 16, qing: 4 },
        log: "你入席尽欢，花影摇得更近，路也变得更软。"
      },
      {
        label: "拦住失言",
        body: "情 +8 / 礼 +8",
        delta: { qing: 8, li: 8 },
        log: "你在笑语落地前接住它，席间少了一场日后的风波。"
      },
      {
        label: "看穿虚欢",
        body: "悟 +12 / 影 -4",
        delta: { wu: 12, ying: -4 },
        costInsight: 1,
        log: "你看见热闹背后的空，杯中月影忽然清了。"
      }
    ]
  },
  wu: {
    type: "wu",
    title: "太虚判词",
    body: "警幻的册页悬在雾里，每翻一页，园中便有一人的结局微微发亮。",
    choices: [
      {
        label: "翻阅金陵册",
        body: "悟 +18",
        delta: { wu: 18, ying: 4 },
        costInsight: 1,
        log: "你翻开金陵册，命数不再像谜，却更像无法回避的路。"
      },
      {
        label: "把册页合上",
        body: "情 +10 / 悟 -2",
        delta: { qing: 10, wu: -2 },
        log: "你合上册页，宁可多留一刻不知结局的温柔。"
      },
      {
        label: "问命从何来",
        body: "悟 +8 / 影 +8",
        delta: { wu: 8, ying: 8 },
        log: "你问命从何来，太虚境沉默，沉默里开出暗纹。"
      }
    ]
  },
  ying: {
    type: "ying",
    title: "蘅芜雪径",
    body: "雪压竹枝，冷香无声。有人把锋利藏进端正里，把孤独藏进周全里。",
    choices: [
      {
        label: "走进冷香",
        body: "礼 +12 / 情 -4",
        delta: { li: 12, qing: -4 },
        log: "你走进冷香，雪径整齐得近乎无情。"
      },
      {
        label: "记下她的沉默",
        body: "悟 +10 / 影 -5",
        delta: { wu: 10, ying: -5 },
        costInsight: 1,
        log: "你没有评判沉默，只记下沉默如何保护一个人。"
      },
      {
        label: "让误会继续",
        body: "影 +14 / 欲 +4",
        delta: { ying: 14, yu: 4 },
        log: "你让误会继续，雪没有落声，暗处却多了一条岔路。"
      }
    ]
  }
};

export class CorePathSimulation {
  private seed = 104729;
  private player = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
  private tiles: Tile[][] = [];
  private nodes: EchoNode[] = [];
  private shards: InsightShard[] = [];
  private core: CoreVector = { ...START_CORE };
  private insight = 0;
  private stability = 86;
  private log: string[] = ["你在太虚幻境醒来。通灵玉微热，园中命数尚未落笔。"];

  constructor() {
    this.generateWorld();
  }

  reset(): SimulationSnapshot {
    this.seed = (this.seed * 48271 + 1) % 2147483647;
    this.player = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
    this.core = { ...START_CORE };
    this.insight = 0;
    this.stability = 86;
    this.log = ["梦境重开。太虚册页合上，等你重新题一笔。"];
    this.generateWorld();
    return this.snapshot();
  }

  move(dx: number, dy: number): SimulationSnapshot {
    const next = { x: this.player.x + dx, y: this.player.y + dy };
    if (this.isWalkable(next.x, next.y)) {
      this.player = next;
      this.stability = clamp(this.stability - moveCost(this.tiles[next.y][next.x].kind), 0, 100);
      this.collectNearbyShard();
      this.applyLowStabilityPressure();
    }
    return this.snapshot();
  }

  resolveNode(nodeId: number, choiceIndex: number): SimulationSnapshot {
    const node = this.nodes.find((candidate) => candidate.id === nodeId);
    const choice = node?.choices[choiceIndex];
    if (!node || node.resolved || !choice) {
      return this.snapshot();
    }
    if ((choice.costInsight ?? 0) > this.insight) {
      this.log.unshift("判词残页不足。你能看见那条路，却还读不懂它。");
      this.log = this.log.slice(0, 6);
      return this.snapshot();
    }

    node.resolved = true;
    this.insight -= choice.costInsight ?? 0;
    this.stability = clamp(this.stability + 14, 0, 100);
    this.core = applyDelta(this.core, choice.delta);
    this.log.unshift(choice.log);
    this.log = this.log.slice(0, 6);
    this.seed += node.id * 811 + choiceIndex * 37;
    this.generateWorld(this.nodes);
    return this.snapshot();
  }

  getInteractableNode(): EchoNode | null {
    return this.nodes.find((node) => !node.resolved && distance(node, this.player) <= 1.35) ?? null;
  }

  snapshot(): SimulationSnapshot {
    return {
      width: WIDTH,
      height: HEIGHT,
      player: { ...this.player },
      tiles: this.tiles.map((row) => row.map((tile) => ({ ...tile }))),
      nodes: this.nodes.map((node) => ({
        ...node,
        choices: node.choices.map((choice) => ({ ...choice, delta: { ...choice.delta } }))
      })),
      shards: this.shards.map((shard) => ({ ...shard })),
      core: { ...this.core },
      palette: this.palette(),
      log: [...this.log],
      insight: this.insight,
      stability: this.stability,
      resolvedCount: this.nodes.filter((node) => node.resolved).length,
      nearbyNode: this.getInteractableNode(),
      ending: this.ending()
    };
  }

  private generateWorld(previousNodes?: EchoNode[]): void {
    const random = mulberry32(this.seed + Math.round(coreWeight(this.core) * 13));
    this.tiles = Array.from({ length: HEIGHT }, () =>
      Array.from({ length: WIDTH }, () => ({ kind: "void" as TileKind }))
    );

    const path = carveMainPath(this.core, random);
    for (const point of path) {
      this.tiles[point.y][point.x] = { kind: "path" };
      for (const neighbor of neighbors(point.x, point.y)) {
        if (random() > 0.68) {
          this.tiles[neighbor.y][neighbor.x] = { kind: "path" };
        }
      }
    }

    this.decorateTerrain(random);
    this.nodes = this.placeNodes(path, random, previousNodes);
    this.shards = this.placeShards(path, random);
    for (const point of [{ ...this.player }, ...neighbors(this.player.x, this.player.y)]) {
      this.tiles[point.y][point.x] = { kind: "path" };
    }
    for (const node of this.nodes) {
      this.tiles[node.y][node.x] = { kind: node.resolved ? "path" : "light" };
      for (const neighbor of neighbors(node.x, node.y)) {
        if (this.tiles[neighbor.y][neighbor.x].kind === "void") {
          this.tiles[neighbor.y][neighbor.x] = { kind: "path" };
        }
      }
    }
    for (const shard of this.shards) {
      if (!shard.collected && this.tiles[shard.y][shard.x].kind === "void") {
        this.tiles[shard.y][shard.x] = { kind: "path" };
      }
    }
    this.tiles[this.player.y][this.player.x] = { kind: "light" };
  }

  private decorateTerrain(random: () => number): void {
    const dominant = dominantCore(this.core);
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (this.tiles[y][x].kind !== "void") continue;
        const roll = random();
        if (dominant === "qing") {
          this.tiles[y][x] = { kind: roll > 0.62 ? "water" : roll > 0.35 ? "forest" : roll > 0.27 ? "rift" : "void" };
        } else if (dominant === "li") {
          this.tiles[y][x] = { kind: roll > 0.58 ? "stone" : roll > 0.32 ? "forest" : roll > 0.24 ? "rift" : "void" };
        } else if (dominant === "yu") {
          this.tiles[y][x] = { kind: roll > 0.6 ? "forest" : roll > 0.36 ? "water" : roll > 0.26 ? "rift" : "void" };
        } else if (dominant === "wu") {
          this.tiles[y][x] = { kind: roll > 0.72 ? "light" : roll > 0.42 ? "water" : roll > 0.32 ? "rift" : "void" };
        } else {
          this.tiles[y][x] = { kind: roll > 0.7 ? "stone" : roll > 0.47 ? "water" : roll > 0.28 ? "rift" : "void" };
        }
      }
    }
  }

  private placeNodes(path: Array<{ x: number; y: number }>, random: () => number, previousNodes?: EchoNode[]): EchoNode[] {
    const slots = [0.14, 0.32, 0.5, 0.68, 0.86].map((ratio) => path[Math.floor(path.length * ratio)]);
    const order = coreOrder(this.core);
    return slots.map((slot, index) => {
      const existing = previousNodes?.[index];
      const type = existing?.type ?? order[index % order.length];
      const template = NODE_TEMPLATES[type];
      return {
        ...template,
        id: index + 1,
        x: clamp(slot.x + Math.floor(random() * 3) - 1, 1, WIDTH - 2),
        y: clamp(slot.y + Math.floor(random() * 3) - 1, 1, HEIGHT - 2),
        resolved: existing?.resolved ?? false
      };
    });
  }

  private palette(): WorldPalette {
    return PALETTES[dominantCore(this.core)];
  }

  private ending(): Ending | null {
    if (this.nodes.filter((node) => node.resolved).length < NODE_COUNT) {
      return null;
    }
    const type = dominantCore(this.core);
    return {
      type,
      ...ENDINGS[type]
    };
  }

  private placeShards(path: Array<{ x: number; y: number }>, random: () => number): InsightShard[] {
    const nodeKeys = new Set(this.nodes.map((node) => `${node.x}:${node.y}`));
    const startKey = `${this.player.x}:${this.player.y}`;
    const options = path.filter((point) => !nodeKeys.has(`${point.x}:${point.y}`) && `${point.x}:${point.y}` !== startKey);
    const order = coreOrder(this.core);
    const count = 8;
    const openingShard: InsightShard = {
      id: 1,
      x: clamp(this.player.x + 1, 1, WIDTH - 2),
      y: this.player.y,
      type: dominantCore(this.core),
      collected: false
    };
    const rest = Array.from({ length: count - 1 }, (_, index) => {
      const slot = options[Math.floor(random() * options.length)] ?? path[Math.floor(path.length / 2)];
      return {
        id: index + 2,
        x: slot.x,
        y: slot.y,
        type: order[(index + Math.floor(random() * order.length)) % order.length],
        collected: false
      };
    });
    return [openingShard, ...rest];
  }

  private collectNearbyShard(): void {
    const shard = this.shards.find((candidate) => !candidate.collected && distance(candidate, this.player) <= 0.45);
    if (!shard) {
      return;
    }
    shard.collected = true;
    this.insight += 1;
    this.stability = clamp(this.stability + 7, 0, 100);
    this.core = applyDelta(this.core, { [shard.type]: 3 });
    this.log.unshift(`拾取一枚${coreName(shard.type)}花签，判词残页 +1。`);
    this.log = this.log.slice(0, 6);
  }

  private applyLowStabilityPressure(): void {
    if (this.stability !== 0) {
      return;
    }
    this.core = applyDelta(this.core, { ying: 5, qing: -3 });
    this.stability = 24;
    this.log.unshift("梦境稳定触底。风月暗影替你补上了未说出口的心事。");
    this.log = this.log.slice(0, 6);
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return false;
    }
    const kind = this.tiles[y][x].kind;
    return kind !== "void" && kind !== "stone";
  }
}

function moveCost(kind: TileKind): number {
  return {
    void: 0,
    path: 1,
    light: 1,
    forest: 2,
    water: 3,
    rift: 5,
    stone: 0
  }[kind];
}

function carveMainPath(core: CoreVector, random: () => number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const start = { x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) };
  let cursor = { ...start };
  points.push({ ...cursor });

  const branches = 76 + Math.floor(core.wu / 3);
  for (let i = 0; i < branches; i += 1) {
    const preferredHorizontal = core.li + core.yu + random() * 55 > core.qing + core.wu + 18;
    const drift = random();
    const dx = preferredHorizontal ? (drift > 0.52 ? 1 : -1) : random() > 0.5 ? 1 : -1;
    const dy = preferredHorizontal ? (random() > 0.5 ? 1 : -1) : drift > 0.46 ? 1 : -1;
    cursor = {
      x: clamp(cursor.x + (random() > 0.34 ? dx : 0), 2, WIDTH - 3),
      y: clamp(cursor.y + (random() > 0.34 ? dy : 0), 2, HEIGHT - 3)
    };
    points.push({ ...cursor });
  }

  for (let i = 0; i < Math.floor((core.qing + core.yu) / 8); i += 1) {
    const anchor = points[Math.floor(random() * points.length)];
    points.push(...neighbors(anchor.x, anchor.y).filter(() => random() > 0.35));
  }

  return uniquePoints(points);
}

function applyDelta(core: CoreVector, delta: Partial<CoreVector>): CoreVector {
  return {
    qing: clamp(core.qing + (delta.qing ?? 0), 0, 100),
    li: clamp(core.li + (delta.li ?? 0), 0, 100),
    yu: clamp(core.yu + (delta.yu ?? 0), 0, 100),
    wu: clamp(core.wu + (delta.wu ?? 0), 0, 100),
    ying: clamp(core.ying + (delta.ying ?? 0), 0, 100)
  };
}

function dominantCore(core: CoreVector): CoreKey {
  return coreOrder(core)[0];
}

function coreName(key: CoreKey): string {
  return {
    qing: "情",
    li: "礼",
    yu: "欲",
    wu: "悟",
    ying: "影"
  }[key];
}

function coreOrder(core: CoreVector): CoreKey[] {
  return (Object.keys(core) as CoreKey[]).sort((a, b) => core[b] - core[a]);
}

function coreWeight(core: CoreVector): number {
  return core.qing * 1.7 + core.li * 2.3 + core.yu * 2.8 + core.wu * 3.1 + core.ying * 4.2;
}

function neighbors(x: number, y: number): Array<{ x: number; y: number }> {
  return [
    { x: clamp(x + 1, 0, WIDTH - 1), y },
    { x: clamp(x - 1, 0, WIDTH - 1), y },
    { x, y: clamp(y + 1, 0, HEIGHT - 1) },
    { x, y: clamp(y - 1, 0, HEIGHT - 1) }
  ];
}

function uniquePoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = `${point.x}:${point.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
