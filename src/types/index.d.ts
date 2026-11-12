/**
 * @file src/types/index.d.ts
 * @description 《几猫国产3A大作》核心引擎与子系统 TypeScript 接口与类型声明
 */

import * as THREE from "three";

export interface GameQualityConfig {
  name: "low" | "medium" | "high" | "ultra" | "test";
  scale: number;
  shadow: number;
  ao: boolean;
  volSteps: number;
  bloom: boolean;
  motionBlur: boolean;
  msaa: number;
  /** 可选程序化贴图分辨率覆盖（URL ?tex= 或质量预设）。 */
  tex?: number;
}

/** 确定性随机数生成器，附带取整、取样与派生能力。 */
export interface SeededRandom {
  (): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: T[]): T;
  sign(): -1 | 1;
  fork(): SeededRandom;
}

export interface EngineTime {
  t: number;
  dt: number;
  frame: number;
  real: number;
  scale?: number;
}

export interface EngineEvents {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, payload?: any): void;
}

export interface ColliderDefinition {
  min: [number, number, number];
  max: [number, number, number];
  surface: "metal" | "concrete" | "wood" | "rubber" | "dirt";
  bulletOnly?: boolean;
}

export interface RenderStats {
  calls: number;
  tris: number;
  geos: number;
  tex: number;
  programs: number;
  res: number[];
  scale: number;
  advanced: boolean;
  softShadows: boolean;
  adapt?: { lum: number; auto: number; sunVis: number } | null;
}

export interface RenderSystem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  viewCamera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  sky: THREE.Mesh;
  sunDir: THREE.Vector3;
  lightPool: {
    flash(
      pos: THREE.Vector3,
      color?: number,
      intensity?: number,
      distance?: number,
      duration?: number,
    ): void;
    acquire(): { light: THREE.PointLight; release(): void } | null;
    update(dt: number): void;
  };
  post: {
    damage: number;
    lowHealth: number;
    ads: number;
    flash: number;
    fade: number;
    saturation: number;
    focusDist: number;
    shake: number;
    wet: number;
  };
  exposure: number;
  env: THREE.Texture | null;
  interiorEnv: THREE.Texture | null;
  resolution: THREE.Vector2;
  depthTextureIsLive: boolean;
  advanced: boolean;
  autoExposure: boolean;
  depthTexture: THREE.Texture | null;
  addPrePass(
    fn: (
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
    ) => void,
  ): void;
  renderWorld(camera: THREE.Camera, target: THREE.WebGLRenderTarget | null): void;
  onLevelReady(): Promise<void>;
  setQuality(quality: GameQualityConfig): void;
  resize(): void;
  frame(dt: number): void;
  stats(): RenderStats;
}

export interface MaterialOptions {
  vertexColors?: boolean;
  triplanar?: boolean;
  doubleSide?: boolean;
  interior?: boolean;
  color?: number | string;
  scale?: number;
}

/** 后处理管线句柄（src/render.js 的 buildPostPipeline 返回值）。 */
export interface PostPipeline {
  readAdapt(): { lum: number; auto: number; sunVis: number } | null;
  run(frame: {
    hdr: THREE.WebGLRenderTarget;
    camera: THREE.PerspectiveCamera;
    sun: THREE.DirectionalLight;
    dt: number;
    post: RenderSystem["post"];
    exposure: number;
    time: number;
    fast: boolean;
    thunder: number;
  }): void;
  resize(width: number, height: number): void;
  copyDepth(depthTexture: THREE.DepthTexture): void;
  ensureDepthCopy(): THREE.DepthTexture;
  applyQuality(): void;
  dispose(): void;
  materials: THREE.ShaderMaterial[];
  rt: Record<string, unknown>;
  size: { w: number; h: number; hw: number; hh: number };
  TUNE: Record<string, number>;
  autoExposure: boolean;
  pass(material: THREE.Material | null, target: THREE.WebGLRenderTarget | null): void;
  quad: THREE.Mesh;
  fsCam: THREE.OrthographicCamera;
}

export interface MaterialsManager {
  get(name: string, options?: MaterialOptions): THREE.MeshStandardMaterial;
  emissive(color?: number, intensity?: number): THREE.MeshBasicMaterial;
  decal(name: string): {
    material: THREE.MeshStandardMaterial;
    aspect: number;
    texture: THREE.Texture;
  };
  label(
    text: string,
    options?: { color?: string; font?: string; distress?: number },
  ): { material: THREE.MeshStandardMaterial; aspect: number };
  number(num: number, options?: object): { material: THREE.MeshStandardMaterial; aspect: number };
  names: string[];
  decalNames: string[];
  uniforms: { wet: { value: number } };
  update(dt: number): void;
  prewarm(names?: string[]): void;
  stats(): { sets: number; textureMB: number; genMs: number; decalMB: number };
  tileOf(name: string): number;
}

