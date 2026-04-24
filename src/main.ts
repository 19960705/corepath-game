import Phaser from "phaser";
import { TaiXuAtmosphere } from "./atmosphere";
import { CorePathSimulation, type CoreKey, type SimulationSnapshot, type TileKind } from "./sim/corePath";
import { HudController } from "./ui/hud";
import "./styles.css";

const CELL = 32;
const simulation = new CorePathSimulation();
const hud = new HudController();
const atmosphereRoot = document.getElementById("atmosphere-root");
if (atmosphereRoot) {
  new TaiXuAtmosphere(atmosphereRoot);
}
const CORE_COLORS: Record<CoreKey, number> = {
  qing: 0xff9cb8,
  li: 0xf2d58b,
  yu: 0xff7fb6,
  wu: 0x9ed3ff,
  ying: 0xd5a7ff
};

class CorePathScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private playerHalo!: Phaser.GameObjects.Arc;
  private playerRing!: Phaser.GameObjects.Arc;
  private player!: Phaser.GameObjects.Arc;
  private playerGlyph!: Phaser.GameObjects.Text;
  private playerPointer!: Phaser.GameObjects.Triangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private snapshot!: SimulationSnapshot;
  private lastMoveAt = 0;
  private autoPath: Array<{ x: number; y: number }> = [];
  private pathPreview: Array<{ x: number; y: number }> = [];
  private diceButton: HTMLButtonElement | null = null;
  private diceResult: HTMLElement | null = null;

  constructor() {
    super("CorePathScene");
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.playerHalo = this.add.circle(0, 0, 22, 0xfff2cf, 0.18);
    this.playerHalo.setStrokeStyle(2, 0xffffff, 0.42);
    this.playerRing = this.add.circle(0, 0, 15, 0x000000, 0);
    this.playerRing.setStrokeStyle(3, 0x12070b, 0.96);
    this.player = this.add.circle(0, 0, 11, 0xffffff, 1);
    this.player.setStrokeStyle(3, 0xfff0c4, 1);
    this.playerGlyph = this.add
      .text(0, 0, "玉", {
        color: "#2b1118",
        fontFamily: "ui-serif, Songti SC, STSong, serif",
        fontSize: "13px",
        fontStyle: "900"
      })
      .setOrigin(0.5);
    this.playerPointer = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 7, 0xfff0c4, 0.96);
    this.playerPointer.setStrokeStyle(1, 0x18090f, 0.95);
    this.playerHalo.setDepth(20);
    this.playerRing.setDepth(21);
    this.player.setDepth(22);
    this.playerGlyph.setDepth(23);
    this.playerPointer.setDepth(24);
    this.tweens.add({
      targets: this.playerHalo,
      scale: { from: 0.86, to: 1.18 },
      alpha: { from: 0.18, to: 0.34 },
      duration: 880,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.cameras.main.setZoom(this.scale.width < 760 ? 1.05 : 1.18);
    this.cameras.main.setBackgroundColor("#06100e");
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,ESC") as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));
    this.scale.on("resize", () => this.frameWorld());
    document.getElementById("reset-run")?.addEventListener("click", () => this.resetRun());
    document.getElementById("ending-reset")?.addEventListener("click", () => this.resetRun());
    this.diceButton = document.getElementById("dice-roll") as HTMLButtonElement | null;
    this.diceResult = document.getElementById("dice-result");
    this.diceButton?.addEventListener("click", () => this.rollDiceMove());
    this.snapshot = simulation.snapshot();
    this.render();
  }

  update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      hud.hideChoice();
      return;
    }
    if (hud.isEndingOpen()) {
      return;
    }
    if (this.autoPath.length > 0 && time - this.lastMoveAt >= 135) {
      this.stepAutoPath(time);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.tryOpenChoice();
      return;
    }
    if (hud.isChoiceOpen() || time - this.lastMoveAt < 115) {
      return;
    }
    const dx = this.leftDown() ? -1 : this.rightDown() ? 1 : 0;
    const dy = this.upDown() ? -1 : this.downDown() ? 1 : 0;
    if (dx !== 0 || dy !== 0) {
      this.clearAutoPath();
      this.snapshot = simulation.move(dx, dy);
      this.lastMoveAt = time;
      this.render();
    }
  }

  private tryOpenChoice(): void {
    const opened = hud.showChoice(this.snapshot, (choiceIndex) => {
      const node = this.snapshot.nearbyNode;
      if (!node) return;
      this.snapshot = simulation.resolveNode(node.id, choiceIndex);
      hud.hideChoice();
      this.cameras.main.flash(260, 255, 255, 255, false);
      this.render();
    });
    if (!opened) {
      this.cameras.main.shake(80, 0.002);
    }
  }

  private resetRun(): void {
    hud.hideChoice();
    hud.hideEnding();
    this.clearAutoPath();
    if (this.diceResult) this.diceResult.textContent = "-";
    this.diceButton?.classList.remove("is-rolling");
    this.snapshot = simulation.reset();
    this.render();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (hud.isEndingOpen()) return;
    if (hud.isChoiceOpen()) return;
    if (this.snapshot.nearbyNode) {
      this.tryOpenChoice();
      return;
    }
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const tile = {
      x: Math.floor(world.x / CELL),
      y: Math.floor(world.y / CELL)
    };
    const path = this.findPath(this.snapshot.player, tile);
    if (path.length > 1) {
      this.autoPath = path.slice(1);
      this.pathPreview = [...this.autoPath];
      this.lastMoveAt = 0;
      this.render();
    } else {
      this.cameras.main.shake(90, 0.0016);
    }
  }

  private stepAutoPath(time: number): void {
    const next = this.autoPath.shift();
    if (!next) {
      this.clearAutoPath();
      return;
    }
    const dx = Math.sign(next.x - this.snapshot.player.x);
    const dy = Math.sign(next.y - this.snapshot.player.y);
    this.snapshot = simulation.move(dx, dy);
    this.pathPreview = [...this.autoPath];
    this.lastMoveAt = time;
    this.render();
    if (this.snapshot.nearbyNode || this.autoPath.length === 0) {
      this.clearAutoPath();
      this.render();
    }
  }

  private rollDiceMove(): void {
    if (hud.isChoiceOpen() || hud.isEndingOpen()) return;
    const roll = Phaser.Math.Between(1, 6);
    if (this.diceResult) this.diceResult.textContent = String(roll);
    this.diceButton?.classList.remove("is-rolling");
    window.requestAnimationFrame(() => this.diceButton?.classList.add("is-rolling"));
    const path = this.randomWalk(roll);
    if (path.length > 0) {
      this.autoPath = path;
      this.pathPreview = [...path];
      this.lastMoveAt = 0;
      this.render();
    } else {
      this.cameras.main.shake(110, 0.002);
    }
  }

  private clearAutoPath(): void {
    this.autoPath = [];
    this.pathPreview = [];
  }

  private render(): void {
    hud.update(this.snapshot);
    this.drawWorld();
    this.placePlayer();
    this.frameWorld();
  }

  private drawWorld(): void {
    const palette = this.snapshot.palette;
    this.graphics.clear();
    this.graphics.fillStyle(palette.sky, 1);
    this.graphics.fillRect(0, 0, this.snapshot.width * CELL, this.snapshot.height * CELL);
    this.drawGardenWash();
    for (let y = 0; y < this.snapshot.height; y += 1) {
      for (let x = 0; x < this.snapshot.width; x += 1) {
        this.drawTile(x, y, this.snapshot.tiles[y][x].kind);
      }
    }
    for (const node of this.snapshot.nodes) {
      this.drawDreamNode(node.x, node.y, node.resolved, node.id);
    }
    for (const shard of this.snapshot.shards) {
      if (!shard.collected) {
        this.drawShard(shard.x, shard.y, shard.type);
      }
    }
    this.drawPathPreview();
  }

  private drawPathPreview(): void {
    if (this.pathPreview.length === 0) return;
    const palette = this.snapshot.palette;
    this.graphics.lineStyle(2, palette.light, 0.62);
    this.graphics.beginPath();
    const start = this.tileCenter(this.snapshot.player);
    this.graphics.moveTo(start.x, start.y);
    for (const step of this.pathPreview) {
      const point = this.tileCenter(step);
      this.graphics.lineTo(point.x, point.y);
    }
    this.graphics.strokePath();
    this.pathPreview.forEach((step, index) => {
      const point = this.tileCenter(step);
      this.graphics.fillStyle(palette.light, 0.12 + index * 0.018);
      this.graphics.fillCircle(point.x, point.y, 10);
      this.graphics.fillStyle(palette.pathEdge, 0.78);
      this.graphics.fillCircle(point.x, point.y, 3);
    });
  }

  private drawTile(x: number, y: number, kind: TileKind): void {
    const palette = this.snapshot.palette;
    const px = x * CELL;
    const py = y * CELL;
    const variant = tileNoise(x, y);
    const inset = 3 + Math.floor(variant * 3);
    const wobbleX = Math.floor(tileNoise(x + 41, y + 17) * 4) - 2;
    const wobbleY = Math.floor(tileNoise(x + 11, y + 53) * 4) - 2;
    const color = {
      void: palette.sky,
      path: palette.path,
      water: palette.water,
      forest: palette.forest,
      stone: palette.stone,
      light: palette.light,
      rift: 0x111014
    }[kind];
    if (kind === "void") {
      if (variant > 0.82) {
        this.graphics.fillStyle(0xffffff, 0.025);
        this.graphics.fillCircle(px + 8 + wobbleX, py + 9 + wobbleY, 1.6);
      }
      return;
    }

    if (kind === "path") {
      this.drawIrregularStone(px, py, color, palette.pathEdge, inset, wobbleX, wobbleY, 0.9);
      return;
    }

    if (kind === "light") {
      this.drawIrregularStone(px, py, color, palette.pathEdge, 2, wobbleX, wobbleY, 0.42);
      this.drawLotusSeal(px + CELL / 2, py + CELL / 2, palette.light, palette.pathEdge, variant);
      return;
    }

    if (kind === "forest") {
      this.drawLeafCluster(px, py, color, palette.pathEdge, variant);
      return;
    }

    if (kind === "water") {
      this.drawWaterTile(px, py, color, palette.pathEdge, variant);
      return;
    }

    if (kind === "stone") {
      this.drawWallTile(px, py, color, palette.pathEdge, variant);
      return;
    }

    if (kind === "rift") {
      this.drawRiftTile(px, py, color, variant);
    }
  }

  private drawGardenWash(): void {
    const palette = this.snapshot.palette;
    const width = this.snapshot.width * CELL;
    const height = this.snapshot.height * CELL;
    this.graphics.fillStyle(0xffffff, 0.018);
    for (let i = 0; i < 9; i += 1) {
      const x = ((i * 137) % width) + 20;
      const y = ((i * 89) % height) + 24;
      this.graphics.fillEllipse(x, y, 160 + i * 12, 64 + (i % 3) * 18);
    }
    this.graphics.lineStyle(1, palette.pathEdge, 0.06);
    for (let y = 1; y < this.snapshot.height; y += 4) {
      const py = y * CELL + 8;
      this.graphics.beginPath();
      this.graphics.moveTo(0, py);
      for (let x = 0; x <= this.snapshot.width; x += 2) {
        this.graphics.lineTo(x * CELL, py + Math.sin(x * 0.9 + y) * 5);
      }
      this.graphics.strokePath();
    }
  }

  private drawIrregularStone(
    px: number,
    py: number,
    color: number,
    edge: number,
    inset: number,
    wobbleX: number,
    wobbleY: number,
    alpha: number
  ): void {
    const x = px + inset + wobbleX;
    const y = py + inset + wobbleY;
    const w = CELL - inset * 2 - Math.abs(wobbleX);
    const h = CELL - inset * 2 - Math.abs(wobbleY);
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRoundedRect(x, y, w, h, 9);
    this.graphics.lineStyle(1, edge, 0.18);
    this.graphics.strokeRoundedRect(x + 1, y + 1, Math.max(10, w - 2), Math.max(10, h - 2), 8);
    this.graphics.fillStyle(0xffffff, 0.045);
    this.graphics.fillEllipse(x + w * 0.35, y + h * 0.32, w * 0.34, h * 0.18);
  }

  private drawLeafCluster(px: number, py: number, color: number, edge: number, variant: number): void {
    this.graphics.fillStyle(color, 0.72);
    this.graphics.fillRoundedRect(px + 4, py + 5, CELL - 8, CELL - 10, 11);
    this.graphics.fillStyle(color, 0.92);
    this.graphics.fillEllipse(px + 13, py + 16, 19, 9);
    this.graphics.fillEllipse(px + 21, py + 14, 15, 8);
    this.graphics.lineStyle(1, edge, 0.14 + variant * 0.08);
    this.drawSoftCurve([
      [px + 8, py + 19],
      [px + 12, py + 15],
      [px + 17, py + 13],
      [px + 21, py + 15],
      [px + 25, py + 18]
    ]);
  }

  private drawWaterTile(px: number, py: number, color: number, edge: number, variant: number): void {
    this.graphics.fillStyle(color, 0.72);
    this.graphics.fillRoundedRect(px + 3, py + 4, CELL - 6, CELL - 8, 10);
    this.graphics.lineStyle(1, edge, 0.22);
    this.graphics.strokeRoundedRect(px + 4, py + 5, CELL - 8, CELL - 10, 9);
    this.graphics.lineStyle(1, edge, 0.16);
    for (let i = 0; i < 2; i += 1) {
      const y = py + 12 + i * 8 + variant * 3;
      this.drawSoftCurve([
        [px + 8, y],
        [px + 13, y - 3],
        [px + 18, y - 2],
        [px + 22, y],
        [px + 26, y + 2],
        [px + 29, y]
      ]);
    }
  }

  private drawSoftCurve(points: Array<[number, number]>): void {
    this.graphics.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    });
    this.graphics.strokePath();
  }

  private drawWallTile(px: number, py: number, color: number, edge: number, variant: number): void {
    this.graphics.fillStyle(color, 0.56);
    this.graphics.fillRoundedRect(px + 4, py + 4, CELL - 8, CELL - 8, 5);
    this.graphics.lineStyle(2, 0x060406, 0.46);
    this.graphics.strokeRoundedRect(px + 5, py + 5, CELL - 10, CELL - 10, 4);
    this.graphics.fillStyle(edge, 0.06 + variant * 0.05);
    this.graphics.fillRect(px + 8, py + 9, CELL - 16, 3);
    this.graphics.fillRect(px + 8, py + 20, CELL - 16, 3);
    this.graphics.lineStyle(1, 0x000000, 0.32);
    this.graphics.beginPath();
    this.graphics.moveTo(px + 10, py + 8);
    this.graphics.lineTo(px + 22, py + 24);
    this.graphics.strokePath();
  }

  private drawRiftTile(px: number, py: number, color: number, variant: number): void {
    this.graphics.fillStyle(color, 0.52);
    this.graphics.fillRoundedRect(px + 5, py + 5, CELL - 10, CELL - 10, 7);
    this.graphics.lineStyle(1, 0xff6b83, 0.22 + variant * 0.16);
    this.graphics.beginPath();
    this.graphics.moveTo(px + 9, py + 7);
    this.graphics.lineTo(px + 17, py + 14);
    this.graphics.lineTo(px + 12, py + 23);
    this.graphics.lineTo(px + 24, py + 29);
    this.graphics.strokePath();
  }

  private drawLotusSeal(cx: number, cy: number, light: number, edge: number, variant: number): void {
    this.graphics.fillStyle(edge, 0.2);
    this.graphics.fillCircle(cx, cy, 14 + variant * 3);
    this.graphics.fillStyle(light, 0.82);
    for (let i = 0; i < 6; i += 1) {
      const angle = i * (Math.PI / 3);
      this.graphics.fillEllipse(cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5, i % 2 === 0 ? 8 : 12, i % 2 === 0 ? 14 : 8);
    }
    this.graphics.fillStyle(edge, 0.9);
    this.graphics.fillCircle(cx, cy, 4);
  }

  private drawDreamNode(x: number, y: number, resolved: boolean, id: number): void {
    const palette = this.snapshot.palette;
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const pulse = resolved ? 0 : Math.sin(this.time.now / 220 + id) * 4;
    this.graphics.fillStyle(palette.pathEdge, resolved ? 0.08 : 0.16);
    this.graphics.fillCircle(cx, cy, 23 + pulse);
    this.graphics.lineStyle(2, resolved ? 0xffffff : palette.pathEdge, resolved ? 0.2 : 0.92);
    this.graphics.strokeCircle(cx, cy, resolved ? 8 : 15);
    this.graphics.lineStyle(1, palette.light, resolved ? 0.08 : 0.34);
    this.graphics.strokeCircle(cx, cy, 22 + pulse);
    this.graphics.fillStyle(resolved ? 0xffffff : palette.light, resolved ? 0.16 : 0.96);
    this.graphics.fillCircle(cx, cy, resolved ? 5 : 8);
    this.graphics.lineStyle(1, palette.pathEdge, resolved ? 0.08 : 0.32);
    this.graphics.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = i * (Math.PI / 3) + Math.PI / 6;
      const px = cx + Math.cos(angle) * 13;
      const py = cy + Math.sin(angle) * 13;
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  private drawShard(x: number, y: number, type: CoreKey): void {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    const pulse = 1 + Math.sin(this.time.now / 180 + x * 0.7 + y) * 0.14;
    const radius = 6 * pulse;
    this.graphics.fillStyle(CORE_COLORS[type], 0.2);
    this.graphics.fillCircle(cx, cy, 14 * pulse);
    this.graphics.fillStyle(CORE_COLORS[type], 0.96);
    this.graphics.beginPath();
    this.graphics.moveTo(cx, cy - radius);
    this.graphics.lineTo(cx + radius, cy);
    this.graphics.lineTo(cx, cy + radius);
    this.graphics.lineTo(cx - radius, cy);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(1, 0xffffff, 0.46);
    this.graphics.strokePath();
  }

  private placePlayer(): void {
    const palette = this.snapshot.palette;
    const x = this.snapshot.player.x * CELL + CELL / 2;
    const y = this.snapshot.player.y * CELL + CELL / 2;
    this.playerHalo.setPosition(x, y);
    this.playerRing.setPosition(x, y);
    this.player.setPosition(x, y);
    this.playerGlyph.setPosition(x, y + 0.5);
    this.playerPointer.setPosition(x, y - 24);
    this.playerHalo.setFillStyle(palette.pathEdge, 0.2);
    this.playerHalo.setStrokeStyle(2, palette.light, 0.52);
    this.playerRing.setStrokeStyle(4, 0x16070d, 0.98);
    this.player.setFillStyle(0xfff7e8, 1);
    this.player.setStrokeStyle(3, palette.pathEdge, 1);
    this.playerPointer.setFillStyle(palette.light, 0.96);
    this.playerPointer.setStrokeStyle(1, 0x18090f, 0.95);
    this.tweens.add({
      targets: [this.player, this.playerRing, this.playerGlyph, this.playerPointer],
      scale: { from: 1.22, to: 1 },
      duration: 120,
      ease: "Sine.easeOut"
    });
  }

  private frameWorld(): void {
    const centerX = this.snapshot.width * CELL * 0.5;
    const centerY = this.snapshot.height * CELL * 0.5;
    this.cameras.main.centerOn(centerX, centerY);
  }

  private findPath(start: { x: number; y: number }, target: { x: number; y: number }): Array<{ x: number; y: number }> {
    if (!this.isWalkableTile(target.x, target.y)) return [];
    const queue: Array<{ x: number; y: number }> = [start];
    const cameFrom = new Map<string, string | null>([[tileKey(start), null]]);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (current.x === target.x && current.y === target.y) break;
      for (const next of this.neighborTiles(current)) {
        const key = tileKey(next);
        if (!cameFrom.has(key) && this.isWalkableTile(next.x, next.y)) {
          cameFrom.set(key, tileKey(current));
          queue.push(next);
        }
      }
    }
    const targetKey = tileKey(target);
    if (!cameFrom.has(targetKey)) return [];
    const path: Array<{ x: number; y: number }> = [];
    let cursor: string | null = targetKey;
    while (cursor) {
      const [x, y] = cursor.split(":").map(Number);
      path.unshift({ x, y });
      cursor = cameFrom.get(cursor) ?? null;
    }
    return path;
  }

  private randomWalk(steps: number): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let current = { ...this.snapshot.player };
    let previous: { x: number; y: number } | null = null;
    for (let step = 0; step < steps; step += 1) {
      let options = this.neighborTiles(current).filter((tile) => this.isWalkableTile(tile.x, tile.y));
      if (previous && options.length > 1) {
        options = options.filter((tile) => tile.x !== previous?.x || tile.y !== previous?.y);
      }
      if (options.length === 0) break;
      const next = options[Phaser.Math.Between(0, options.length - 1)];
      path.push(next);
      previous = current;
      current = next;
    }
    return path;
  }

  private neighborTiles(tile: { x: number; y: number }): Array<{ x: number; y: number }> {
    return [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 }
    ];
  }

  private isWalkableTile(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.snapshot.width || y >= this.snapshot.height) {
      return false;
    }
    const kind = this.snapshot.tiles[y][x].kind;
    return kind !== "void" && kind !== "stone";
  }

  private tileCenter(tile: { x: number; y: number }): { x: number; y: number } {
    return {
      x: tile.x * CELL + CELL / 2,
      y: tile.y * CELL + CELL / 2
    };
  }

  private leftDown(): boolean {
    return Boolean(this.cursors.left?.isDown || this.keys.A.isDown);
  }

  private rightDown(): boolean {
    return Boolean(this.cursors.right?.isDown || this.keys.D.isDown);
  }

  private upDown(): boolean {
    return Boolean(this.cursors.up?.isDown || this.keys.W.isDown);
  }

  private downDown(): boolean {
    return Boolean(this.cursors.down?.isDown || this.keys.S.isDown);
  }
}

function tileKey(tile: { x: number; y: number }): string {
  return `${tile.x}:${tile.y}`;
}

function tileNoise(x: number, y: number): number {
  const raw = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return raw - Math.floor(raw);
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#06100e",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  scene: CorePathScene
});
