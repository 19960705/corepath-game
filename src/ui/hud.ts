import type { Choice, CoreKey, SimulationSnapshot } from "../sim/corePath";

type ChoiceHandler = (choiceIndex: number) => void;

const CORE_KEYS: CoreKey[] = ["qing", "li", "yu", "wu", "ying"];

const CORE_LABELS: Record<CoreKey, string> = {
  qing: "情",
  li: "礼",
  yu: "欲",
  wu: "悟",
  ying: "影"
};

const CORE_COLORS: Record<CoreKey, string> = {
  qing: "#ff9cb8",
  li: "#f2d58b",
  yu: "#ff7fb6",
  wu: "#9ed3ff",
  ying: "#d5a7ff"
};

export class HudController {
  private biomeName = requireElement<HTMLSpanElement>("biome-name");
  private objectiveText = requireElement<HTMLElement>("objective-text");
  private insightCount = requireElement<HTMLElement>("insight-count");
  private stabilityCount = requireElement<HTMLElement>("stability-count");
  private resolvedCount = requireElement<HTMLElement>("resolved-count");
  private tacticText = requireElement<HTMLElement>("tactic-text");
  private meters = requireElement<HTMLElement>("core-meters");
  private pathLog = requireElement<HTMLOListElement>("path-log");
  private radar = requireElement<HTMLCanvasElement>("core-radar");
  private choicePanel = requireElement<HTMLElement>("choice-panel");
  private choiceTitle = requireElement<HTMLElement>("choice-title");
  private choiceBody = requireElement<HTMLElement>("choice-body");
  private choiceActions = requireElement<HTMLElement>("choice-actions");
  private endingPanel = requireElement<HTMLElement>("ending-panel");
  private endingSeal = requireElement<HTMLElement>("ending-seal");
  private endingTitle = requireElement<HTMLElement>("ending-title");
  private endingSubtitle = requireElement<HTMLElement>("ending-subtitle");
  private endingBody = requireElement<HTMLElement>("ending-body");
  private toast = requireElement<HTMLElement>("toast");

  update(snapshot: SimulationSnapshot): void {
    document.documentElement.style.setProperty("--accent", snapshot.palette.accent);
    this.biomeName.textContent = snapshot.palette.name;
    this.objectiveText.textContent =
      snapshot.resolvedCount >= snapshot.nodes.length
        ? "五处梦境都已落笔。按重置可重开一卷太虚册。"
        : snapshot.nearbyNode
          ? `按 E 入梦「${snapshot.nearbyNode.title}」`
          : snapshot.insight === 0
            ? "先拾取花签残页，给深层判词攒一格读法。"
            : "寻找大观园梦节点，用判词残页改写一段命数。";
    this.insightCount.textContent = String(snapshot.insight);
    this.stabilityCount.textContent = String(snapshot.stability);
    this.resolvedCount.textContent = `${snapshot.resolvedCount}/${snapshot.nodes.length}`;
    this.tacticText.textContent = this.tacticFor(snapshot);
    this.toast.textContent =
      snapshot.nearbyNode && !snapshot.nearbyNode.resolved
        ? "按 E 或点击附近梦节点打开太虚判定。"
        : "点击地图自动移动，或掷骰随机游园。WASD 可手动打断。";
    this.renderMeters(snapshot);
    this.renderRadar(snapshot);
    this.renderLog(snapshot);
    this.renderEnding(snapshot);
  }

  showChoice(snapshot: SimulationSnapshot, onChoice: ChoiceHandler): boolean {
    const node = snapshot.nearbyNode;
    if (!node || node.resolved) {
      return false;
    }
    this.choiceTitle.textContent = node.title;
    this.choiceBody.textContent = node.body;
    this.choiceActions.replaceChildren(
      ...node.choices.map((choice, index) => this.createChoiceButton(choice, index, onChoice))
    );
    this.choicePanel.hidden = false;
    return true;
  }

