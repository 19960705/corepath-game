import * as THREE from "three";

const PETAL_COUNT = 320;

export class TaiXuAtmosphere {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly petals: THREE.Points;
  private readonly ribbons: THREE.Mesh[] = [];
  private readonly mists: THREE.Sprite[] = [];
  private readonly clock = new THREE.Clock();
  private frameId = 0;

  constructor(private readonly root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.root.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 0, 8);
    this.petals = this.createPetals();
    this.scene.add(this.petals);
    this.createRibbons();
    this.createMistSprites();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.animate();
  }

  private createPetals(): THREE.Points {
    const positions = new Float32Array(PETAL_COUNT * 3);
    const colors = new Float32Array(PETAL_COUNT * 3);
    const colorA = new THREE.Color(0xff9cb8);
    const colorB = new THREE.Color(0xf2d58b);
    const colorC = new THREE.Color(0x9ed3ff);

    for (let i = 0; i < PETAL_COUNT; i += 1) {
      const stride = i * 3;
      positions[stride] = (Math.random() - 0.5) * 13;
      positions[stride + 1] = (Math.random() - 0.5) * 8;
      positions[stride + 2] = -Math.random() * 5;

      const mix = Math.random();
      const color = mix < 0.5 ? colorA.clone().lerp(colorB, mix * 2) : colorB.clone().lerp(colorC, (mix - 0.5) * 2);
      colors[stride] = color.r;
      colors[stride + 1] = color.g;
      colors[stride + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geometry, material);
  }

  private createRibbons(): void {
    const colors = [0xff9cb8, 0xf2d58b, 0x9ed3ff];
    for (let i = 0; i < 3; i += 1) {
      const geometry = new THREE.PlaneGeometry(9.6 + i * 0.9, 0.34, 48, 1);
      const material = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(-1.4 + i * 1.05, -2.15 + i * 1.9, -1.8 - i * 0.7);
      mesh.rotation.z = -0.12 + i * 0.1;
      this.ribbons.push(mesh);
      this.scene.add(mesh);
    }
  }

  private createMistSprites(): void {
    const texture = createMistTexture();
    const colors = [0xff9cb8, 0xf2d58b, 0x9ed3ff, 0xd5a7ff];
    const placements = [
      [-3.5, -1.6, 5.4, 1.15],
      [2.7, 1.3, 4.8, 0.95],
      [0.4, -0.2, 6.2, 0.8],
      [-1.8, 2.4, 3.7, 0.72],
      [3.8, -2.5, 3.9, 0.76]
    ];

    placements.forEach(([x, y, scale, opacity], index) => {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: colors[index % colors.length],
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, -3.2 - index * 0.28);
      sprite.scale.set(scale, scale * 0.45, 1);
      this.mists.push(sprite);
      this.scene.add(sprite);
    });
  }

  private resize(): void {
    const width = Math.max(1, this.root.clientWidth);
    const height = Math.max(1, this.root.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (): void => {
    const elapsed = this.clock.getElapsedTime();
    this.petals.rotation.z = Math.sin(elapsed * 0.12) * 0.08;
    this.petals.rotation.x = Math.sin(elapsed * 0.18) * 0.05;
    this.petals.position.x = Math.sin(elapsed * 0.09) * 0.42;

    const positions = this.petals.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < PETAL_COUNT; i += 1) {
      const stride = i * 3;
      const drift = Math.sin(elapsed * 0.8 + i * 0.37) * 0.002;
      positions.array[stride + 1] = Number(positions.array[stride + 1]) + 0.0024 + drift;
      positions.array[stride] = Number(positions.array[stride]) + Math.sin(elapsed * 0.4 + i) * 0.0008;
      if (Number(positions.array[stride + 1]) > 4.3) {
        positions.array[stride + 1] = -4.3;
        positions.array[stride] = (Math.random() - 0.5) * 13;
      }
    }
    positions.needsUpdate = true;

    this.ribbons.forEach((ribbon, index) => {
      ribbon.position.x = Math.sin(elapsed * (0.16 + index * 0.03) + index) * 0.65;
      ribbon.rotation.z = Math.sin(elapsed * 0.2 + index) * 0.08;
    });
    this.mists.forEach((mist, index) => {
      mist.position.x += Math.sin(elapsed * 0.22 + index * 1.7) * 0.0018;
      mist.position.y += Math.cos(elapsed * 0.18 + index) * 0.0012;
      mist.rotation.z = Math.sin(elapsed * 0.12 + index) * 0.12;
      const material = mist.material as THREE.SpriteMaterial;
      material.opacity = 0.44 + Math.sin(elapsed * 0.38 + index) * 0.12;
    });

    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  dispose(): void {
    window.cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    this.root.replaceChildren();
  }
}

function createMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(128, 64, 5, 128, 64, 122);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.62)");
  gradient.addColorStop(0.32, "rgba(255, 255, 255, 0.26)");
  gradient.addColorStop(0.62, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = "screen";
  context.fillStyle = "rgba(255, 255, 255, 0.16)";
  for (let i = 0; i < 18; i += 1) {
    const x = 20 + ((i * 37) % 220);
    const y = 18 + ((i * 29) % 92);
    context.beginPath();
    context.ellipse(x, y, 20 + (i % 5) * 7, 7 + (i % 4) * 4, (i % 6) * 0.4, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