export interface PropsManager {
  names(): string[];
  has(name: string): boolean;
  build(
    name: string,
    options?: { seed?: number; color?: string; doors?: number; forksUp?: number; lying?: boolean },
  ): THREE.Group;
}

export interface PhysicsWorld {
  build(): void;
  raycast(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist?: number,
    filter?: (obj: any) => boolean,
  ): {
    hit: boolean;
    dist: number;
    point: THREE.Vector3;
    normal: THREE.Vector3;
    surface: string;
  } | null;
  collideSphere(pos: THREE.Vector3, radius: number): boolean;
  lineOfSight(origin: THREE.Vector3, target: THREE.Vector3): boolean;
}

declare global {
  interface Window {
    __setShot?: (config: Record<string, unknown>) => void;
  }
}

/** 命中射线（hitscan）单次结算结果。 */
export interface CombatRaycast {
  /** 命中点世界坐标。 */
  point: THREE.Vector3;
  /** 命中面法线；敌人命中缺省时由射线方向取反得到。 */
  normal: THREE.Vector3;
  /** 从射线起点到命中点的距离（米）。 */
  dist: number;
  /** 物理表面类型（metal / concrete / wood / rubber / dirt / enemy）。 */
  surface: string;
  /** 命中的敌人实体；静态场景命中为 null。 */
  enemy: EnemyEntity | null;
  /** 敌人受击部位：body / weak。 */
  part?: EnemyHitPart;
  /** 归一化射线方向。 */
  dir: THREE.Vector3;
  /** 伤害来源：player / enemy。 */
  from: "player" | "enemy";
  /** 本次命中是否击杀目标。 */
  killed?: boolean;
}

export type EnemyHitPart = "body" | "weak";

export interface EnemyEntity {
  alive: boolean;
  pos: THREE.Vector3;
  damage(amount: number, point: THREE.Vector3, dir?: THREE.Vector3, part?: EnemyHitPart): boolean;
}

/** 敌人射线检测结果，normal 可能由入口点推导。 */
export interface EnemyRaycast extends Omit<CombatRaycast, "enemy" | "part"> {
  enemy: EnemyEntity;
  part: EnemyHitPart;
}

/** 战斗子系统公开接口。 */
export interface CombatSystem {
  stats: { shots: number; hits: number; kills: number };
  reset(): void;
  playerShot(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options?: { damage?: number; range?: number; impulse?: number },
  ): CombatRaycast | null;
  enemyShot(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options?: { damage?: number; range?: number },
  ): boolean;
  explode(
    center: THREE.Vector3,
    radius?: number,
    maxDamage?: number,
    source?: "player" | "enemy",
  ): void;
}

/** PAC-9 武器运行时状态，对应 src/weapon.js 返回的 weapon 对象。 */
export interface WeaponState {
  name: string;
  ammo: number;
  magSize: number;
  reserve: number;
  state: string;
  ads: number;
  spread: number;
  damage: number;
  rpm: number;
  root: THREE.Group;
  debug: {
    freeze: boolean;
    reloadT: number | null;
    empty: boolean;
    flash: boolean;
    noFire: boolean;
  };
  info: { tris: number; meshes: number };
  update(dt: number): void;
  reset(): void;
  setVisible(visible: boolean): void;
  muzzleWorld(target?: THREE.Vector3): THREE.Vector3;
  reloadNow(): void;
  addAmmo(count: number): void;
  setWetness(wetness: number): void;
  snap(): void;
}

export interface DebugSuite {
  readonly isVisible: boolean;
  toggle(force?: boolean): void;
  update(dt: number): void;
  destroy(): void;
}

export interface EngineContext {
  THREE: typeof THREE;
  params: Record<string, string>;
  events: EngineEvents;
  rng: SeededRandom;
  time: EngineTime;
  quality: GameQualityConfig;
  showcase: string | null;
  showcaseInfo?: any;

  render: RenderSystem;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  viewCamera: THREE.PerspectiveCamera;

  mats: MaterialsManager;
  physics: PhysicsWorld;
  props: PropsManager;
  level: any;
  backdrop: any;
  ground: any;
  fx: any;
  audio: any;
  input: any;
  player: any;
  combat: CombatSystem;
  weapon: WeaponState;
  enemies: any;
  hud: any;
  game: any;
  debug?: DebugSuite;
  bench?: { frame(dt: number): void };
}