  hideChoice(): void {
    this.choicePanel.hidden = true;
  }

  hideEnding(): void {
    this.endingPanel.hidden = true;
  }

  isChoiceOpen(): boolean {
    return !this.choicePanel.hidden;
  }

  isEndingOpen(): boolean {
    return !this.endingPanel.hidden;
  }

  private renderMeters(snapshot: SimulationSnapshot): void {
    this.meters.replaceChildren(
      ...CORE_KEYS.map((key) => {
        const row = document.createElement("div");
        row.className = "meter-row";
        const label = document.createElement("span");
        label.textContent = CORE_LABELS[key];
        const bar = document.createElement("div");
        bar.className = "meter-bar";
        const fill = document.createElement("span");
        fill.style.setProperty("--value", `${snapshot.core[key]}%`);
        fill.style.background = CORE_COLORS[key];
        bar.append(fill);
        const value = document.createElement("span");
        value.textContent = String(snapshot.core[key]);
        row.append(label, bar, value);
        return row;
      })
    );
  }

  private renderRadar(snapshot: SimulationSnapshot): void {
    const ctx = this.radar.getContext("2d");
    if (!ctx) return;
    const size = this.radar.width;
    const center = size / 2;
    const radius = 70;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(center, center, (radius / 3) * ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    const points = CORE_KEYS.map((key, index) => {
      const angle = -Math.PI / 2 + index * ((Math.PI * 2) / CORE_KEYS.length);
      const valueRadius = radius * (snapshot.core[key] / 100);
      return {
        x: center + Math.cos(angle) * valueRadius,
        y: center + Math.sin(angle) * valueRadius,
        axisX: center + Math.cos(angle) * radius,
        axisY: center + Math.sin(angle) * radius,
        key
      };
    });
    for (const point of points) {
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(point.axisX, point.axisY);
      ctx.stroke();
      ctx.fillStyle = CORE_COLORS[point.key];
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(CORE_LABELS[point.key], point.axisX, point.axisY + (point.axisY < center ? -8 : 16));
    }
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = hexToRgba(snapshot.palette.accent, 0.25);
    ctx.strokeStyle = snapshot.palette.accent;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  private renderLog(snapshot: SimulationSnapshot): void {
    this.pathLog.replaceChildren(
      ...snapshot.log.map((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        return item;
      })
    );
  }

  private renderEnding(snapshot: SimulationSnapshot): void {
    if (!snapshot.ending) {
      this.endingPanel.hidden = true;
      return;
    }
    this.endingSeal.textContent = snapshot.ending.seal;
    this.endingTitle.textContent = snapshot.ending.title;
    this.endingSubtitle.textContent = snapshot.ending.subtitle;
    this.endingBody.textContent = snapshot.ending.body;
    this.endingPanel.hidden = false;
  }

  private createChoiceButton(choice: Choice, index: number, onChoice: ChoiceHandler): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    const cost = choice.costInsight ?? 0;
    const disabled = cost > Number(this.insightCount.textContent ?? 0);
    button.disabled = disabled;
    button.innerHTML = `<strong>${choice.label}</strong><span>${choice.body}</span><em>${cost > 0 ? `消耗 ${cost} 判词残页` : "即时落笔"}</em>`;
    button.addEventListener("click", () => onChoice(index));
    return button;
  }

  private tacticFor(snapshot: SimulationSnapshot): string {
    if (snapshot.stability <= 28) {
      return "梦境稳定偏低，优先拾取花签或完成梦节点，否则影会替你写下未说出口的心事。";
    }
    if (snapshot.nearbyNode) {
      return snapshot.insight > 0 ? "你手里有判词残页，可以选择带代价的深层读法。" : "普通落笔可用；深层读法需要先收集花签残页。";
    }
    if (snapshot.insight === 0) {
      return "小型菱形花签会变成判词残页，让太虚判定更有策略。";
    }
    return "残页已在手，寻找下一个大型光环梦节点。";
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
