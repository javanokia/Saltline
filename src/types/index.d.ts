/**
 * @file src/types/index.d.ts
 * @description 《几猫国产3A大作》核心引擎与子系统 TypeScript 接口与类型声明
 */

import * as THREE from 'three';

export interface GameQualityConfig {
  name: 'low' | 'medium' | 'high' | 'ultra' | 'test';
  scale: number;
  shadow: number;
  ao: boolean;
  volSteps: number;
  bloom: boolean;
  motionBlur: boolean;
  msaa: number;
}

export interface EngineTime {
  t: number;
  dt: number;
  frame: number;
  real: number;
}

export interface EngineEvents {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, payload?: any): void;
}

export interface ColliderDefinition {
  min: [number, number, number];
  max: [number, number, number];
  surface: 'metal' | 'concrete' | 'wood' | 'rubber' | 'dirt';
  bulletOnly?: boolean;
}

export interface RenderStats {
  calls: number;
  tris: number;
  geos: number;
  tex: number;
  programs: number;
  res: [number, number];
  scale: number;
  advanced: boolean;
  softShadows: boolean;
  adapt?: number;
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
    flash(pos: THREE.Vector3, color?: number, intensity?: number, distance?: number, duration?: number): void;
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
  addPrePass(fn: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void): void;
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

export interface MaterialsManager {
  get(name: string, options?: MaterialOptions): THREE.MeshStandardMaterial;
  emissive(color?: number, intensity?: number): THREE.MeshBasicMaterial;
  decal(name: string): { material: THREE.MeshStandardMaterial; aspect: number; texture: THREE.Texture };
  label(text: string, options?: { color?: string; font?: string; distress?: number }): { material: THREE.MeshStandardMaterial; aspect: number };
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
  build(name: string, options?: { seed?: number; color?: string; doors?: number; forksUp?: number; lying?: boolean }): THREE.Group;
}

export interface PhysicsWorld {
  build(): void;
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist?: number, filter?: (obj: any) => boolean): { hit: boolean; dist: number; point: THREE.Vector3; normal: THREE.Vector3; surface: string } | null;
  collideSphere(pos: THREE.Vector3, radius: number): boolean;
}

export interface WeaponState {
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  isFiring: boolean;
  isAiming: boolean;
  isReloading: boolean;
  recoil: { x: number; y: number; z: number };
  update(dt: number): void;
  fire(): boolean;
  reload(): void;
}

export interface EngineContext {
  THREE: typeof THREE;
  params: Record<string, string>;
  events: EngineEvents;
  rng: () => number;
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
  combat: any;
  weapon: WeaponState;
  enemies: any;
  hud: any;
  game: any;
  bench?: { frame(dt: number): void };
}
