import * as THREE from "three";

const lt = THREE;
const _M = Object.defineProperty;
const br = (i, e) => {
  for (var t in e) _M(i, t, { get: e[t], enumerable: true });
};

const {
  ACESFilmicToneMapping: xc,
  AddEquation: nr,
  AddOperation: H2,
  AdditiveAnimationBlendMode: Zp,
  AdditiveBlending: hr,
  AgXToneMapping: X2,
  AlphaFormat: Xp,
  AlwaysCompare: ug,
  AlwaysDepth: q0,
  AlwaysStencilFunc: Dd,
  AmbientLight: dh,
  AnimationAction: wh,
  AnimationClip: Wa,
  AnimationLoader: jd,
  AnimationMixer: cp,
  AnimationObjectGroup: lp,
  AnimationUtils: Zd,
  ArcCurve: Vu,
  ArrayCamera: yh,
  ArrowHelper: Dp,
  AttachedBindMode: zd,
  Audio: _h,
  AudioAnalyser: ap,
  AudioContext: mc,
  AudioListener: op,
  AudioLoader: ip,
  AxesHelper: Lp,
  BackSide: Ki,
  BasicDepthPacking: tg,
  BasicShadowMap: p5,
  BatchedMesh: ku,
  Bone: Fa,
  BooleanKeyframeTrack: Ar,
  Box2: bp,
  Box3: $n,
  Box3Helper: Ip,
  BoxGeometry: un,
  BoxHelper: Pp,
  BufferAttribute: et,
  BufferGeometry: nt,
  BufferGeometryLoader: xh,
  ByteType: Vp,
  Cache: tr,
  Camera: I0,
  CameraHelper: Cp,
  CanvasTexture: xs,
  CapsuleGeometry: U0,
  CatmullRomCurve3: Jr,
  CineonToneMapping: G2,
  CircleGeometry: Bu,
  ClampToEdgeWrapping: Bi,
  Clock: bh,
  Color: Ve,
  ColorKeyframeTrack: fc,
  ColorManagement: Kt,
  CompressedArrayTexture: Xd,
  CompressedCubeTexture: Yd,
  CompressedTexture: F0,
  CompressedTextureLoader: Jd,
  ConeGeometry: Ua,
  ConstantAlphaFactor: N2,
  ConstantColorFactor: F2,
  Controls: Fp,
  CubeCamera: z0,
  CubeReflectionMapping: Cr,
  CubeRefractionMapping: ta,
  CubeTexture: Da,
  CubeTextureLoader: Kd,
  CubeUVReflectionMapping: X0,
  CubicBezierCurve: ic,
  CubicBezierCurve3: Wu,
  CubicInterpolant: ah,
  CullFaceBack: Np,
  CullFaceFront: E2,
  CullFaceFrontBack: d5,
  CullFaceNone: w2,
  Curve: $s,
  CurvePath: qu,
  CustomBlending: Sh,
  CustomToneMapping: q2,
  CylinderGeometry: Ys,
  Cylindrical: xp,
  Data3DTexture: R0,
  DataArrayTexture: A0,
  DataTexture: ui,
  DataTextureLoader: Qd,
  DataUtils: P0,
  DecrementStencilOp: S5,
  DecrementWrapStencilOp: A5,
  DefaultLoadingManager: xg,
  DepthFormat: E0,
  DepthStencilFormat: j0,
  DepthTexture: Tr,
  DetachedBindMode: $2,
  DirectionalLight: W0,
  DirectionalLightHelper: Rp,
  DiscreteInterpolant: lh,
  DodecahedronGeometry: Ou,
  DoubleSide: Sn,
  DstAlphaFactor: I2,
  DstColorFactor: D2,
  DynamicCopyUsage: H5,
  DynamicDrawUsage: bo,
  DynamicReadUsage: N5,
  EdgesGeometry: Hu,
  EllipseCurve: N0,
  EqualCompare: rg,
  EqualDepth: Ch,
  EqualStencilFunc: I5,
  EquirectangularReflectionMapping: yc,
  EquirectangularRefractionMapping: bc,
  Euler: In,
  EventDispatcher: xo,
  ExternalTexture: nc,
  ExtrudeGeometry: rr,
  FileLoader: Lo,
  Float16BufferAttribute: Hd,
  Float32BufferAttribute: He,
  FloatType: as,
  Fog: Iu,
  FogExp2: Pu,
  FramebufferTexture: qd,
  FrontSide: wr,
  Frustum: Zr,
  FrustumArray: Lu,
  GLBufferAttribute: pp,
  GLSL1: W5,
  GLSL3: Ac,
  GreaterCompare: ag,
  GreaterDepth: Ih,
  GreaterEqualCompare: cg,
  GreaterEqualDepth: Ph,
  GreaterEqualStencilFunc: k5,
  GreaterStencilFunc: D5,
  GridHelper: Tp,
  Group: wt,
  HalfFloatType: js,
  HemisphereLight: uh,
  HemisphereLightHelper: Sp,
  IcosahedronGeometry: Zu,
  ImageBitmapLoader: np,
  ImageLoader: Ga,
  ImageUtils: Cu,
  IncrementStencilOp: E5,
  IncrementWrapStencilOp: T5,
  InstancedBufferAttribute: zs,
  InstancedBufferGeometry: ea,
  InstancedInterleavedBuffer: dp,
  InstancedMesh: Sr,
  Int16BufferAttribute: Bd,
  Int32BufferAttribute: Od,
  Int8BufferAttribute: Fd,
  IntType: Lh,
  InterleavedBuffer: La,
  InterleavedBufferAttribute: $r,
  Interpolant: Ba,
  InterpolateDiscrete: ql,
  InterpolateLinear: Ru,
  InterpolateSmooth: wu,
  InterpolationSamplingMode: X5,
  InterpolationSamplingType: q5,
  InvertStencilOp: R5,
  KeepStencilOp: Ra,
  KeyframeTrack: Ds,
  LOD: Du,
  LatheGeometry: ar,
  Layers: C0,
  LessCompare: og,
  LessDepth: Rh,
  LessEqualCompare: jp,
  LessEqualDepth: za,
  LessEqualStencilFunc: z5,
  LessStencilFunc: P5,
  Light: lr,
  LightProbe: gh,
  Line: sr,
  Line3: _p,
  LineBasicMaterial: Ji,
  LineCurve: sc,
  LineCurve3: Gu,
  LineDashedMaterial: rh,
  LineLoop: Fu,
  LineSegments: yo,
  LinearFilter: Zt,
  LinearInterpolant: hc,
  LinearMipMapLinearFilter: x5,
  LinearMipMapNearestFilter: v5,
  LinearMipmapLinearFilter: Ln,
  LinearMipmapNearestFilter: _c,
  LinearSRGBColorSpace: Er,
  LinearToneMapping: V2,
  LinearTransfer: Yl,
  Loader: cs,
  LoaderUtils: pc,
  LoadingManager: dc,
  LoopOnce: Z2,
  LoopPingPong: J2,
  LoopRepeat: j2,
  MOUSE: h5,
  Material: Oi,
  MaterialLoader: vh,
  MathUtils: bs,
  Matrix2: yp,
  Matrix3: kt,
  Matrix4: Ye,
  MaxEquation: R2,
  Mesh: Qe,
  MeshBasicMaterial: Nn,
  MeshDepthMaterial: cc,
  MeshDistanceMaterial: uc,
  MeshLambertMaterial: sh,
  MeshMatcapMaterial: oh,
  MeshNormalMaterial: ih,
  MeshPhongMaterial: th,
  MeshPhysicalMaterial: eh,
  MeshStandardMaterial: Qt,
  MeshToonMaterial: nh,
  MinEquation: A2,
  MirroredRepeatWrapping: Gl,
  MixOperation: O2,
  MultiplyBlending: Op,
  MultiplyOperation: vc,
  NearestFilter: Gn,
  NearestMipMapLinearFilter: g5,
  NearestMipMapNearestFilter: m5,
  NearestMipmapLinearFilter: Y0,
  NearestMipmapNearestFilter: Hp,
  NeutralToneMapping: Y2,
  NeverCompare: sg,
  NeverDepth: Ah,
  NeverStencilFunc: C5,
  NoBlending: ko,
  NoColorSpace: hi,
  NoToneMapping: ys,
  NormalAnimationBlendMode: pf,
  NormalBlending: Ia,
  NotEqualCompare: lg,
  NotEqualDepth: zh,
  NotEqualStencilFunc: L5,
  NumberKeyframeTrack: Oa,
  Object3D: on,
  ObjectLoader: tp,
  ObjectSpaceNormalMap: ig,
  OctahedronGeometry: Na,
  OneFactor: G0,
  OneMinusConstantAlphaFactor: B2,
  OneMinusConstantColorFactor: U2,
  OneMinusDstAlphaFactor: z2,
  OneMinusDstColorFactor: L2,
  OneMinusSrcAlphaFactor: w0,
  OneMinusSrcColorFactor: P2,
  OrthographicCamera: cr,
  PCFShadowMap: gc,
  PCFSoftShadowMap: Eh,
  PMREMGenerator: ia,
  Path: or,
  PerspectiveCamera: Wn,
  Plane: go,
  PlaneGeometry: rn,
  PlaneHelper: zp,
  PointLight: Qr,
  PointLightHelper: Ep,
  Points: Uu,
  PointsMaterial: tc,
  PolarGridHelper: Ap,
  PolyhedronGeometry: jr,
  PositionalAudio: rp,
  PropertyBinding: yn,
  PropertyMixer: Mh,
  QuadraticBezierCurve: oc,
  QuadraticBezierCurve3: rc,
  Quaternion: Lt,
  QuaternionKeyframeTrack: Ha,
  QuaternionLinearInterpolant: ch,
  RED_GREEN_RGTC2_Format: ff,
  RED_RGTC1_Format: uf,
  REVISION: M2,
  RGBADepthPacking: ng,
  RGBAFormat: _n,
  RGBAIntegerFormat: Nh,
  RGBA_ASTC_10x10_Format: sf,
  RGBA_ASTC_10x5_Format: ef,
  RGBA_ASTC_10x6_Format: tf,
  RGBA_ASTC_10x8_Format: nf,
  RGBA_ASTC_12x10_Format: of,
  RGBA_ASTC_12x12_Format: rf,
  RGBA_ASTC_4x4_Format: Xh,
  RGBA_ASTC_5x4_Format: Yh,
  RGBA_ASTC_5x5_Format: $h,
  RGBA_ASTC_6x5_Format: Zh,
  RGBA_ASTC_6x6_Format: jh,
  RGBA_ASTC_8x5_Format: Jh,
  RGBA_ASTC_8x6_Format: Kh,
  RGBA_ASTC_8x8_Format: Qh,
  RGBA_BPTC_Format: af,
  RGBA_ETC2_EAC_Format: qh,
  RGBA_PVRTC_2BPPV1_Format: Vh,
  RGBA_PVRTC_4BPPV1_Format: Hh,
  RGBA_S3TC_DXT1_Format: Ec,
  RGBA_S3TC_DXT3_Format: Sc,
  RGBA_S3TC_DXT5_Format: Tc,
  RGBDepthPacking: b5,
  RGBFormat: Yp,
  RGBIntegerFormat: y5,
  RGB_BPTC_SIGNED_Format: lf,
  RGB_BPTC_UNSIGNED_Format: cf,
  RGB_ETC1_Format: Wh,
  RGB_ETC2_Format: Gh,
  RGB_PVRTC_2BPPV1_Format: Oh,
  RGB_PVRTC_4BPPV1_Format: Bh,
  RGB_S3TC_DXT1_Format: wc,
  RGDepthPacking: _5,
  RGFormat: $p,
  RGIntegerFormat: Uh,
  RawShaderMaterial: V0,
  Ray: Yr,
  Raycaster: mp,
  RectAreaLight: ph,
  RedFormat: J0,
  RedIntegerFormat: Mc,
  ReinhardToneMapping: W2,
  RenderTarget: Jl,
  RenderTarget3D: up,
  RepeatWrapping: Is,
  ReplaceStencilOp: w5,
  ReverseSubtractEquation: T2,
  RingGeometry: O0,
  SIGNED_RED_GREEN_RGTC2_Format: df,
  SIGNED_RED_RGTC1_Format: hf,
  SRGBColorSpace: Vn,
  SRGBTransfer: bn,
  Scene: ir,
  ShaderChunk: It,
  ShaderLib: fr,
  ShaderMaterial: zn,
  ShadowMaterial: Qu,
  Shape: ji,
  ShapeGeometry: H0,
  ShapePath: kp,
  ShapeUtils: Xs,
  ShortType: Wp,
  Skeleton: k0,
  SkeletonHelper: wp,
  SkinnedMesh: ka,
  Source: er,
  Sphere: Dn,
  SphereGeometry: ls,
  Spherical: vp,
  SphericalHarmonics3: mh,
  SplineCurve: ac,
  SpotLight: fh,
  SpotLightHelper: Mp,
  Sprite: zu,
  SpriteMaterial: ec,
  SrcAlphaFactor: Au,
  SrcAlphaSaturateFactor: k2,
  SrcColorFactor: C2,
  StaticCopyUsage: O5,
  StaticDrawUsage: $l,
  StaticReadUsage: U5,
  StereoCamera: sp,
  StreamCopyUsage: V5,
  StreamDrawUsage: F5,
  StreamReadUsage: B5,
  StringKeyframeTrack: Rr,
  SubtractEquation: S2,
  SubtractiveBlending: Bp,
  TOUCH: f5,
  TangentSpaceNormalMap: na,
  TetrahedronGeometry: ju,
  Texture: xi,
  TextureLoader: ep,
  TextureUtils: Up,
  Timer: gp,
  TimestampQuery: G5,
  TorusGeometry: Ci,
  TorusKnotGeometry: Ju,
  Triangle: Qo,
  TriangleFanDrawMode: eg,
  TriangleStripDrawMode: Q2,
  TrianglesDrawMode: K2,
  TubeGeometry: Kr,
  UVMapping: Dh,
  Uint16BufferAttribute: Kl,
  Uint32BufferAttribute: Ql,
  Uint8BufferAttribute: Ud,
  Uint8ClampedBufferAttribute: Nd,
  Uniform: hp,
  UniformsGroup: fp,
  UniformsLib: st,
  UniformsUtils: mg,
  UnsignedByteType: yi,
  UnsignedInt101111Type: qp,
  UnsignedInt248Type: Z0,
  UnsignedInt5999Type: Gp,
  UnsignedIntType: Zs,
  UnsignedShort4444Type: kh,
  UnsignedShort5551Type: Fh,
  UnsignedShortType: $0,
  VSMShadowMap: ur,
  Vector2: Ae,
  Vector3: W,
  Vector4: Dt,
  VectorKeyframeTrack: Va,
  VideoFrameTexture: Gd,
  VideoTexture: Nu,
  WebGL3DRenderTarget: kd,
  WebGLArrayRenderTarget: Ld,
  WebGLCoordinateSystem: qs,
  WebGLCubeRenderTarget: D0,
  WebGLRenderTarget: si,
  WebGLRenderer: gf,
  WebGLUtils: Iy,
  WebGPUCoordinateSystem: S0,
  WebXRController: L0,
  WireframeGeometry: Ku,
  WrapAroundEnding: Xl,
  ZeroCurvatureEnding: Ca,
  ZeroFactor: Th,
  ZeroSlopeEnding: Pa,
  ZeroStencilOp: M5,
  createCanvasElement: dg,
} = THREE;

import { oi, Mn, en, Pi, vf, zc, Pr, zy, Dy, il, Zn, bi, Fo, sl, kn, Wt, dr } from "./constants.js";

import { sa, Ly, oa, $e, Wi, ot, Fn, ky, Fy, Uy, Ny, Fg, Dc, Lc, Ii, By, Qi } from "./geo.js";

var ex = {};
br(ex, { TUNE: () => Ui, create: () => Em, showcase: () => VC });
/**
 * 程序化骨骼装配器 (Procedural Skeleton Rig Builder)
 * 动态定义骨骼树形拓扑结构，为几何构件赋予顶点权重与蒙皮索引 (Skinning Weights)
 */
class SkeletonRig {
  constructor() {
    this.bones = [];
    this.index = {};
    this.slots = {};
    this.order = [];
  }

  /**
   * 定义或附加一根骨骼
   * @param {string} name 骨骼唯一标识
   * @param {string|null} parentName 父骨骼名称 (null 为根骨骼)
   * @param {number} [localX=0] 相对父骨骼的局部偏移 X
   * @param {number} [localY=0] 局部偏移 Y
   * @param {number} [localZ=0] 局部偏移 Z
   */
  bone(name, parentName, localX = 0, localY = 0, localZ = 0) {
    const parent = parentName ? this.bones[this.index[parentName]] : null;
    if (parentName && !parent) {
      throw new Error("rig: unknown parent bone " + parentName);
    }
    const record = {
      name,
      parent: parent ? parent.i : -1,
      local: [localX, localY, localZ],
      world: [
        localX + (parent ? parent.world[0] : 0),
        localY + (parent ? parent.world[1] : 0),
        localZ + (parent ? parent.world[2] : 0),
      ],
      i: this.bones.length,
    };
    this.index[name] = record.i;
    this.bones.push(record);
    return record;
  }

  /**
   * 向指定材质槽位和骨骼挂载网格几何体，并写入顶点蒙皮与光照着色属性
   * @param {string} slotName 材质槽位名称 (如 'shell', 'metal', 'glow', 'lens')
   * @param {string} boneName 绑定的骨骼名
   * @param {THREE.BufferGeometry} geometry 网格几何体
   * @param {number[]} [tint=[1,1,1]] 顶点基础着色 RGB
   * @param {boolean} [applyDiffuseShading=true] 是否烘焙法线微遮蔽与定向漫反射
   */
  add(slotName, boneName, geometry, tint = [1, 1, 1], applyDiffuseShading = true) {
    const bone = this.bones[this.index[boneName]];
    if (!bone) {
      throw new Error("rig: unknown bone " + boneName);
    }

    const geo = geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();

    // 清理冗余属性
    for (const key of Object.keys(geo.attributes)) {
      if (key !== "position" && key !== "normal" && key !== "uv") {
        geo.deleteAttribute(key);
      }
    }

    const vertexCount = geo.attributes.position.count;
    if (!geo.attributes.uv) {
      geo.setAttribute("uv", new et(new Float32Array(vertexCount * 2), 2));
    }

    // 变换到该骨骼的世界坐标系起点
    geo.translate(bone.world[0], bone.world[1], bone.world[2]);

    const colors = new Float32Array(vertexCount * 3);
    const skinIndices = new Uint16Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);
    const normals = geo.attributes.normal;

    for (let i = 0; i < vertexCount; i++) {
      const diffuse = applyDiffuseShading ? 0.74 + 0.26 * (normals.getY(i) * 0.5 + 0.5) : 1.0;
      colors[i * 3] = tint[0] * diffuse;
      colors[i * 3 + 1] = tint[1] * diffuse;
      colors[i * 3 + 2] = tint[2] * diffuse;

      // 绑定单一骨骼 (刚性机械装甲权重 1.0)
      skinIndices[i * 4] = bone.i;
      skinWeights[i * 4] = 1.0;
    }

    geo.setAttribute("color", new et(colors, 3));
    geo.setAttribute("skinIndex", new et(skinIndices, 4));
    geo.setAttribute("skinWeight", new et(skinWeights, 4));

    if (!this.slots[slotName]) {
      this.slots[slotName] = [];
      this.order.push(slotName);
    }
    this.slots[slotName].push(geo);
    return this;
  }

  /**
   * 合并所有插槽几何体，构建统一的 SkinnedMesh 几何体
   * @param {string[]} [orderOverride] 槽位排序覆写
   * @returns {{ geometry: THREE.BufferGeometry, slots: string[], bones: object[], tris: number }}
   */
  build(orderOverride) {
    const activeSlots = (orderOverride || this.order).filter(
      (s) => this.slots[s] && this.slots[s].length,
    );
    const mergedSlotGeos = activeSlots.map((slot) => {
      const geos = this.slots[slot];
      const normalizedGeos = geos.some((g) => !g.index)
        ? geos.map((g) => (g.index ? g.toNonIndexed() : g))
        : geos;
      const merged = sa(normalizedGeos, false);
      return merged.index ? merged.toNonIndexed() : merged;
    });

    const finalMergedGeometry = sa(mergedSlotGeos, true);
    finalMergedGeometry.computeBoundingSphere();
    finalMergedGeometry.computeBoundingBox();

    return {
      geometry: finalMergedGeometry,
      slots: activeSlots,
      bones: this.bones,
      tris: finalMergedGeometry.attributes.position.count / 3,
    };
  }

  compile(orderOverride) {
    return this.build(orderOverride);
  }
}

const iu = SkeletonRig;

/**
 * 实例化蒙皮网格与骨骼层级结构 (Create Skinned Mesh & Skeleton)
 * @param {object} rigDef 由 SkeletonRig.build() 输出的骨骼定义
 * @param {object} materials 材质映射字典
 * @param {object} options
 */
function createSkinnedMesh(
  rigDef,
  materials,
  {
    castShadow = true,
    receiveShadow = true,
    radius = 1.5,
    center = [0, 0.5, 0],
    extra = null,
  } = {},
) {
  // 1. 实例化 Three.js Bone 对象
  const boneInstances = rigDef.bones.map((b) => {
    const bone = new Fa();
    bone.name = b.name;
    bone.position.set(b.local[0], b.local[1], b.local[2]);
    return bone;
  });

  // 2. 建立父子骨骼树形拓扑
  rigDef.bones.forEach((b, idx) => {
    if (b.parent >= 0) {
      boneInstances[b.parent].add(boneInstances[idx]);
    }
  });

  // 3. 构建多材质蒙皮网格 (Multi-material SkinnedMesh)
  const rootGroup = new wt();
  const materialList = rigDef.slots.map((s) => materials[s]);
  const skinnedMesh = new ka(rigDef.geometry, materialList);
  skinnedMesh.castShadow = castShadow;
  skinnedMesh.receiveShadow = receiveShadow;
  rootGroup.add(skinnedMesh);

  // 将根骨骼添加至网格
  rigDef.bones.forEach((b, idx) => {
    if (b.parent < 0) skinnedMesh.add(boneInstances[idx]);
  });
  rootGroup.updateMatrixWorld(true);

  // 4. 绑定 Skeleton
  const skeleton = new k0(boneInstances);
  skinnedMesh.bind(skeleton);
  skinnedMesh.boundingSphere = new Dn(new W(center[0], center[1], center[2]), radius);
  skinnedMesh.boundingBox = new $n(
    new W(center[0] - radius, center[1] - radius, center[2] - radius),
    new W(center[0] + radius, center[1] + radius, center[2] + radius),
  );

  const boneMap = {};
  boneInstances.forEach((b) => {
    boneMap[b.name] = b;
  });

  const result = {
    group: rootGroup,
    mesh: skinnedMesh,
    bones: boneMap,
    skeleton,
    extraMesh: null,
  };

  // 可选附加外层特效网格 (如能量护罩、警示外罩)
  if (extra) {
    const extraMatList = extra.def.slots.map((s) => materials[s]);
    const extraMesh = new ka(extra.def.geometry, extraMatList);
    extraMesh.castShadow = false;
    extraMesh.receiveShadow = false;
    extraMesh.renderOrder = 5;
    rootGroup.add(extraMesh);
    extraMesh.updateMatrixWorld(true);
    extraMesh.bind(skeleton, skinnedMesh.bindMatrix);
    const extraRadius = extra.radius || radius;
    extraMesh.boundingSphere = new Dn(new W(center[0], center[1], center[2]), extraRadius);
    extraMesh.boundingBox = new $n().setFromCenterAndSize(
      extraMesh.boundingSphere.center,
      new W(1, 1, 1).multiplyScalar(2 * extraRadius),
    );
    result.extraMesh = extraMesh;
  }

  return result;
}

const pm = createSkinnedMesh;

// ============================================================================
// 运动学、四足步态与四旋翼飞行器程序化装配 (Rigging, Kinematics & Locomotion)
// ============================================================================

/**
 * 3自由度四足腿部解析逆运动学解算器 (3-DOF Quadruped Leg Analytic IK Solver)
 * 计算大腿外展 (Abduction)、大腿俯仰 (Hip Pitch) 与小腿弯曲 (Knee Bend)
 *
 * @param {object} outAngles 输出角载体 { abd, hip, knee, reach }
 * @param {number} targetX 髋关节局部坐标 X
 * @param {number} targetY 髋关节局部坐标 Y
 * @param {number} targetZ 髋关节局部坐标 Z
 * @param {number} legSide 肢体侧向标识 (+1: 左肢, -1: 右肢)
 * @param {number} l0 髋关节外展轴横向偏置距离
 * @param {number} L1 大腿骨长 (Femur)
 * @param {number} L2 小腿骨长 (Tibia)
 * @returns {object} outAngles
 */
function solveLegIK(outAngles, targetX, targetY, targetZ, legSide, l0, L1, L2) {
  const lateralDistSq = targetX * targetX + targetY * targetY;
  const planarY = Math.sqrt(Math.max(lateralDistSq - l0 * l0, 1e-6));

  // 1. 髋关节外展/内收角 (Abduction / Adduction)
  outAngles.abd = Math.atan2(targetY, targetX) - Math.atan2(-planarY, legSide * l0);
  if (outAngles.abd > Math.PI) outAngles.abd -= 2 * Math.PI;
  else if (outAngles.abd < -Math.PI) outAngles.abd += 2 * Math.PI;

  // 2. 肢体伸展可达性与余弦定理解算 (Planar Reach & Law of Cosines)
  let reachDist = Math.hypot(planarY, targetZ);
  const maxReach = (L1 + L2) * 0.995;
  const minReach = Math.abs(L1 - L2) + 0.03;
  outAngles.reach = reachDist / (L1 + L2);

  if (reachDist > maxReach) reachDist = maxReach;
  else if (reachDist < minReach) reachDist = minReach;

  const elevationAngle = Math.atan2(targetZ, planarY);
  const cosHip = (L1 * L1 + reachDist * reachDist - L2 * L2) / (2 * L1 * reachDist);
  const cosKnee = (L1 * L1 + L2 * L2 - reachDist * reachDist) / (2 * L1 * L2);

  const clampedCosHip = Math.max(-1, Math.min(1, cosHip));
  const clampedCosKnee = Math.max(-1, Math.min(1, cosKnee));

  const hipAngle = Math.acos(clampedCosHip);
  const kneeAngle = Math.acos(clampedCosKnee);

  outAngles.hip = hipAngle - elevationAngle;
  outAngles.knee = -(Math.PI - kneeAngle);
  return outAngles;
}

const q_ = solveLegIK;

// 装甲与机体表面着色调色板 (Color Tint Profiles)
const COLOR_SHELL_WHITE = [1.15, 1.15, 1.15];
const COLOR_SHELL_WARM = [0.95, 0.96, 0.97];
const COLOR_HAZARD_ORANGE = [1.0, 0.34, 0.08];
const COLOR_DARK_ALLOY = [0.1, 0.11, 0.12];
const COLOR_CHASSIS_BLACK = [0.035, 0.035, 0.038];
const COLOR_AMBER_WARNING = [1.0, 0.7, 0.07];
const COLOR_NEUTRAL_WHITE = [1.0, 1.0, 1.0];
const COLOR_CHROME_BRIGHT = [2.4, 2.5, 2.6];
const COLOR_GUNMETAL_GREY = [0.45, 0.46, 0.48];

// 镜头光学发光色彩 (Lens Illumination Color Profiles)
const LENS_COLOR_AMBER_PATROL = [8.0, 4.0, 0.7]; // 巡逻与搜寻状态: 警戒琥珀黄
const LENS_COLOR_RED_ALERT = [14.0, 1.0, 0.35]; // 锁定与开火状态: 战术激怒高亮红

const HALF_PI = Math.PI / 2;

// 几何构建辅助函数 (Procedural Geometry Helpers)
const createBeveledBox = (w, h, d, bevel = 0.008) => Wi(w, h, d, bevel);
const placeGeometry = (geo, x, y, z, rx = 0, ry = 0, rz = 0, scale = 1) =>
  Dc(geo, { p: [x, y, z], r: [rx, ry, rz], s: scale });
const createCylinderY = (rTop, rBottom, height, seg = 12) => ot(rTop, rBottom, height, seg);
const createCylinderX = (rTop, rBottom, height, seg = 12) =>
  Dc(ot(rTop, rBottom, height, seg), { r: [0, 0, -HALF_PI] });
const createCylinderZ = (rTop, rBottom, height, seg = 12) =>
  Dc(ot(rTop, rBottom, height, seg), { r: [HALF_PI, 0, 0] });

const scratchVec1 = new W();
const scratchVec2 = new W();
const scratchQuat = new Lt();
const UP_DIR_Y = new W(0, 1, 0);
const scratchMatrix = new Ye();
const UNIT_SCALE = new W(1, 1, 1);

/**
 * 连接两点之间的工业管路/液压杆几何体
 */
function createPipeBetweenPoints(pointA, pointB, rTop, rBottom = rTop, radialSegments = 8) {
  scratchVec1.set(pointA[0], pointA[1], pointA[2]);
  scratchVec2.set(pointB[0], pointB[1], pointB[2]);
  const length = scratchVec1.distanceTo(scratchVec2);
  const cylinder = ot(rBottom, rTop, length, radialSegments);
  const dir = scratchVec2.clone().sub(scratchVec1).normalize();
  scratchQuat.setFromUnitVectors(UP_DIR_Y, dir);
  scratchMatrix.compose(
    scratchVec1.clone().add(scratchVec2).multiplyScalar(0.5),
    scratchQuat,
    UNIT_SCALE,
  );
  cylinder.applyMatrix4(scratchMatrix);
  return cylinder;
}

const createScaledSphere = (radius, segW = 14, segH = 10, sx = 1, sy = 1, sz = 1) => {
  const geo = new ls(radius, segW, segH);
  geo.scale(sx, sy, sz);
  return geo;
};

// 紧固件与六角螺栓程序化几何体
const createBoltX = (x, y, z) => placeGeometry(createCylinderX(0.0075, 0.0075, 0.006, 6), x, y, z);
const createBoltY = (x, y, z) => placeGeometry(createCylinderY(0.0075, 0.0075, 0.006, 6), x, y, z);
const createBoltZ = (x, y, z) => placeGeometry(createCylinderZ(0.0075, 0.0075, 0.006, 6), x, y, z);

// ============================================================================
// 机械猎犬骨骼拓扑与几何装配 (Hound Procedural Rigging)
// ============================================================================

const HOUND_RIG_SPEC = {
  stand: 0.72,
  L1: 0.4,
  L2: 0.42,
  l0: 0.075,
  hipX: 0.165,
  hipY: -0.01,
  hipZ: 0.4,
  footX: 0.275,
  footZ: [0.37, 0.37, -0.42, -0.42],
  legs: ["FL", "FR", "RL", "RR"],
  side: [1, -1, 1, -1],
  fore: [1, 1, -1, -1],
  muzzle: [0, 0, 0.43],
  eye: [0, 0, 0.14],
  footR: 0.046,
};

const $v = HOUND_RIG_SPEC;

/**
 * 组装机械猎犬（Hound）的程序化骨架与几何构件
 */
function buildHoundRig() {
  const spec = HOUND_RIG_SPEC;
  const rig = new SkeletonRig();

  // 1. 骨骼拓扑树 (Hierarchy)
  rig.bone("root", null, 0, 0, 0);
  rig.bone("body", "root", 0, spec.stand, 0);
  rig.bone("neck", "body", 0, 0.06, 0.49);
  rig.bone("head", "neck", 0, 0.13, 0.12);
  rig.bone("turret", "body", 0, 0.152, -0.03);
  rig.bone("gun", "turret", 0, 0.095, 0.02);
  rig.bone("antenna", "body", -0.105, 0.15, -0.46);
  rig.bone("beacon", "body", 0.105, 0.2, -0.455);

  // 四足肢体链
  for (let i = 0; i < 4; i++) {
    const leg = spec.legs[i];
    const side = spec.side[i];
    rig.bone("abd" + leg, "body", side * spec.hipX, spec.hipY, spec.fore[i] * spec.hipZ);
    rig.bone("thigh" + leg, "abd" + leg, side * spec.l0, 0, 0);
    rig.bone("shin" + leg, "thigh" + leg, 0, -spec.L1, 0);
  }

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 主体躯干与动力舱
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.27, 0.2, 0.98, 0.02), 0, -0.01, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.35, 0.05, 0.3, 0.014), 0, 0.125, 0.33),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.35, 0.05, 0.36, 0.014), 0, 0.125, -0.012),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.1, 0.052, 0.36, 0.01), 0, 0.126, -0.012),
    COLOR_SHELL_WARM,
  );

  for (const x of [-0.15, 0.15]) {
    for (const z of [0.21, 0.45, -0.17, 0.145]) {
      add("metal", "body", createBoltY(x, 0.152, z), COLOR_CHROME_BRIGHT);
    }
  }

  // 尾部散热散热鳍片组
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.31, 0.03, 0.25, 0.006), 0, 0.112, -0.335),
    COLOR_NEUTRAL_WHITE,
  );
  for (let i = 0; i < 10; i++) {
    add(
      "metal",
      "body",
      placeGeometry(
        createBeveledBox(0.007, 0.062, 0.225, 0.002),
        -0.126 + i * 0.028,
        0.155,
        -0.335,
      ),
      COLOR_CHROME_BRIGHT,
    );
  }
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.24),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.43),
    COLOR_GUNMETAL_GREY,
  );

  // 侧向复合装甲与警示涂装
  for (const s of [1, -1]) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.31, 0.012), s * 0.15, 0.022, -0.075),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.032, 0.15, 0.135, 0.012), s * 0.15, 0.022, 0.1625),
      COLOR_SHELL_WARM,
    );
    add(
      "metal",
      "body",
      Fn(
        [
          [s * 0.168, 0.06, 0.125],
          [s * 0.182, 0.06, 0.135],
          [s * 0.182, 0.06, 0.19],
          [s * 0.168, 0.06, 0.2],
        ],
        0.005,
        5,
      ),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.016, 0.135, 0.004), s * 0.151, -0.035, 0.1625),
      COLOR_AMBER_WARNING,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.034, 0.042, 0.46, 0.008), s * 0.151, -0.078, 0),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.028, 0.1, 0.11, 0.008), s * 0.146, 0.01, 0.305),
      COLOR_DARK_ALLOY,
    );
    for (let l = 0; l < 4; l++) {
      add(
        "metal",
        "body",
        placeGeometry(
          createBeveledBox(0.004, 0.012, 0.085, 0.001),
          s * 0.161,
          -0.02 + l * 0.022,
          0.305,
        ),
        COLOR_GUNMETAL_GREY,
      );
    }
    for (const y of [-0.035, 0.08]) {
      for (const z of [-0.21, 0.06, 0.115, 0.21]) {
        add("metal", "body", createBoltX(s * 0.167, y, z), COLOR_CHROME_BRIGHT);
      }
    }
    add(
      "metal",
      "body",
      Fn(
        [
          [s * 0.135, 0.148, -0.19],
          [s * 0.135, 0.205, -0.16],
          [s * 0.135, 0.212, 0],
          [s * 0.135, 0.205, 0.43],
          [s * 0.135, 0.148, 0.465],
        ],
        0.0105,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );
    for (const z of [0, 0.26]) {
      add(
        "metal",
        "body",
        placeGeometry(createCylinderY(0.008, 0.008, 0.06, 6), s * 0.135, 0.178, z),
        COLOR_CHROME_BRIGHT,
      );
    }
    add(
      "shell",
      "body",
      Fn(
        [
          [s * 0.118, -0.105, -0.36],
          [s * 0.132, -0.118, -0.2],
          [s * 0.13, -0.112, 0.1],
          [s * 0.118, -0.1, 0.36],
        ],
        0.009,
        5,
      ),
      COLOR_CHASSIS_BLACK,
    );
    add(
      "metal",
      "body",
      placeGeometry(new Ci(0.02, 0.005, 5, 10), s * 0.17, 0.085, -0.335, 0, HALF_PI, 0),
      COLOR_CHROME_BRIGHT,
    );
  }

  // 前胸与机盖撞角
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.3, 0.15, 0.075, 0.018), 0, -0.005, 0.505),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.2, 0.07, 0.02, 0.006), 0, 0.012, 0.545),
    COLOR_DARK_ALLOY,
  );
  for (let i = 0; i < 6; i++) {
    add(
      "shell",
      "body",
      placeGeometry(createBeveledBox(0.05, 0.034, 0.014, 0.003), -0.125 + i * 0.05, -0.098, 0.538),
      i % 2 ? COLOR_DARK_ALLOY : COLOR_AMBER_WARNING,
    );
  }
  for (const x of [-0.115, 0.115]) {
    add(
      "metal",
      "body",
      placeGeometry(createCylinderZ(0.021, 0.021, 0.014, 10), x, 0.012, 0.547),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "glow",
      "body",
      placeGeometry(createCylinderZ(0.015, 0.015, 0.004, 10), x, 0.012, 0.556),
      [6.5, 4.6, 2.2],
      false,
    );
  }

  // 腹部液力传动与底盘护板
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.24, 0.095, 0.56, 0.02), 0, -0.145, 0),
    COLOR_NEUTRAL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.246, 0.03, 0.09, 0.006), 0, -0.14, 0.12),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.246, 0.03, 0.09, 0.006), 0, -0.14, -0.12),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.29, 0.15, 0.05, 0.014), 0, 0, -0.495),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.17, 0.05, 0.012, 0.004), 0, 0.03, -0.523),
    COLOR_DARK_ALLOY,
  );
  add(
    "glow",
    "body",
    placeGeometry(createBeveledBox(0.13, 0.012, 0.004, 0.001), 0, 0.03, -0.531),
    [5, 0.3, 0.1],
    false,
  );
  add(
    "metal",
    "body",
    placeGeometry(createCylinderZ(0.022, 0.022, 0.02, 10), 0.085, -0.035, -0.525),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "body",
    placeGeometry(new Ci(0.024, 0.006, 5, 10), -0.07, -0.05, -0.528, HALF_PI, 0, 0),
    COLOR_CHROME_BRIGHT,
  );

  for (const x of [-0.125, 0.125]) {
    for (const y of [-0.055, 0.055]) {
      add("metal", "body", createBoltZ(x, y, -0.523), COLOR_CHROME_BRIGHT);
    }
  }

  // 柔性颈部液压软管与铰链
  add(
    "shell",
    "body",
    Fn(
      [
        [0.09, 0.15, -0.2],
        [0.13, 0.2, -0.16],
        [0.12, 0.2, -0.08],
        [0.09, 0.165, -0.05],
      ],
      0.009,
      5,
    ),
    COLOR_CHASSIS_BLACK,
  );
  add(
    "metal",
    "neck",
    createPipeBetweenPoints([0, -0.02, -0.02], [0, 0.11, 0.1], 0.045, 0.036, 10),
    COLOR_GUNMETAL_GREY,
  );
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.28;
    add(
      "shell",
      "neck",
      createPipeBetweenPoints(
        [0, -0.02 + 0.13 * t, -0.02 + 0.12 * t],
        [0, -0.02 + 0.13 * (t + 0.09), -0.02 + 0.12 * (t + 0.09)],
        0.049,
        0.047,
        10,
      ),
      COLOR_SHELL_WHITE,
    );
  }
  for (const s of [1, -1]) {
    add(
      "metal",
      "neck",
      Fn(
        [
          [s * 0.042, 0.01, -0.02],
          [s * 0.055, 0.05, 0.03],
          [s * 0.045, 0.1, 0.09],
        ],
        0.006,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );
  }

  // 头部传感器舱 (Head Sensor Pod)
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.2, 0.13, 0.22, 0.016), 0, 0.005, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.08, 0.04, 0.22, 0.008), 0, 0.072, 0.005),
    COLOR_SHELL_WARM,
  );
  add(
    "shell",
    "head",
    placeGeometry(createBeveledBox(0.18, 0.025, 0.07, 0.004), 0, -0.065, 0.035),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "head",
    placeGeometry(createBeveledBox(0.16, 0.09, 0.04, 0.006), 0, 0.005, 0.115),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "head",
    placeGeometry(createCylinderZ(0.045, 0.045, 0.012, 16), 0, 0.005, 0.135),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "lens",
    "head",
    placeGeometry(createCylinderZ(0.038, 0.038, 0.006, 16), 0, 0.005, 0.14),
    [1, 1, 1],
    false,
  );

  for (const s of [1, -1]) {
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.012, 0.012, 0.006, 8), s * 0.06, 0.04, 0.135),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.012, 0.012, 0.006, 8), s * 0.06, -0.03, 0.135),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "glow",
      "head",
      placeGeometry(createCylinderZ(0.007, 0.007, 0.004, 8), s * 0.06, 0.04, 0.14),
      [5, 0.3, 0.1],
      false,
    );
    add(
      "glow",
      "head",
      placeGeometry(createCylinderZ(0.007, 0.007, 0.004, 8), s * 0.06, -0.03, 0.14),
      [5, 0.3, 0.1],
      false,
    );
    add(
      "shell",
      "head",
      placeGeometry(createBeveledBox(0.015, 0.07, 0.16, 0.006), s * 0.105, 0.01, -0.01),
      COLOR_AMBER_WARNING,
    );
    add(
      "metal",
      "head",
      placeGeometry(createCylinderX(0.02, 0.02, 0.012, 10), s * 0.108, -0.01, -0.03),
      COLOR_CHROME_BRIGHT,
    );
    add("metal", "head", createBoltX(s * 0.108, 0.055, 0.05), COLOR_CHROME_BRIGHT);
    add("metal", "head", createBoltX(s * 0.108, 0.055, -0.07), COLOR_CHROME_BRIGHT);
  }

  // 顶部速射机枪炮塔 (Top Turret & Autocannon)
  add(
    "metal",
    "turret",
    placeGeometry(createCylinderY(0.085, 0.095, 0.05, 14), 0, 0.025, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "shell",
    "turret",
    placeGeometry(createBeveledBox(0.18, 0.09, 0.22, 0.012), 0, 0.085, -0.01),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "turret",
    placeGeometry(createBeveledBox(0.185, 0.025, 0.14, 0.004), 0, 0.132, -0.02),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "metal",
    "turret",
    placeGeometry(createBeveledBox(0.14, 0.07, 0.03, 0.004), 0, 0.085, -0.125),
    COLOR_CHASSIS_BLACK,
  );
  add(
    "metal",
    "turret",
    placeGeometry(createCylinderZ(0.018, 0.018, 0.016, 8), 0.045, 0.085, -0.14),
    COLOR_CHROME_BRIGHT,
  );

  // 枪管与消焰制退器
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.07, 0.075, 0.13, 0.006), 0, 0, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.014, 0.014, 0.32, 10), 0, 0, 0.22),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.019, 0.019, 0.04, 10), 0, 0, 0.4),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.014, 0.014, 0.025, 10), 0, 0, 0.425),
    COLOR_CHASSIS_BLACK,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderY(0.008, 0.008, 0.06, 6), 0, 0.03, 0.2),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.06, 0.05, 0.08, 0.004), -0.06, -0.01, -0.01),
    COLOR_DARK_ALLOY,
  );

  // 柔性通信天线与战术指示灯
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.01, 0.014, 0.03, 8), 0, 0.015, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "metal",
    "antenna",
    placeGeometry(createCylinderY(0.0018, 0.0035, 0.42, 6), 0, 0.24, 0),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "glow",
    "antenna",
    placeGeometry(createScaledSphere(0.007, 8, 6), 0, 0.45, 0),
    [6.5, 4.6, 2.2],
    false,
  );
  add(
    "metal",
    "beacon",
    placeGeometry(createCylinderY(0.012, 0.014, 0.025, 8), 0, 0.012, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "glow",
    "beacon",
    placeGeometry(createCylinderY(0.011, 0.011, 0.02, 10), 0, 0.032, 0),
    [14, 1, 0.35],
    false,
  );

  // 四足机械腿关节构型 (Abduction, Thigh, Shin & Foot)
  for (let i = 0; i < 4; i++) {
    const leg = spec.legs[i];
    const s = spec.side[i];
    const f = spec.fore[i];

    // 外展电机舱 (Abduction Hip Casing)
    add(
      "metal",
      "abd" + leg,
      placeGeometry(createCylinderX(0.052, 0.052, 0.075, 12), s * 0.035, 0, 0),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "abd" + leg,
      placeGeometry(createBeveledBox(0.055, 0.09, 0.1, 0.008), s * 0.035, 0, 0),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      "abd" + leg,
      placeGeometry(createCylinderX(0.025, 0.025, 0.01, 10), s * 0.076, 0, 0),
      COLOR_CHROME_BRIGHT,
    );
    add("metal", "abd" + leg, createBoltX(s * 0.076, 0.03, 0.025), COLOR_CHROME_BRIGHT);
    add("metal", "abd" + leg, createBoltX(s * 0.076, -0.03, 0.025), COLOR_CHROME_BRIGHT);
    add("metal", "abd" + leg, createBoltX(s * 0.076, 0, -0.035), COLOR_CHROME_BRIGHT);

    // 大腿连杆与双液压杆 (Thigh / Femur)
    add(
      "metal",
      "thigh" + leg,
      placeGeometry(createCylinderX(0.046, 0.046, 0.04, 12), s * 0.015, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "shell",
      "thigh" + leg,
      createPipeBetweenPoints([0, 0, 0], [0, -spec.L1, 0], 0.045, 0.032, 10),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.065, 0.22, 0.06, 0.008), 0, -spec.L1 * 0.42, 0.01),
      COLOR_SHELL_WHITE,
    );
    add(
      "shell",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.068, 0.04, 0.062, 0.004), 0, -spec.L1 * 0.3, 0.01),
      COLOR_HAZARD_ORANGE,
    );
    add(
      "metal",
      "thigh" + leg,
      placeGeometry(createBeveledBox(0.02, 0.18, 0.025, 0.003), s * 0.038, -spec.L1 * 0.45, -0.01),
      COLOR_DARK_ALLOY,
    );
    add(
      "metal",
      "thigh" + leg,
      createPipeBetweenPoints(
        [s * 0.025, -0.04, -0.025],
        [s * 0.02, -spec.L1 * 0.85, -0.015],
        0.007,
        0.007,
        6,
      ),
      COLOR_CHROME_BRIGHT,
    );
    add(
      "metal",
      "thigh" + leg,
      createPipeBetweenPoints(
        [s * 0.02, -spec.L1 * 0.85, -0.015],
        [s * 0.02, -spec.L1 + 0.02, 0],
        0.005,
        0.005,
        6,
      ),
      COLOR_GUNMETAL_GREY,
    );

    // 膝关节阻尼铰链 (Knee Hinge)
    add(
      "metal",
      "shin" + leg,
      placeGeometry(createCylinderX(0.034, 0.034, 0.042, 10), s * 0.005, 0, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(new Ci(0.026, 0.006, 5, 8), s * 0.028, 0, 0, 0, HALF_PI, 0),
      COLOR_CHROME_BRIGHT,
    );

    // 小腿复合碳纤杆与缓冲脚垫 (Shin / Tibia & Rubber Foot)
    add(
      "metal",
      "shin" + leg,
      createPipeBetweenPoints([0, 0, 0], [0, -spec.L2 + spec.footR * 0.5, 0], 0.026, 0.018, 8),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(createBeveledBox(0.042, 0.18, 0.034, 0.005), 0, -spec.L2 * 0.35, f * 0.012),
      COLOR_SHELL_WARM,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(createBeveledBox(0.044, 0.03, 0.036, 0.003), 0, -spec.L2 * 0.22, f * 0.012),
      COLOR_AMBER_WARNING,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(createCylinderY(0.012, 0.016, 0.05, 8), 0, -spec.L2 + spec.footR + 0.02, 0),
      COLOR_GUNMETAL_GREY,
    );
    add(
      "metal",
      "shin" + leg,
      placeGeometry(
        createScaledSphere(spec.footR, 12, 8, 1, 0.85, 1),
        0,
        -spec.L2 + spec.footR * 0.6,
        0,
      ),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "shin" + leg,
      placeGeometry(
        new Ci(spec.footR * 0.95, 0.005, 5, 10),
        0,
        -spec.L2 + spec.footR * 0.8,
        0,
        HALF_PI,
        0,
        0,
      ),
      COLOR_HAZARD_ORANGE,
    );
  }

  return rig.build();
}

const Z_ = buildHoundRig;

// ============================================================================
// 机械飞鸥骨骼拓扑与几何装配 (Gull Quad-Rotor Procedural Rigging)
// ============================================================================

const GULL_RIG_SPEC = {
  rotors: [
    [0.33, 0.035, 0.3],
    [-0.33, 0.035, 0.3],
    [0.33, 0.035, -0.3],
    [-0.33, 0.035, -0.3],
  ],
  gimbal: [0, -0.095, 0.275],
  ball: [0, -0.072, 0],
  gun: [0, -0.085, -0.1],
  muzzle: [0, -0.032, 0.27],
  lamp: [0, -0.066, 0.025],
};

const xm = GULL_RIG_SPEC;

/**
 * 构造飞鸥高升力空气动力学旋翼桨叶截面
 */
function buildGullPropellerBlade() {
  const profilePoints = [
    [0.176, -0.036],
    [0.196, -0.032],
    [0.206, 0],
    [0.202, 0.03],
    [0.19, 0.04],
    [0.178, 0.032],
    [0.173, 0],
    [0.176, -0.036],
  ].map((p) => new Ae(p[0], p[1]));
  return new ar(profilePoints, 28);
}

const FC = buildGullPropellerBlade;

/**
 * 组装机械飞鸥（Gull）四旋翼无人机程序化骨架与几何构件
 */
function buildGullRig() {
  const spec = GULL_RIG_SPEC;
  const rig = new SkeletonRig();
  const extraRig = new SkeletonRig();

  const addBoneBoth = (name, parent, x, y, z) => {
    rig.bone(name, parent, x, y, z);
    extraRig.bone(name, parent, x, y, z);
  };

  // 1. 骨骼拓扑树
  addBoneBoth("root", null, 0, 0, 0);
  addBoneBoth("body", "root", 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    addBoneBoth("rotor" + i, "body", spec.rotors[i][0], spec.rotors[i][1], spec.rotors[i][2]);
  }

  addBoneBoth("gimbalYaw", "body", spec.gimbal[0], spec.gimbal[1], spec.gimbal[2]);
  addBoneBoth("ball", "gimbalYaw", spec.ball[0], spec.ball[1], spec.ball[2]);
  addBoneBoth("lamp", "ball", spec.lamp[0], spec.lamp[1], spec.lamp[2]);
  addBoneBoth("gun", "body", spec.gun[0], spec.gun[1], spec.gun[2]);
  addBoneBoth("strobeG", "body", 0, 0, 0);
  addBoneBoth("strobeR", "body", 0, 0, 0);
  addBoneBoth("strobeW", "body", 0, 0, 0);

  const add = (slot, bone, geo, tint, applyShading) => rig.add(slot, bone, geo, tint, applyShading);

  // 流线型机身外壳与航空碳纤维结构
  add(
    "shell",
    "body",
    placeGeometry(createScaledSphere(1, 20, 12, 0.118, 0.074, 0.27), 0, 0.02, 0),
    COLOR_SHELL_WHITE,
  );
  add(
    "shell",
    "body",
    placeGeometry(ot(1, 0.9, 1, 20), 0, 0.02, 0.165, HALF_PI, 0, 0, [0.094, 0.05, 0.06]),
    COLOR_HAZARD_ORANGE,
  );
  add(
    "shell",
    "body",
    placeGeometry(ot(1, 1, 1, 20), 0, 0.02, -0.02, HALF_PI, 0, 0, [0.121, 0.012, 0.0765]),
    COLOR_DARK_ALLOY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.118, 0.014, 0.2, 0.005), 0, 0.089, -0.03),
    COLOR_SHELL_WARM,
  );
  add(
    "metal",
    "body",
    placeGeometry(createBeveledBox(0.09, 0.05, 0.16, 0.008), 0, -0.045, -0.01),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "body",
    placeGeometry(createBeveledBox(0.095, 0.02, 0.12, 0.004), 0, -0.072, -0.01),
    COLOR_HAZARD_ORANGE,
  );

  // 四向碳纤机臂与无刷电机机舱 (Carbon Arms & Rotor Nacelles)
  for (let i = 0; i < 4; i++) {
    const rx = spec.rotors[i][0];
    const ry = spec.rotors[i][1];
    const rz = spec.rotors[i][2];
    const armGeo = createPipeBetweenPoints([0, 0.01, 0], [rx, ry - 0.01, rz], 0.014, 0.011, 8);
    add("metal", "body", armGeo, COLOR_CHROME_BRIGHT);

    // 电机罩与支柱
    add(
      "metal",
      "body",
      placeGeometry(createCylinderY(0.028, 0.024, 0.035, 12), rx, ry - 0.01, rz),
      COLOR_DARK_ALLOY,
    );
    add(
      "shell",
      "body",
      placeGeometry(createCylinderY(0.03, 0.029, 0.016, 12), rx, ry - 0.005, rz),
      COLOR_SHELL_WHITE,
    );
    add(
      "metal",
      "rotor" + i,
      placeGeometry(createCylinderY(0.012, 0.012, 0.02, 10), 0, 0.01, 0),
      COLOR_CHROME_BRIGHT,
    );

    // 旋翼桨叶几何
    const bladeGeo = buildGullPropellerBlade();
    add("metal", "rotor" + i, placeGeometry(bladeGeo, 0, 0.005, 0), COLOR_GUNMETAL_GREY);

    // 旋转半透明高升力气动虚拟圆盘 (Rotor Motion Blur Disc)
    extraRig.add(
      "disc",
      "rotor" + i,
      placeGeometry(new Bu(0.208, 24), 0, 0.018, 0, -HALF_PI, 0, 0),
    );
  }

  // 腹部双轴侦察光电球 (2-Axis Surveillance Gimbal)
  add(
    "metal",
    "gimbalYaw",
    placeGeometry(createCylinderY(0.04, 0.04, 0.016, 12), 0, 0, 0),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "ball",
    placeGeometry(createScaledSphere(0.048, 14, 10), 0, 0, 0),
    COLOR_GUNMETAL_GREY,
  );
  add(
    "shell",
    "ball",
    placeGeometry(createBeveledBox(0.055, 0.055, 0.025, 0.006), 0, 0, 0.032),
    COLOR_SHELL_WHITE,
  );
  add(
    "lens",
    "lamp",
    placeGeometry(createCylinderZ(0.026, 0.026, 0.008, 14), 0, 0, 0.045),
    [1, 1, 1],
    false,
  );

  // 侦察锥形警示探照光束 (Searchlight Visual Cone)
  extraRig.add(
    "cone",
    "lamp",
    placeGeometry(ot(0.02, 0.65, 4.5, 16, true), 0, 0, 2.25, HALF_PI, 0, 0),
  );

  // 机头等离子速射炮 (Plasma Auto-Pulse Cannon)
  add(
    "metal",
    "gun",
    placeGeometry(createBeveledBox(0.038, 0.038, 0.22, 0.004), 0, 0, 0.1),
    COLOR_DARK_ALLOY,
  );
  add(
    "metal",
    "gun",
    placeGeometry(createCylinderZ(0.009, 0.009, 0.18, 8), 0, 0, 0.24),
    COLOR_CHROME_BRIGHT,
  );
  add(
    "glow",
    "gun",
    placeGeometry(createCylinderZ(0.007, 0.007, 0.02, 8), 0, 0, 0.32),
    [14, 1, 0.35],
    false,
  );

  // 国际民航标准红/绿/白三色导航频闪灯 (Aviation Navigation Strobes)
  add(
    "glow",
    "strobeR",
    placeGeometry(createScaledSphere(0.012, 8, 6), -0.33, 0.04, 0.3),
    [14, 0.5, 0.2],
    false,
  ); // 左翼尖红灯
  add(
    "glow",
    "strobeG",
    placeGeometry(createScaledSphere(0.012, 8, 6), 0.33, 0.04, 0.3),
    [0.3, 12, 1],
    false,
  ); // 右翼尖绿灯
  add(
    "glow",
    "strobeW",
    placeGeometry(createScaledSphere(0.014, 8, 6), 0, 0.08, -0.31),
    [12, 12, 12],
    false,
  ); // 尾部防撞白频闪

  const rigDef = rig.build();
  rigDef.extra = extraRig.build();
  return rigDef;
}

const j_ = buildGullRig;

// ============================================================================
// 机械飞鸥与机械猎犬数值配置表 (Tuning Configurations)
// ============================================================================

const GULL_CONFIG = {
  hp: 45,
  boltDamage: 7,
  boltSpeed: 70,
  burst: 3,
  burstGap: 0.12,
  telegraph: 0.55,
  cooldown: [1.9, 3.3],
  rangeMin: 12,
  rangeMax: 25,
  fireRange: 28,
  altMin: 4,
  altMax: 8,
  patrolSpeed: 3.5,
  maxSpeed: 8.5,
  accel: 14,
  spreadNear: 0.015,
  spreadFar: 0.04,
  explodeRadius: 4.5,
  explodeDamage: 45,
};

const Zv = GULL_CONFIG;

const HOUND_CONFIG = {
  hp: 140,
  shotDamage: 5,
  burst: 4,
  burstGap: 0.11,
  telegraph: 0.5,
  cooldown: [1.8, 3.0],
  runSpeed: 4.5,
  stalkSpeed: 2.0,
  patrolSpeed: 1.5,
  lungeSpeed: 12.0,
  lungeRange: 4.8,
  lungeDamage: 35,
  lungeCooldown: 4.0,
  turnRate: 4.5,
  accel: 12.0,
  rangeMin: 7,
  rangeMax: 18,
  smokeBelow: 0.45,
  replan: 0.35,
};

const Kv = HOUND_CONFIG;

// 常用数学与角度计算工具函数
const clampValue = (val, min, max) => (val < min ? min : val > max ? max : val);
const diffAngle = (target, current) => {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  else if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
};

const bl = clampValue;
const uo = clampValue;
const K_ = diffAngle;
const Mm = diffAngle;

const DOWN_DIR = new W(0, -1, 0);
const tempAccVec = new W();
const tempRayDir = new W();
const tempTargetPos = new W();
const tempSparkPos = new W();

// ============================================================================
// 机械飞鸥实例控制器 (Gull Quad-Rotor Entity & Aerodynamics)
// ============================================================================

/**
 * 构造一只机械飞鸥实体 (Procedural Aerial Drone)
 */
function createGull(hiveCtx, rigDef, materials, index) {
  const engineCtx = hiveCtx.G;
  const rng = hiveCtx.rng;
  const lensMat = materials.lensBase.clone();

  const skinnedMeshWrapper = createSkinnedMesh(
    rigDef,
    {
      shell: materials.shell,
      metal: materials.metal,
      glow: materials.glow,
      lens: lensMat,
      disc: materials.disc,
      cone: materials.cone,
    },
    {
      radius: 0.9,
      center: [0, 0, 0],
      extra: { def: rigDef.extra, radius: 10 },
    },
  );

  const bones = skinnedMeshWrapper.bones;
  skinnedMeshWrapper.group.rotation.order = "YXZ";
  skinnedMeshWrapper.group.visible = false;

  // 编号与军规战术铭牌 (ID Tactical Label)
  const labelDef = engineCtx.mats.label("G-" + String(index + 11), {
    color: "black",
    font: "stencil",
    distress: 0.35,
  });
  const labelWidth = 0.105;
  const labelHeight = Math.min(0.045, labelWidth / (labelDef.aspect || 3));
  const labelPlane = new rn(labelWidth, labelHeight);
  labelPlane.rotateX(-HALF_PI);
  labelPlane.rotateY(Math.PI);
  const labelMesh = new Qe(labelPlane, labelDef.material);
  labelMesh.position.set(0, 0.0985, -0.085);
  labelMesh.castShadow = false;
  labelMesh.receiveShadow = true;
  bones.body.add(labelMesh);

  // 实体属性与状态
  const gull = {
    id: 0,
    type: "gull",
    pos: skinnedMeshWrapper.group.position,
    alive: false,
    hp: GULL_CONFIG.hp,
    active: false,
    rig: skinnedMeshWrapper,
    lens: lensMat,
    vel: new W(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    home: new W(),
    lastKnown: new W(),
    sensor: new W(),
    fwd: new W(0, 0, 1),
    muzzle: new W(),
    mode: "patrol",
    los: false,
    seeT: 0,
    noSeeT: 0,
    senseT: 0,
    exposure: 0,
    modeT: 0,
    passive: false,
    hasToken: false,
    orbitA: 0,
    orbitDir: 1,
    orbitR: 16,
    alt: 6,
    hoverY: 0,
    phase: 0,
    ceil: 1e9,
    ceilT: 0,
    flipT: 0,
    avoid: new W(),
    atk: "idle",
    atkT: 0,
    cool: 1,
    shots: 0,
    smokeT: 0,
    feeler: 0,
    strobeT: 0,
    flare: 0,
    lensC: [LENS_COLOR_AMBER_PATROL[0], LENS_COLOR_AMBER_PATROL[1], LENS_COLOR_AMBER_PATROL[2]],
    dieT: 0,
    spin: 0,
    lostRotor: 0,
    gy: 0,
    gp: 0,
    loop: null,
    sweep: 0,
    thr: 1,

    damage(amount, hitPoint, impulse, hitPart) {
      if (!gull.alive) return false;
      gull.hp -= amount;
      engineCtx.events.emit("enemy:hit", {
        enemy: gull,
        point: hitPoint,
        part: hitPart || "body",
      });

      if (impulse) {
        gull.vel.addScaledVector(impulse, Math.min(3, amount * 0.09));
        gull.roll += (rng() - 0.5) * 0.5;
        gull.pitch += (rng() - 0.5) * 0.4;
      }

      hiveCtx.provoke(gull);
      if (gull.hp <= 0) {
        killGull(impulse);
        return true;
      }
      return false;
    },

    _activate(spawnPos, options = {}) {
      gull.active = true;
      gull.alive = true;
      gull.hp = GULL_CONFIG.hp;
      gull.passive = !!options.passive;
      gull.pos.copy(spawnPos);
      gull.home.copy(spawnPos);
      gull.vel.set(0, 0, 0);
      gull.yaw = options.yaw ?? rng() * 6.283;
      gull.pitch = gull.roll = 0;
      gull.mode = options.state === "alert" ? "investigate" : "patrol";
      gull.modeT = 8;
      gull.lastKnown.copy(options.target || (engineCtx.player ? engineCtx.player.pos : spawnPos));
      gull.los = false;
      gull.seeT = gull.noSeeT = 0;
      gull.exposure = 0;
      gull.senseT = rng() * 0.2;
      gull.hasToken = false;
      gull.orbitDir = rng() < 0.5 ? 1 : -1;
      gull.orbitR =
        GULL_CONFIG.rangeMin + 2 + rng() * (GULL_CONFIG.rangeMax - GULL_CONFIG.rangeMin - 5);
      gull.alt =
        options.hover ??
        GULL_CONFIG.altMin + 0.8 + rng() * (GULL_CONFIG.altMax - GULL_CONFIG.altMin - 1.6);
      gull.hoverFixed = options.hover != null;
      gull.patrolR = options.patrolRadius ?? 4 + rng() * 5;
      gull.phase = rng() * 6.283;
      gull.orbitA = rng() * 6.283;
      gull.ceil = 1e9;
      gull.flipT = 3 + rng() * 4;
      gull.atk = "idle";
      gull.cool = 1 + rng() * 1.5;
      gull.dieT = 0;
      gull.spin = 0;
      gull.lostRotor = -1;
      gull.flare = 0;
      gull.thr = 1;

      for (let m = 0; m < 4; m++) bones["rotor" + m].scale.setScalar(1);
      bones.lamp.scale.setScalar(1);
      bones.body.rotation.set(0, 0, 0);
      skinnedMeshWrapper.group.visible = true;
      skinnedMeshWrapper.group.rotation.set(0, gull.yaw, 0);

      if (engineCtx.audio && engineCtx.audio.loop && !gull.loop) {
        try {
          gull.loop = engineCtx.audio.loop("gull_rotor", { pos: gull.pos, gain: 0.5 });
        } catch {
          gull.loop = null;
        }
      }
    },

    _deactivate() {
      gull.active = false;
      gull.alive = false;
      skinnedMeshWrapper.group.visible = false;
      hiveCtx.releaseToken(gull);
      if (gull.loop) {
        try {
          gull.loop.stop();
        } catch {}
        gull.loop = null;
      }
    },

    _raycast(rayOrigin, rayDir, maxDist, outHit) {
      // 椭球体空间变换解析求交 (Raycast against squashed ellipsoid)
      const dx = rayOrigin.x - gull.pos.x;
      const dy = (rayOrigin.y - gull.pos.y + 0.03) * 2.3;
      const dz = rayOrigin.z - gull.pos.z;

      const vx = rayDir.x;
      const vy = rayDir.y * 2.3;
      const vz = rayDir.z;

      const a = vx * vx + vy * vy + vz * vz;
      const b = dx * vx + dy * vy + dz * vz;
      const c = dx * dx + dy * dy + dz * dz - 0.5 * 0.5;

      const disc = b * b - a * c;
      if (disc < 0) return false;

      const t = (-b - Math.sqrt(disc)) / a;
      if (t < 0 || t > maxDist || t >= outHit.dist) return false;

      outHit.dist = t;
      outHit.part = "body";
      outHit.enemy = gull;
      outHit.point.copy(rayOrigin).addScaledVector(rayDir, t);
      outHit.normal.copy(outHit.point).sub(gull.pos);
      outHit.normal.y *= 2.3;
      outHit.normal.normalize();
      return true;
    },

    _update(dt) {
      if (gull.alive) updateAliveGull(dt);
      else updateDeadGull(dt);
    },
  };

  /**
   * 飞鸥击毁死亡处理 (Rotor Failure & Spin-out)
   */
  function killGull(impulse) {
    gull.alive = false;
    hiveCtx.releaseToken(gull);
    gull.dieT = 0;
    gull.lostRotor = Math.floor(rng() * 4);
    bones["rotor" + gull.lostRotor].scale.setScalar(1e-4);

    tempSparkPos
      .set(GULL_RIG_SPEC.rotors[gull.lostRotor][0], 0.05, GULL_RIG_SPEC.rotors[gull.lostRotor][2])
      .applyAxisAngle(UP_DIR_Y, gull.yaw)
      .add(gull.pos);

    engineCtx.fx.sparks(tempSparkPos, UP_DIR_Y, 14);
    engineCtx.fx.debris(tempSparkPos, { count: 3 });
    engineCtx.fx.smoke(tempSparkPos, { size: 0.5, life: 1 });

    gull.spin = (rng() < 0.5 ? -1 : 1) * (5 + rng() * 3);
    gull.vel.y += 1.5;
    if (impulse) gull.vel.addScaledVector(impulse, 2.5);

    bones.lamp.scale.setScalar(1e-4);
    bones.strobeG.scale.setScalar(1e-4);
    bones.strobeR.scale.setScalar(1e-4);
    bones.strobeW.scale.setScalar(1e-4);
    lensMat.color.setRGB(0.3, 0.05, 0.02);

    engineCtx.events.emit("enemy:killed", { enemy: gull, pos: gull.pos, type: "gull" });
  }

  /**
   * 飞鸥坠毁物理动力学与触地爆炸 (Dead Crash Physics & Ground Explosion)
   */
  function updateDeadGull(dt) {
    gull.dieT += dt;
    gull.vel.y -= 9.5 * dt;
    gull.vel.x *= 1 - 0.4 * dt;
    gull.vel.z *= 1 - 0.4 * dt;

    gull.spin += Math.sign(gull.spin) * 7 * dt;
    gull.yaw += gull.spin * dt;
    gull.roll += gull.spin * 0.35 * dt;
    gull.pitch += 0.9 * dt;

    const currentSpeed = gull.vel.length();
    const moveStep = currentSpeed * dt;
    let hasExploded = gull.dieT > 5 || gull.pos.y < -3;

    if (!hasExploded && currentSpeed > 0.01) {
      tempRayDir.copy(gull.vel).multiplyScalar(1 / currentSpeed);
      const hit = engineCtx.physics.raycast(gull.pos, tempRayDir, moveStep + 0.3);
      if (hit) {
        gull.pos.copy(hit.point).addScaledVector(hit.normal, 0.2);
        hasExploded = true;
      }
    }

    if (!hasExploded) {
      gull.pos.addScaledVector(gull.vel, dt);
    }

    skinnedMeshWrapper.group.rotation.set(gull.pitch, gull.yaw, gull.roll);

    for (let r = 0; r < 4; r++) {
      if (r !== gull.lostRotor) {
        bones["rotor" + r].rotation.y +=
          (r % 3 === 0 ? 1 : -1) * 30 * Math.max(0.2, 1 - gull.dieT * 0.5) * dt;
      }
    }

    gull.smokeT -= dt;
    if (gull.smokeT <= 0) {
      gull.smokeT = 0.045;
      engineCtx.fx.smoke(gull.pos, { size: 0.45, life: 1.3, color: 0x15161a, rise: 0.6 });
      if (rng() < 0.5) {
        tempSparkPos.set(rng() - 0.5, rng(), rng() - 0.5).normalize();
        engineCtx.fx.sparks(gull.pos, tempSparkPos, 3);
      }
    }

    if (gull.loop) {
      gull.loop.setPos(gull.pos);
      gull.loop.setPitch(Math.max(0.4, 1.25 - gull.dieT * 0.4));
      gull.loop.setGain(0.5);
    }

    if (hasExploded) {
      engineCtx.fx.explosion(gull.pos, 1.2);
      if (engineCtx.combat && engineCtx.combat.explode) {
        engineCtx.combat.explode(
          gull.pos,
          GULL_CONFIG.explodeRadius,
          GULL_CONFIG.explodeDamage,
          "enemy",
        );
      }
      hiveCtx.retire(gull);
    }
  }

  /**
   * 飞鸥飞行控制律、战术环绕、避障与射击状态机 (Active Flight Controller & Attack State Machine)
   */
  function updateAliveGull(dt) {
    const player = engineCtx.player;
    const simTime = hiveCtx.t;

    gull.fwd.set(Math.sin(gull.yaw), 0, Math.cos(gull.yaw));
    gull.sensor.set(0, -0.17, 0.27).applyAxisAngle(UP_DIR_Y, gull.yaw).add(gull.pos);

    hiveCtx.think(gull, dt, 0.4);

    const isEngaging = gull.mode === "engage";
    const isDamaged = gull.hp < GULL_CONFIG.hp * 0.5;
    let targetSpeed = GULL_CONFIG.patrolSpeed;
    let destX, destY, destZ;

    // 1. 战术飞行轨迹规划 (Orbit / Investigate / Patrol Trajectory)
    if (isEngaging && player) {
      targetSpeed = GULL_CONFIG.maxSpeed;
      const isAttacking = gull.atk !== "idle";
      gull.flipT -= dt;
      if (gull.flipT <= 0) {
        gull.flipT = 3 + rng() * 5;
        if (rng() < 0.6) gull.orbitDir = -gull.orbitDir;
        gull.orbitR = clampValue(
          gull.orbitR + (rng() - 0.5) * 6,
          GULL_CONFIG.rangeMin + 1,
          GULL_CONFIG.rangeMax - 2,
        );
      }

      if (gull.noSeeT > 1.5) {
        destX = gull.lastKnown.x;
        destZ = gull.lastKnown.z;
        destY = gull.lastKnown.y + gull.alt + 1;
        gull.orbitA = Math.atan2(gull.pos.z - gull.lastKnown.z, gull.pos.x - gull.lastKnown.x);
      } else {
        gull.orbitA += ((gull.orbitDir * (isAttacking ? 0.9 : 3.6)) / gull.orbitR) * dt;
        destX = player.pos.x + Math.cos(gull.orbitA) * gull.orbitR;
        destZ = player.pos.z + Math.sin(gull.orbitA) * gull.orbitR;
        destY = player.pos.y + gull.alt;
      }
    } else if (gull.mode === "investigate" || gull.mode === "search") {
      targetSpeed = 5.5;
      gull.orbitA += 0.5 * dt;
      destX = gull.lastKnown.x + Math.cos(gull.orbitA) * 4.5;
      destZ = gull.lastKnown.z + Math.sin(gull.orbitA) * 4.5;
      destY = gull.lastKnown.y + Math.min(gull.alt, 5.5);
    } else {
      gull.orbitA += 0.28 * dt * gull.orbitDir;
      destX = gull.home.x + Math.cos(gull.orbitA) * gull.patrolR;
      destZ = gull.home.z + Math.sin(gull.orbitA) * gull.patrolR;
      destY = gull.hoverFixed ? gull.alt : gull.home.y;
    }

    if (destY > gull.ceil) destY = gull.ceil;
    if (!gull.hoverFixed && destY < 2.2) destY = 2.2;

    // 2. PD 速度跟踪控制器 (Acceleration Command)
    tempAccVec.set(
      (destX - gull.pos.x) * 2.2 - gull.vel.x * 2.4,
      (destY - gull.pos.y) * 5.0 - gull.vel.y * 3.6,
      (destZ - gull.pos.z) * 2.2 - gull.vel.z * 2.4,
    );

    // 3. 多触角多层次环境光线避障 (Multi-Feeler Raycast Obstacle Avoidance)
    gull.feeler = (gull.feeler + 1) % 3;
    const horizontalSpeed = Math.hypot(gull.vel.x, gull.vel.z);

    if (gull.feeler === 0 && horizontalSpeed > 0.6) {
      tempRayDir.set(gull.vel.x / horizontalSpeed, 0, gull.vel.z / horizontalSpeed);
      const checkDist = 2.2 + horizontalSpeed * 0.5;
      const hit = engineCtx.physics.raycast(gull.pos, tempRayDir, checkDist);
      if (hit) {
        const proximity = 1 - hit.dist / checkDist;
        gull.avoid.copy(hit.normal).multiplyScalar(26 * proximity);
        gull.avoid.y += 9 * proximity;
        if (proximity > 0.5) {
          gull.orbitDir = -gull.orbitDir;
          gull.flipT = 2.5;
        }
      }
    } else if (gull.feeler === 1) {
      const groundHit = engineCtx.physics.raycast(gull.pos, DOWN_DIR, 2.4);
      if (groundHit && !gull.hoverFixed) {
        gull.avoid.y += (2.4 - groundHit.dist) * 10;
      }
    } else if (gull.feeler === 2 && ((gull.ceilT -= dt * 3), gull.ceilT <= 0)) {
      gull.ceilT = 0.35;
      const ceilHit = engineCtx.physics.raycast(gull.pos, UP_DIR_Y, 4.0);
      gull.ceil = ceilHit ? gull.pos.y + ceilHit.dist - 1.3 : 1e9;
    }

    tempAccVec.add(gull.avoid);
    gull.avoid.multiplyScalar(Math.exp(-6 * dt));

    if (isDamaged) {
      tempAccVec.x += Math.sin(simTime * 7.3 + gull.phase) * 5;
      tempAccVec.z += Math.cos(simTime * 6.1 + gull.phase) * 5;
      tempAccVec.y += Math.sin(simTime * 9.7) * 3;
    }

    const totalAcc = tempAccVec.length();
    if (totalAcc > GULL_CONFIG.accel) {
      tempAccVec.multiplyScalar(GULL_CONFIG.accel / totalAcc);
    }
    gull.vel.addScaledVector(tempAccVec, dt);

    const speed = gull.vel.length();
    if (speed > targetSpeed) {
      gull.vel.multiplyScalar(targetSpeed / speed);
    }

    // 4. 三轴分离物理碰撞滑移 (Axis-Separated Collision Response)
    for (let axis = 0; axis < 3; axis++) {
      const vComp = axis === 0 ? gull.vel.x : axis === 1 ? gull.vel.y : gull.vel.z;
      if (Math.abs(vComp) < 0.02) continue;
      const dirSign = vComp > 0 ? 1 : -1;
      const hullRadius = axis === 1 ? 0.35 : 0.62;

      tempRayDir.set(axis === 0 ? dirSign : 0, axis === 1 ? dirSign : 0, axis === 2 ? dirSign : 0);
      const hit = engineCtx.physics.raycast(
        gull.pos,
        tempRayDir,
        Math.abs(vComp) * dt + hullRadius,
      );
      if (hit) {
        gull.vel.setComponent(axis, -vComp * 0.25);
        gull.avoid.setComponent(axis, gull.avoid.getComponent(axis) - dirSign * 8);
        if (hit.dist < hullRadius) {
          gull.pos.setComponent(
            axis,
            gull.pos.getComponent(axis) - dirSign * (hullRadius - hit.dist),
          );
        }
      }
    }

    gull.pos.addScaledVector(gull.vel, dt);

    if (!gull.hoverFixed) {
      const groundFloor =
        engineCtx.physics.groundHeight(gull.pos.x, gull.pos.z, gull.pos.y + 0.5) + 1.1;
      if (gull.pos.y < groundFloor) {
        gull.pos.y = groundFloor;
        if (gull.vel.y < 0) gull.vel.y = 0;
      }
    }

    // 5. 偏航角与机动侧倾姿态学 (Yaw Steering, Pitch & Roll Banking)
    let desiredYaw = gull.yaw;
    if ((isEngaging || gull.mode === "search" || gull.mode === "investigate") && player) {
      const aimTarget = isEngaging && gull.noSeeT < 1.5 ? player.pos : gull.lastKnown;
      desiredYaw = Math.atan2(aimTarget.x - gull.pos.x, aimTarget.z - gull.pos.z);
    } else if (horizontalSpeed > 0.4) {
      desiredYaw = Math.atan2(gull.vel.x, gull.vel.z);
    }

    const yawDelta = diffAngle(desiredYaw, gull.yaw);
    gull.yaw += clampValue(yawDelta, -3.2 * dt, 3.2 * dt);

    const cosYaw = Math.cos(gull.yaw);
    const sinYaw = Math.sin(gull.yaw);

    // 转换至无人机体坐标系以计算飞行机动姿态俯仰与滚转
    const forwardForce = tempAccVec.x * sinYaw + tempAccVec.z * cosYaw;
    const rightForce = tempAccVec.x * cosYaw - tempAccVec.z * sinYaw;

    let targetPitch = clampValue(forwardForce * 0.04, -0.42, 0.42);
    let targetRoll = clampValue(-rightForce * 0.04, -0.42, 0.42);

    if (isDamaged) {
      targetPitch += Math.sin(simTime * 11 + gull.phase) * 0.1;
      targetRoll += Math.cos(simTime * 8.7 + gull.phase * 2) * 0.13;
    }

    const bankSmoothing = 1 - Math.exp(-7 * dt);
    gull.pitch += (targetPitch - gull.pitch) * bankSmoothing;
    gull.roll += (targetRoll - gull.roll) * bankSmoothing;

    skinnedMeshWrapper.group.rotation.set(gull.pitch, gull.yaw, gull.roll);
    bones.body.position.y =
      Math.sin(simTime * 2.1 + gull.phase) * 0.045 +
      Math.sin(simTime * 3.7 + gull.phase * 1.7) * 0.018;

    // 旋翼油门转速自适应 (Throttle Speed)
    gull.thr +=
      (1 + clampValue(tempAccVec.y * 0.03, -0.25, 0.4) + horizontalSpeed * 0.02 - gull.thr) *
      bankSmoothing;
    const rotorSpeed = 41 * gull.thr * dt;
    bones.rotor0.rotation.y += rotorSpeed;
    bones.rotor1.rotation.y -= rotorSpeed * 1.03;
    bones.rotor2.rotation.y -= rotorSpeed * 0.98;
    bones.rotor3.rotation.y += rotorSpeed * 1.01;

    // 6. 航行警示频闪灯节律 (Navigation Strobe Flashing)
    const strobePhase = (simTime * 0.9 + gull.phase * 0.1) % 1;
    const isWingStrobeOn = strobePhase < 0.05 || (strobePhase > 0.13 && strobePhase < 0.18);
    const isTailStrobeOn = strobePhase > 0.5 && strobePhase < 0.56;

    bones.strobeR.scale.setScalar(isWingStrobeOn ? 1 : 1e-4);
    bones.strobeG.scale.setScalar(isWingStrobeOn ? 1 : 1e-4);
    bones.strobeW.scale.setScalar(isTailStrobeOn ? 1 : 1e-4);

    // 7. 双轴光电瞄准吊舱跟踪 (Gimbal Tracking Player / Search Sweep)
    if (isEngaging && player) {
      tempTargetPos.set(player.pos.x, player.pos.y + 1.1, player.pos.z);
    } else if (gull.mode !== "patrol") {
      gull.sweep += dt;
      tempTargetPos.set(
        gull.lastKnown.x + Math.sin(gull.sweep * 0.9) * 3,
        gull.lastKnown.y,
        gull.lastKnown.z + Math.cos(gull.sweep * 0.7) * 3,
      );
    } else {
      gull.sweep += dt;
      const sweepYaw = gull.yaw + Math.sin(gull.sweep * 0.5 + gull.phase) * 0.9;
      tempTargetPos.set(
        gull.pos.x + Math.sin(sweepYaw) * 5,
        gull.pos.y - (gull.hoverFixed ? 1.6 : 5.0),
        gull.pos.z + Math.cos(sweepYaw) * 5,
      );
    }

    tempSparkPos.copy(tempTargetPos).sub(gull.sensor);
    const localTargetX = tempSparkPos.x * cosYaw - tempSparkPos.z * sinYaw;
    const localTargetZ = tempSparkPos.x * sinYaw + tempSparkPos.z * cosYaw;
    const localTargetY = tempSparkPos.y;

    const gimbalTargetYaw = Math.atan2(localTargetX, localTargetZ);
    const gimbalTargetPitch = clampValue(
      Math.atan2(-localTargetY, Math.hypot(localTargetX, localTargetZ)),
      -0.5,
      1.5,
    );

    const gimbalSmoothing = 1 - Math.exp(-9 * dt);
    gull.gy += diffAngle(gimbalTargetYaw, gull.gy) * gimbalSmoothing;
    gull.gp += (gimbalTargetPitch - gull.gp) * gimbalSmoothing;

    bones.gimbalYaw.rotation.y = gull.gy;
    bones.ball.rotation.x = gull.gp - gull.pitch;
    bones.gun.rotation.x = clampValue(gull.gp, -0.2, 1.3) - gull.pitch;

    // 8. 战术镜头辉光颜色与充能过载 (Lens Color & Flare)
    const targetLensColor = isEngaging ? LENS_COLOR_RED_ALERT : LENS_COLOR_AMBER_PATROL;
    const lensBrightness =
      1 + gull.flare * 3.2 + (isEngaging ? 0 : Math.sin(simTime * 3 + gull.phase) * 0.15);

    for (let c = 0; c < 3; c++) {
      gull.lensC[c] += (targetLensColor[c] - gull.lensC[c]) * (1 - Math.exp(-8 * dt));
    }
    lensMat.color.setRGB(
      gull.lensC[0] * lensBrightness,
      gull.lensC[1] * lensBrightness,
      gull.lensC[2] * lensBrightness,
    );
    gull.flare = Math.max(0, gull.flare - dt * 1.5);

    // 9. 射击攻击状态机 (Attack State Machine: idle -> tele -> burst)
    gull.muzzle.set(0, -0.12, 0.17).applyAxisAngle(UP_DIR_Y, gull.yaw).add(gull.pos);

    gull.cool -= dt;

    if (gull.atk === "idle") {
      if (
        isEngaging &&
        gull.los &&
        gull.cool <= 0 &&
        player &&
        player.alive &&
        Math.abs(yawDelta) < 0.35 &&
        gull.pos.distanceTo(player.pos) < GULL_CONFIG.fireRange &&
        hiveCtx.requestToken(gull)
      ) {
        gull.atk = "tele";
        gull.atkT = GULL_CONFIG.telegraph;
        engineCtx.events.emit("enemy:telegraph", {
          enemy: gull,
          type: "gull",
          time: GULL_CONFIG.telegraph,
          pos: gull.pos,
        });
      }
    } else if (gull.atk === "tele") {
      gull.atkT -= dt;
      gull.flare = Math.min(1, gull.flare + dt * 4.5);

      if (isEngaging) {
        if (gull.atkT <= 0) {
          gull.atk = "burst";
          gull.shots = GULL_CONFIG.burst;
          gull.atkT = 0;
          gull.lead = 0.2 + rng() * 0.65; // 前置提前量随机补偿
        }
      } else {
        gull.atk = "idle";
        hiveCtx.releaseToken(gull);
      }
    } else if (gull.atk === "burst") {
      gull.atkT -= dt;
      gull.flare = 1.0;

      if (gull.atkT <= 0) {
        gull.atkT = GULL_CONFIG.burstGap;
        gull.shots--;

        if (player) {
          const distToPlayer = gull.muzzle.distanceTo(player.pos);
          const flightTime = distToPlayer / GULL_CONFIG.boltSpeed;

          // 动目标预判导引点 (Lead Prediction Targeting)
          tempTargetPos.set(
            player.pos.x + player.vel.x * flightTime * gull.lead,
            player.pos.y + 1.05,
            player.pos.z + player.vel.z * flightTime * gull.lead,
          );

          tempRayDir.copy(tempTargetPos).sub(gull.muzzle).normalize();

          // 弹道散布 (Ballistic Spread)
          const spreadFactor =
            (GULL_CONFIG.spreadFar +
              (GULL_CONFIG.spreadNear - GULL_CONFIG.spreadFar) * gull.exposure) *
            (1 + hiveCtx.playerSpeed * 0.45) *
            (isDamaged ? 1.5 : 1.0);

          tempRayDir.x += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.y += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.z += (rng() - 0.5) * 2 * spreadFactor;
          tempRayDir.normalize();

          hiveCtx.fireBolt(gull.muzzle, tempRayDir, gull);
          engineCtx.fx.muzzleFlash(gull.muzzle, tempRayDir, { scale: 0.55 });
          engineCtx.events.emit("enemy:fire", {
            enemy: gull,
            pos: gull.muzzle,
            dir: tempRayDir,
            type: "gull",
          });

          // 射击后坐力冲量 (Recoil Impulse)
          gull.vel.addScaledVector(tempRayDir, -0.35);
        }

        if (gull.shots <= 0) {
          gull.atk = "idle";
          gull.cool =
            GULL_CONFIG.cooldown[0] + rng() * (GULL_CONFIG.cooldown[1] - GULL_CONFIG.cooldown[0]);
          hiveCtx.releaseToken(gull);
        }
      }
    }

    // 10. 破损冒烟排烟与引擎声学调制
    if (isDamaged) {
      gull.smokeT -= dt;
      if (gull.smokeT <= 0) {
        gull.smokeT = 0.16;
        engineCtx.fx.smoke(gull.pos, { size: 0.3, life: 1.1, color: 0x26272c, rise: 0.8 });
        if (rng() < 0.15) engineCtx.fx.sparks(gull.pos, DOWN_DIR, 2);
      }
    }

    if (gull.loop) {
      gull.loop.setPos(gull.pos);
      gull.loop.setPitch(0.85 + gull.thr * 0.2 + (isDamaged ? Math.sin(simTime * 13) * 0.05 : 0));
    }
  }

  return gull;
}

const Q_ = createGull;

// ============================================================================
// 机械猎犬动力学与状态机 (Hound Quadruped Entity & Locomotion)
// ============================================================================

/**
 * 二阶弹簧阻尼谐振器 (Damped Harmonic Oscillator / Spring Damper)
 */
function springDamper(spring, target, stiffness, damping, dt) {
  spring.v += ((target - spring.x) * stiffness - spring.v * damping) * dt;
  spring.x += spring.v * dt;
  return spring.x;
}

const xa = springDamper;

// 猎犬对角步态足端配对 (Diagonal Foot Pairs: [FL, RR] and [FR, RL])
const DIAGONAL_LEG_PAIRS = [
  [0, 3],
  [1, 2],
];
const wm = DIAGONAL_LEG_PAIRS;

const footScratchPos = new W();
const muzzleAimDir = new W();
const bulletTracerEnd = new W();
const houndEyeMuzzle = new W();
const ikAngles = { abd: 0, hip: 0, knee: 0, reach: 0 };
const bm = ikAngles;

/**
 * 构造一只机械猎犬实体 (Procedural Quadruped Combat Hound)
 */
function createHound(hiveCtx, rigDef, materials, index) {
  const engineCtx = hiveCtx.G;
  const rng = hiveCtx.rng;
  const lensMat = materials.lensBase.clone();

  const skinnedMeshWrapper = createSkinnedMesh(
    rigDef,
    {
      shell: materials.shell,
      metal: materials.metal,
      glow: materials.glow,
      lens: lensMat,
    },
    {
      radius: 1.5,
      center: [0, 0.6, 0],
    },
  );

  const bones = skinnedMeshWrapper.bones;
  skinnedMeshWrapper.group.visible = false;

  const abdJoints = [];
  const thighJoints = [];
  const shinJoints = [];

  for (let i = 0; i < 4; i++) {
    const legName = HOUND_RIG_SPEC.legs[i];
    abdJoints.push(bones["abd" + legName]);
    thighJoints.push(bones["thigh" + legName]);
    shinJoints.push(bones["shin" + legName]);
  }

  // 编号与军规战术铭牌
  const labelDef = engineCtx.mats.label("H-" + String(index + 3).padStart(2, "0"), {
    color: "black",
    font: "stencil",
    distress: 0.3,
  });
  const labelWidth = 0.2;
  const labelHeight = Math.min(0.085, labelWidth / (labelDef.aspect || 3));

  const planeLeft = new rn(labelWidth, labelHeight);
  planeLeft.rotateY(HALF_PI);
  planeLeft.translate(0.1675, 0.03, -0.085);

  const planeRight = new rn(labelWidth, labelHeight);
  planeRight.rotateY(-HALF_PI);
  planeRight.translate(-0.1675, 0.03, -0.085);

  const mergedLabelGeo = hiveCtx.mergeSimple([planeLeft, planeRight]);
  const labelMesh = new Qe(mergedLabelGeo, labelDef.material);
  labelMesh.castShadow = false;
  labelMesh.receiveShadow = true;
  bones.body.add(labelMesh);

  // 四足接触点动力学载体 (Foot Contact Points)
  const feet = [0, 1, 2, 3].map(() => ({
    p: new W(),
    from: new W(),
    to: new W(),
    slide: new W(),
  }));

  const hound = {
    id: 0,
    type: "hound",
    pos: skinnedMeshWrapper.group.position,
    alive: false,
    hp: HOUND_CONFIG.hp,
    active: false,
    rig: skinnedMeshWrapper,
    lens: lensMat,
    feet,
    yaw: 0,
    speed: 0,
    yawRate: 0,
    home: new W(),
    lastKnown: new W(),
    goal: new W(),
    firePos: new W(),
    firePlayer: new W(),
    sensor: new W(),
    fwd: new W(0, 0, 1),
    muzzle: new W(),
    headPos: new W(),
    push: new W(),
    mode: "patrol",
    los: false,
    seeT: 0,
    noSeeT: 0,
    senseT: 0,
    exposure: 0,
    modeT: 0,
    passive: false,
    hasToken: false,
    es: "move", // engage state: move, aim, tele, burst, wind, lunge, recover, cool
    esT: 0,
    cool: 1,
    shots: 0,
    bursts: 0,
    lungeCd: 0,
    path: null,
    wp: 0,
    planT: 0,
    hasGoal: false,
    waitT: 0,
    moveT: 0,
    stuckT: 0,
    sw: -1, // current swinging foot pair (0 or 1, -1 = all stance)
    swT: 0,
    swDur: 0.2,
    lastPair: 1,
    idleT: 0,
    lift: 0.08,

    // 底盘悬挂与天线动力学弹簧 (Suspension & Recoil Springs)
    sY: { x: 0, v: 0 }, // 纵向颠簸 (Vertical Heave)
    sP: { x: 0, v: 0 }, // 俯仰角 (Pitch)
    sR: { x: 0, v: 0 }, // 滚转角 (Roll)
    sL: { x: 0, v: 0 }, // 横向横移 (Lateral Sway)
    sA: { x: 0, v: 0 }, // 天线俯仰抖动 (Antenna Pitch)
    sA2: { x: 0, v: 0 }, // 天线横向抖动 (Antenna Yaw)

    crouch: 0,
    tyaw: 0,
    tpitch: 0,
    hyaw: 0,
    hpitch: 0,
    flare: 0,
    lensC: [LENS_COLOR_AMBER_PATROL[0], LENS_COLOR_AMBER_PATROL[1], LENS_COLOR_AMBER_PATROL[2]],
    smokeT: 0,
    phase: 0,
    scan: 0,
    dieT: 0,
    vy: 0,
    dieRoll: 0,
    diePitch: 0,
    wreck: false,
    sink: 0,
    loop: null,
    prevSpeed: 0,
    maxSpeed: HOUND_CONFIG.patrolSpeed,

    damage(amount, hitPoint, impulse, hitPart) {
      if (!hound.alive) return false;
      hound.hp -= amount;
      engineCtx.events.emit("enemy:hit", {
        enemy: hound,
        point: hitPoint,
        part: hitPart || "body",
      });

      if (impulse) {
        const cosY = Math.cos(hound.yaw);
        const sinY = Math.sin(hound.yaw);
        const impulseMag = Math.min(1.6, amount / 28);
        const forwardImpulse = impulse.x * sinY + impulse.z * cosY;
        const lateralImpulse = impulse.x * cosY - impulse.z * sinY;

        hound.sL.v += lateralImpulse * 1.4 * impulseMag;
        hound.sR.v += -lateralImpulse * 3.2 * impulseMag;
        hound.sP.v += forwardImpulse * 2.4 * impulseMag * (hitPart === "weak" ? 1.6 : 1.0);
        hound.sY.v -= 0.5 * impulseMag;
      }

      hiveCtx.provoke(hound);
      if (hound.hp <= 0) {
        killHound(impulse);
        return true;
      }
      return false;
    },

    _activate(spawnPos, options = {}) {
      hound.active = true;
      hound.alive = true;
      hound.wreck = false;
      hound.hp = HOUND_CONFIG.hp;
      hound.passive = !!options.passive;
      hound.sink = 0;
      hound.pos.copy(spawnPos);
      hound.pos.y = engineCtx.physics.groundHeight(spawnPos.x, spawnPos.z, spawnPos.y + 1);
      hound.home.copy(hound.pos);
      hound.yaw = options.yaw ?? rng() * 6.283;
      hound.speed = 0;
      hound.yawRate = 0;
      hound.push.set(0, 0, 0);
      hound.mode = options.state === "alert" ? "investigate" : "patrol";
      hound.modeT = 10;
      hound.modeSeen = hound.mode;
      hound.lastKnown.copy(options.target || (engineCtx.player ? engineCtx.player.pos : spawnPos));
      hound.los = false;
      hound.seeT = hound.noSeeT = 0;
      hound.exposure = 0;
      hound.senseT = rng() * 0.2;
      hound.hasToken = false;
      hound.patrolR = options.patrolRadius ?? 7;
      hound.patrolLine = options.patrolLine || null;
      hound.patrolI = 0;
      hound.es = "move";
      hound.cool = 0.6 + rng();
      hound.lungeCd = 0.3;
      hound.path = null;
      hound.hasGoal = false;
      hound.waitT = rng() * 1.5;
      hound.planT = 0;
      hound.sw = -1;
      hound.idleT = 0;
      hound.crouch = 0;
      hound.feelT = 0;
      hound.blocked = false;
      hound.flare = 0;
      hound.phase = rng() * 6.283;
      hound.dieT = 0;
      hound.tyaw = hound.hyaw = 0;
      hound.tpitch = hound.hpitch = 0;

      for (const spr of [hound.sY, hound.sP, hound.sR, hound.sL, hound.sA, hound.sA2]) {
        spr.x = 0;
        spr.v = 0;
      }

      for (let i = 0; i < 4; i++) {
        computeNeutralFootPos(hound.feet[i].p, i, hound.pos.x, hound.pos.z, hound.yaw);
      }

      bones.neck.rotation.set(0, 0, 0);
      bones.gun.rotation.set(0, 0, 0);
      skinnedMeshWrapper.group.visible = true;
      applyIKAndPose(0.016);

      if (engineCtx.audio && engineCtx.audio.loop && !hound.loop) {
        try {
          hound.loop = engineCtx.audio.loop("hound_servo", { pos: hound.pos, gain: 0 });
        } catch {
          hound.loop = null;
        }
      }
    },

    _deactivate() {
      hound.active = false;
      hound.alive = false;
      hound.wreck = false;
      skinnedMeshWrapper.group.visible = false;
      hiveCtx.releaseToken(hound);
      if (hound.loop) {
        try {
          hound.loop.stop();
        } catch {}
        hound.loop = null;
      }
    },

    _raycast(rayOrigin, rayDir, maxDist, outHit) {
      let isHit = false;

      // 1. 弱点：头部光电感知舱爆头相交检测 (Head Weakspot Sphere)
      if (intersectRaySphere(rayOrigin, rayDir, hound.headPos, 0.155, maxDist, outHit)) {
        outHit.part = "weak";
        outHit.enemy = hound;
        isHit = true;
      }

      // 2. 主体：躯干与底盘双胶囊体相交检测 (Chassis Torso Capsules)
      const cosY = Math.cos(hound.yaw);
      const sinY = Math.sin(hound.yaw);
      const bodyHeight = hound.pos.y + HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch;

      footScratchPos.set(hound.pos.x - sinY * 0.45, bodyHeight + 0.03, hound.pos.z - cosY * 0.45);
      tempSparkPos.set(hound.pos.x + sinY * 0.47, bodyHeight + 0.03, hound.pos.z + cosY * 0.47);

      if (
        intersectRayCapsule(rayOrigin, rayDir, footScratchPos, tempSparkPos, 0.27, maxDist, outHit)
      ) {
        outHit.part = "body";
        outHit.enemy = hound;
        isHit = true;
      }

      footScratchPos.y = tempSparkPos.y = hound.pos.y + (bodyHeight - hound.pos.y) * 0.45;
      if (
        intersectRayCapsule(rayOrigin, rayDir, footScratchPos, tempSparkPos, 0.25, maxDist, outHit)
      ) {
        outHit.part = "body";
        outHit.enemy = hound;
        isHit = true;
      }

      return isHit;
    },

    _update(dt) {
      if (hound.alive) updateAliveHound(dt);
      else updateDeadHound(dt);
    },
  };

  /**
   * 计算指定肢体在中立站立姿态下的地面世界坐标
   */
  function computeNeutralFootPos(outVec, legIdx, rootX, rootZ, rootYaw) {
    const offsetX = HOUND_RIG_SPEC.side[legIdx] * HOUND_RIG_SPEC.footX;
    const offsetZ = HOUND_RIG_SPEC.footZ[legIdx];
    const cosY = Math.cos(rootYaw);
    const sinY = Math.sin(rootYaw);
    outVec.set(rootX + offsetX * cosY + offsetZ * sinY, 0, rootZ - offsetX * sinY + offsetZ * cosY);
    return outVec;
  }

  /**
   * 设置寻路导航目标
   */
  function setGoal(targetPos, forceReplan = false) {
    if (!forceReplan && hound.hasGoal && hound.goal.distanceToSquared(targetPos) < 0.25) return;
    hound.goal.copy(targetPos);
    hound.hasGoal = true;
    hound.planT = 0;
    hound.stuckT = 0;
  }

  /**
   * 触发 A* 导航网格重规划 (A* Navmesh Pathfinding)
   */
  function replanPath() {
    hound.planT = HOUND_CONFIG.replan + rng() * 0.15;
    let path = null;
    try {
      path = engineCtx.physics.nav.findPath(hound.pos, hound.goal);
    } catch {
      path = null;
    }
    hound.path = path && path.length ? path : null;
    hound.wp = 0;
    if (hound.path && hound.path.length > 1 && hound.path[0].distanceToSquared(hound.pos) < 0.36) {
      hound.wp = 1;
    }
  }

  /**
   * 沿导航路径平滑移动巡航 (Path Following)
   */
  function followPath(dt, targetSpeed) {
    if (!hound.hasGoal) {
      hound.maxSpeed = 0;
      return true;
    }

    hound.planT -= dt;
    if (hound.planT <= 0) replanPath();

    let destPoint = hound.goal;
    if (hound.path) {
      while (hound.wp < hound.path.length) {
        const wpPos = hound.path[hound.wp];
        if (Math.hypot(wpPos.x - hound.pos.x, wpPos.z - hound.pos.z) > 0.65) break;
        hound.wp++;
      }
      if (hound.wp >= hound.path.length) {
        hound.path = null;
      } else {
        destPoint = hound.path[hound.wp];
      }
    }

    const dx = destPoint.x - hound.pos.x;
    const dz = destPoint.z - hound.pos.z;
    const distToDest = Math.hypot(dx, dz);

    if (distToDest < 0.45 && !hound.path) {
      hound.hasGoal = false;
      hound.maxSpeed = 0;
      return true;
    }

    hound.wantYaw = Math.atan2(dx, dz);
    const angleErr = Math.abs(diffAngle(hound.wantYaw, hound.yaw));
    const speedTurnFactor = clampValue(1 - angleErr * 0.7, 0.25, 1);
    hound.maxSpeed = targetSpeed * speedTurnFactor;
    return false;
  }

  /**
   * 战术寻找射击阵位或掩体点位 (Cover Point / Flank Position Selection)
   */
  function seekCoverOrFlank() {
    const player = engineCtx.player;
    if (!player) return;

    let bestScore = Infinity;
    const playerEye = player.eye || player.pos;

    const evaluatePoint = (candidatePos, isCover = false) => {
      const distToPlayer = Math.hypot(candidatePos.x - player.pos.x, candidatePos.z - player.pos.z);
      if (distToPlayer < HOUND_CONFIG.rangeMin || distToPlayer > HOUND_CONFIG.rangeMax) return;
      if (!engineCtx.physics.nav.isWalkable(candidatePos.x, candidatePos.z)) return;

      const hasLos = engineCtx.physics.lineOfSight(candidatePos, playerEye);
      if (!hasLos) return;

      const pathDist = Math.hypot(candidatePos.x - hound.pos.x, candidatePos.z - hound.pos.z);
      const score = pathDist + (isCover ? -2 : 0) + rng() * 3;
      if (score < bestScore) {
        bestScore = score;
        hound.firePos.copy(candidatePos);
      }
    };

    if (engineCtx.level && engineCtx.level.coverPoints) {
      for (const pt of engineCtx.level.coverPoints) evaluatePoint(pt, true);
    }

    if (bestScore === Infinity) {
      for (let i = 0; i < 8; i++) {
        const angle = rng() * Math.PI * 2;
        const radius =
          HOUND_CONFIG.rangeMin + 1 + rng() * (HOUND_CONFIG.rangeMax - HOUND_CONFIG.rangeMin - 2);
        footScratchPos.set(
          player.pos.x + Math.cos(angle) * radius,
          0,
          player.pos.z + Math.sin(angle) * radius,
        );
        evaluatePoint(footScratchPos, false);
      }
    }

    if (bestScore !== Infinity) {
      setGoal(hound.firePos, true);
      hound.firePlayer.copy(player.pos);
      hound.es = "move";
      hound.moveT = 0;
      hound.bursts = 0;
    } else {
      hound.es = "aim";
      hound.esT = 0;
    }
  }

  /**
   * 猎犬机枪向玩家快速单发击发 (Turret Burst Projectile / Hitscan)
   */
  function fireTurretShot(player) {
    const cosY = Math.cos(hound.yaw + hound.tyaw);
    const sinY = Math.sin(hound.yaw + hound.tyaw);

    houndEyeMuzzle.setFromMatrixPosition(bones.gun.matrixWorld);
    hound.muzzle.set(
      houndEyeMuzzle.x + sinY * 0.12,
      houndEyeMuzzle.y - 0.01,
      houndEyeMuzzle.z + cosY * 0.12,
    );

    const targetEye = player.eye || player.pos;
    muzzleAimDir.copy(targetEye).sub(hound.muzzle).normalize();

    const spread = 0.024 * (1 - hound.exposure * 0.3);
    muzzleAimDir.x += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.y += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.z += (rng() - 0.5) * 2 * spread;
    muzzleAimDir.normalize();

    const hit = engineCtx.physics.raycast(hound.muzzle, muzzleAimDir, 200);
    const playerHit = engineCtx.combat.enemyShot(hound.muzzle, muzzleAimDir, {
      damage: HOUND_CONFIG.shotDamage,
      range: 200,
    });

    const maxDist = playerHit ? hound.muzzle.distanceTo(targetEye) : hit ? hit.dist : 90;

    bulletTracerEnd.copy(hound.muzzle).addScaledVector(muzzleAimDir, maxDist);
    engineCtx.fx.tracer(hound.muzzle, bulletTracerEnd, {
      color: 0xffbd30,
      speed: 260,
      width: 0.035,
    });
    engineCtx.fx.muzzleFlash(hound.muzzle, muzzleAimDir, { scale: 0.9 });

    if (engineCtx.render && engineCtx.render.lightPool) {
      engineCtx.render.lightPool.flash(hound.muzzle, 0xffad20, 22, 7, 0.05);
    }

    engineCtx.events.emit("enemy:fire", {
      enemy: hound,
      pos: hound.muzzle,
      dir: muzzleAimDir,
      type: "hound",
    });

    // 枪管后坐力与底盘俯仰振动 (Turret Recoil Kick)
    hound.sP.v += 1.1;
    hound.sY.v -= 0.25;
  }

  /**
   * 猎犬战斗与行为决策主循环 (Hound Think & State Machine)
   */
  function updateAliveHound(dt) {
    const player = engineCtx.player;
    const simTime = hiveCtx.t;

    hound.fwd.set(Math.sin(hound.yaw), 0, Math.cos(hound.yaw));
    hound.sensor.copy(hound.headPos);

    hiveCtx.think(hound, dt, 0.55);

    if (hound.mode !== hound.modeSeen) {
      hound.modeSeen = hound.mode;
      hound.hasGoal = false;
      hound.path = null;
      hound.waitT = 0;
      if (hound.mode === "engage") {
        seekCoverOrFlank();
      } else if (hound.es === "tele" || hound.es === "burst") {
        hiveCtx.releaseToken(hound);
        hound.es = "move";
      }
    }

    hound.wantYaw = hound.yaw;
    hound.maxSpeed = 0;
    hound.cool -= dt;
    hound.lungeCd -= dt;

    let aimTarget = null;
    let headLookTarget = null;
    let crouchTarget = 0;
    let isLunging = false;
    const distToPlayer = player
      ? Math.hypot(player.pos.x - hound.pos.x, player.pos.z - hound.pos.z)
      : 1e9;

    // 1. 状态分支 (State Transitions)
    if (hound.mode === "patrol") {
      if (hound.hasGoal) {
        if (followPath(dt, HOUND_CONFIG.patrolSpeed)) {
          hound.waitT = 1.5 + rng() * 3.0;
        }
      } else if ((hound.waitT -= dt) <= 0) {
        if (hound.patrolLine) {
          hound.patrolI = (hound.patrolI + 1) % hound.patrolLine.length;
          setGoal(hound.patrolLine[hound.patrolI], true);
        } else {
          const randPt = engineCtx.physics.nav.randomPoint(hound.home, hound.patrolR);
          if (randPt) setGoal(randPt, true);
          else hound.waitT = 1.0;
        }
      }
    } else if (hound.mode === "investigate" || hound.mode === "search") {
      headLookTarget = hound.lastKnown;
      const distToInvestigate = Math.hypot(
        hound.lastKnown.x - hound.pos.x,
        hound.lastKnown.z - hound.pos.z,
      );
      if (distToInvestigate > 2.2) {
        setGoal(hound.lastKnown);
        followPath(dt, distToInvestigate < 8 ? HOUND_CONFIG.stalkSpeed : HOUND_CONFIG.runSpeed);
      } else {
        hound.hasGoal = false;
        hound.scan += dt;
        hound.wantYaw = hound.yaw + Math.sin(hound.scan * 0.8) * 0.9;
        headLookTarget = null;
      }
    } else if (player) {
      aimTarget = player.pos;
      headLookTarget = player.pos;
      const angleToPlayer = Math.atan2(player.pos.x - hound.pos.x, player.pos.z - hound.pos.z);

      // 近身判定：触发致命飞扑冲刺 (Pounce / Lunge Attack Check)
      if (
        (hound.es === "move" || hound.es === "aim" || hound.es === "cool") &&
        distToPlayer < HOUND_CONFIG.lungeRange &&
        hound.lungeCd <= 0 &&
        player.alive
      ) {
        hound.es = "wind";
        hound.esT = 0.28;
        hiveCtx.releaseToken(hound);
        engineCtx.events.emit("enemy:telegraph", {
          enemy: hound,
          type: "hound",
          time: 0.28,
          pos: hound.pos,
          melee: true,
        });
      }

      switch (hound.es) {
        case "move": {
          hound.moveT += dt;
          const reached = followPath(dt, HOUND_CONFIG.runSpeed);
          const inIdealRange =
            distToPlayer > HOUND_CONFIG.rangeMin - 1 && distToPlayer < HOUND_CONFIG.rangeMax + 2;

          if (
            reached ||
            (hound.moveT > 1.4 && hound.los && inIdealRange && rng() < dt * 0.7) ||
            hound.moveT > 7.0
          ) {
            hound.es = "aim";
            hound.esT = 0;
            hound.hasGoal = false;
          } else if (player.pos.distanceToSquared(hound.firePlayer) > 49) {
            seekCoverOrFlank();
          }
          break;
        }

        case "aim":
        case "cool": {
          hound.wantYaw = angleToPlayer;
          hound.esT += dt;
          if (hound.los) {
            if (distToPlayer < HOUND_CONFIG.rangeMin - 3 && hound.esT > 0.8) {
              seekCoverOrFlank();
            } else if (
              hound.cool <= 0 &&
              player.alive &&
              Math.abs(diffAngle(angleToPlayer - hound.yaw, hound.tyaw)) < 0.14 &&
              hiveCtx.requestToken(hound)
            ) {
              hound.es = "tele";
              hound.esT = HOUND_CONFIG.telegraph;
              engineCtx.events.emit("enemy:telegraph", {
                enemy: hound,
                type: "hound",
                time: HOUND_CONFIG.telegraph,
                pos: hound.pos,
              });
            }
          } else if (hound.noSeeT > 1.1 || hound.esT > 3.0) {
            seekCoverOrFlank();
          }
          break;
        }

        case "tele": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          hound.flare = Math.min(1, hound.flare + dt * 5);
          crouchTarget = 0.05;
          if (hound.esT <= 0) {
            hound.es = "burst";
            hound.shots = HOUND_CONFIG.burst;
            hound.esT = 0;
          }
          break;
        }

        case "burst": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          hound.flare = 1.0;
          crouchTarget = 0.05;
          if (hound.esT <= 0) {
            hound.esT = HOUND_CONFIG.burstGap;
            hound.shots--;
            fireTurretShot(player);
          }
          if (hound.shots <= 0) {
            hiveCtx.releaseToken(hound);
            hound.cool =
              HOUND_CONFIG.cooldown[0] +
              rng() * (HOUND_CONFIG.cooldown[1] - HOUND_CONFIG.cooldown[0]);
            hound.bursts++;
            if (hound.bursts >= 1 + (rng() < 0.4 ? 1 : 0)) {
              seekCoverOrFlank();
            } else {
              hound.es = "cool";
              hound.esT = 0;
            }
          }
          break;
        }

        case "wind": {
          hound.wantYaw = angleToPlayer;
          hound.esT -= dt;
          crouchTarget = 0.16;
          hound.sP.v += 3.0 * dt;
          if (hound.esT <= 0) {
            hound.es = "lunge";
            hound.esT = 0.36;
            hound.speed = HOUND_CONFIG.lungeSpeed;
            hound.yaw = angleToPlayer;
          }
          break;
        }

        case "lunge": {
          isLunging = true;
          hound.esT -= dt;
          hound.wantYaw = angleToPlayer;
          hound.maxSpeed = HOUND_CONFIG.lungeSpeed;
          hound.speed = HOUND_CONFIG.lungeSpeed;

          if (distToPlayer < 1.35 && player.alive) {
            player.damage(HOUND_CONFIG.lungeDamage, hound.pos);
            engineCtx.events.emit("enemy:melee", { enemy: hound, pos: hound.pos });
            hound.esT = 0;
            hound.sP.v -= 4.0;
          }

          if (hound.esT <= 0) {
            hound.es = "recover";
            hound.esT = 0.55;
            hound.lungeCd = HOUND_CONFIG.lungeCooldown;
            hound.speed *= 0.3;
          }
          break;
        }

        case "recover": {
          hound.esT -= dt;
          hound.wantYaw = angleToPlayer;
          if (hound.esT <= 0) seekCoverOrFlank();
          break;
        }
      }
    }

    // 2. 转向速率阻尼积分 (Steering Dynamics)
    const yawError = diffAngle(hound.wantYaw, hound.yaw);
    const targetYawRate =
      clampValue(yawError * 6.0, -HOUND_CONFIG.turnRate, HOUND_CONFIG.turnRate) *
      (isLunging ? 2.0 : 1.0);

    hound.yawRate += (targetYawRate - hound.yawRate) * (1 - Math.exp(-10 * dt));
    hound.yaw += hound.yawRate * dt;

    // 3. 线速度加速度积分 (Linear Velocity Integration)
    const accelRate = hound.maxSpeed > hound.speed ? HOUND_CONFIG.accel : -HOUND_CONFIG.accel * 1.4;
    hound.prevSpeed = hound.speed;
    hound.speed = isLunging
      ? hound.speed
      : clampValue(hound.speed + accelRate * dt, 0, Math.max(hound.maxSpeed, 0));

    if (!isLunging && accelRate < 0 && hound.speed < hound.maxSpeed) {
      hound.speed = hound.maxSpeed;
    }

    // 4. 群体避挤与玩家碰撞排斥 (Flocking Repulsion & Push)
    const sinYaw = Math.sin(hound.yaw);
    const cosYaw = Math.cos(hound.yaw);

    for (const other of hiveCtx.list) {
      if (other === hound || other.type !== "hound" || !other.active) continue;
      const sepX = hound.pos.x - other.pos.x;
      const sepZ = hound.pos.z - other.pos.z;
      const sepDist = Math.hypot(sepX, sepZ);
      if (sepDist < 1.7 && sepDist > 0.001) {
        const force = ((1.7 - sepDist) * 2.2) / sepDist;
        hound.push.x += sepX * force * dt * 6;
        hound.push.z += sepZ * force * dt * 6;
      }
    }

    if (player && !isLunging && distToPlayer < 1.25 && distToPlayer > 0.001) {
      const force = ((1.25 - distToPlayer) * 3.0) / distToPlayer;
      hound.push.x += (hound.pos.x - player.pos.x) * force * dt * 6;
      hound.push.z += (hound.pos.z - player.pos.z) * force * dt * 6;
    }

    hound.push.multiplyScalar(Math.exp(-5 * dt));

    // 5. 障碍探测与地面贴合 (Obstacle Feeler & Navmesh Bounds)
    let nextX = hound.pos.x + (sinYaw * hound.speed + hound.push.x) * dt;
    let nextZ = hound.pos.z + (cosYaw * hound.speed + hound.push.z) * dt;
    const navmesh = engineCtx.physics.nav;

    hound.feelT -= dt;
    if (hound.feelT <= 0 && hound.speed > 0.3) {
      hound.feelT = 0.12;
      houndEyeMuzzle.set(hound.pos.x, hound.pos.y + 0.55, hound.pos.z);
      muzzleAimDir.set(sinYaw, 0, cosYaw);
      const hit = engineCtx.physics.raycast(
        houndEyeMuzzle,
        muzzleAimDir,
        0.75 + hound.speed * 0.12,
      );
      hound.blocked = !!hit;
    } else if (hound.speed <= 0.3) {
      hound.blocked = false;
    }

    const isOffNav = navmesh.isWalkable && !navmesh.isWalkable(nextX, nextZ);
    const isObstructed =
      (hound.blocked && !isLunging) || (hound.blocked && isLunging && hound.esT < 0.3);

    if (isOffNav || isObstructed) {
      if (hound.blocked) {
        nextX = hound.pos.x + hound.push.x * dt;
        nextZ = hound.pos.z + hound.push.z * dt;
        hound.yawRate += (hound.phase > 3.14 ? 1 : -1) * 4 * dt;
      } else if (navmesh.isWalkable(nextX, hound.pos.z)) {
        nextZ = hound.pos.z;
      } else if (navmesh.isWalkable(hound.pos.x, nextZ)) {
        nextX = hound.pos.x;
      } else {
        nextX = hound.pos.x;
        nextZ = hound.pos.z;
      }

      hound.speed *= 0.6;
      hound.stuckT += dt;
      if (hound.stuckT > 0.5) {
        hound.stuckT = 0;
        hound.planT = 0;
        if (hound.mode === "engage" && hound.es === "move") seekCoverOrFlank();
        else if (hound.mode === "patrol") hound.hasGoal = false;
      }
    }

    hound.pos.x = nextX;
    hound.pos.z = nextZ;
    hound.pos.y +=
      (engineCtx.physics.groundHeight(nextX, nextZ, hound.pos.y + 0.6) - hound.pos.y) *
      (1 - Math.exp(-12 * dt));

    // 6. 四足小跑步态推进 (Trotting Locomotion Dynamics)
    updateHoundLocomotion(dt);

    hound.crouch += (crouchTarget - hound.crouch) * (1 - Math.exp(-12 * dt));

    // 7. 炮塔与头部多级朝向计算 (Turret Aiming & Head Look-At IK)
    const cosY = Math.cos(hound.yaw);
    const sinY = Math.sin(hound.yaw);
    let targetTurretYaw = 0;
    let targetTurretPitch = 0;
    let targetHeadYaw = 0;
    let targetHeadPitch = 0.05;
    const bodyHeight = hound.pos.y + HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch;

    if (aimTarget) {
      const dx = aimTarget.x - hound.pos.x;
      const dz = aimTarget.z - hound.pos.z;
      const dy = aimTarget.y + 1.0 - (bodyHeight + 0.25);
      targetTurretYaw = Math.atan2(dx * cosY - dz * sinY, dx * sinY + dz * cosY);
      targetTurretPitch = clampValue(Math.atan2(-dy, Math.hypot(dx, dz)), -0.9, 0.35);
    } else {
      hound.scan += dt * 0.5;
      targetTurretYaw = Math.sin(hound.scan * 0.9 + hound.phase) * 1.1;
    }

    if (headLookTarget) {
      const dx = headLookTarget.x - hound.pos.x;
      const dz = headLookTarget.z - hound.pos.z;
      const dy = headLookTarget.y + 1.2 - (bodyHeight + 0.2);
      targetHeadYaw = clampValue(
        Math.atan2(dx * cosY - dz * sinY, dx * sinY + dz * cosY),
        -1.2,
        1.2,
      );
      targetHeadPitch = clampValue(Math.atan2(-dy, Math.hypot(dx, dz)), -0.6, 0.5);
    } else {
      targetHeadYaw =
        Math.sin(hiveCtx.t * 0.7 + hound.phase) * 0.5 + clampValue(hound.yawRate * 0.25, -0.6, 0.6);
    }

    const turretTurnStep = clampValue(4.5 * dt, 0, 1);
    hound.tyaw += clampValue(
      diffAngle(targetTurretYaw, hound.tyaw),
      -turretTurnStep,
      turretTurnStep,
    );
    hound.tpitch += (targetTurretPitch - hound.tpitch) * (1 - Math.exp(-10 * dt));

    const headSmoothing = 1 - Math.exp(-7 * dt);
    hound.hyaw += (targetHeadYaw - hound.hyaw) * headSmoothing;
    hound.hpitch += (targetHeadPitch - hound.hpitch) * headSmoothing;

    // 8. 骨骼姿态与四足逆运动学求解 (Bone Transform & Quadruped Leg IK)
    applyIKAndPose(dt);

    // 9. 战术闪光与灯效
    const beaconFreq = (hiveCtx.t * (hound.mode === "patrol" ? 0.8 : 2.2) + hound.phase) % 1;
    const isBeaconOn = beaconFreq < 0.12 || (beaconFreq > 0.22 && beaconFreq < 0.3);
    bones.beacon.scale.setScalar(isBeaconOn ? 1 : 1e-4);

    const targetLensColor =
      hound.mode === "engage" ? LENS_COLOR_RED_ALERT : LENS_COLOR_AMBER_PATROL;
    const lensBrightness = 1 + hound.flare * 3.5;
    for (let c = 0; c < 3; c++) {
      hound.lensC[c] += (targetLensColor[c] - hound.lensC[c]) * (1 - Math.exp(-8 * dt));
    }
    lensMat.color.setRGB(
      hound.lensC[0] * lensBrightness,
      hound.lensC[1] * lensBrightness,
      hound.lensC[2] * lensBrightness,
    );
    hound.flare = Math.max(0, hound.flare - dt * 2.0);

    // 10. 受损排烟与机械伺服音效
    if (hound.hp < HOUND_CONFIG.hp * HOUND_CONFIG.smokeBelow) {
      hound.smokeT -= dt;
      if (hound.smokeT <= 0) {
        hound.smokeT = 0.2;
        footScratchPos.set(hound.pos.x - sinY * 0.3, bodyHeight + 0.2, hound.pos.z - cosY * 0.3);
        engineCtx.fx.smoke(footScratchPos, { size: 0.35, life: 1.3, color: 0x232428, rise: 0.9 });
        if (rng() < 0.2) engineCtx.fx.sparks(footScratchPos, DOWN_DIR, 3);
      }
    }

    if (hound.loop) {
      hound.loop.setPos(hound.pos);
      hound.loop.setGain(
        clampValue(0.12 + hound.speed * 0.12 + Math.abs(hound.yawRate) * 0.1, 0, 0.8),
      );
      hound.loop.setPitch(0.8 + hound.speed * 0.08);
    }
  }

  /**
   * 四足对角小跑步态生成器 (Trotting Gait Locomotion Generator)
   */
  function updateHoundLocomotion(dt) {
    const moveDirX = Math.sin(hound.yaw) * hound.speed + hound.push.x;
    const moveDirZ = Math.cos(hound.yaw) * hound.speed + hound.push.z;
    const isMoving = hound.speed > 0.15 || Math.abs(hound.yawRate) > 0.25;

    if (hound.sw < 0) {
      hound.idleT = isMoving ? 0 : hound.idleT + dt;
      const motionIntensity = hound.speed + Math.abs(hound.yawRate) * 0.5;
      const stepDuration = clampValue(0.27 - motionIntensity * 0.026, 0.14, 0.27);

      let bestPair = -1;
      let maxDisplacement = 0;

      for (let p = 0; p < 2; p++) {
        let pairDisp = 0;
        for (const legIdx of DIAGONAL_LEG_PAIRS[p]) {
          computeNeutralFootPos(
            footScratchPos,
            legIdx,
            hound.pos.x + moveDirX * stepDuration,
            hound.pos.z + moveDirZ * stepDuration,
            hound.yaw + hound.yawRate * stepDuration,
          );
          const d = Math.hypot(
            footScratchPos.x - hound.feet[legIdx].p.x,
            footScratchPos.z - hound.feet[legIdx].p.z,
          );
          if (d > pairDisp) pairDisp = d;
        }

        if (p !== hound.lastPair) pairDisp *= 1.25; // 步态滞后偏置 (Alternating Bias)
        if (pairDisp > maxDisplacement) {
          maxDisplacement = pairDisp;
          bestPair = p;
        }
      }

      const stepThreshold = isMoving ? 0.09 : hound.idleT > 0.25 ? 0.035 : 1e9;
      if (bestPair >= 0 && maxDisplacement > stepThreshold) {
        hound.sw = bestPair;
        hound.swT = 0;
        hound.swDur = stepDuration;
        hound.lift = 0.065 + Math.min(0.09, motionIntensity * 0.02);

        for (const legIdx of DIAGONAL_LEG_PAIRS[bestPair]) {
          const footRecord = hound.feet[legIdx];
          footRecord.from.copy(footRecord.p);
          computeNeutralFootPos(
            footRecord.to,
            legIdx,
            hound.pos.x + moveDirX * stepDuration * 1.5,
            hound.pos.z + moveDirZ * stepDuration * 1.5,
            hound.yaw + hound.yawRate * stepDuration * 1.5,
          );
          footRecord.to.y = engineCtx.physics.groundHeight(
            footRecord.to.x,
            footRecord.to.z,
            hound.pos.y + 0.6,
          );
        }
      }
    } else {
      // 抬腿摆动插值 (Leg Swing Cubic Phase)
      hound.swT += dt / hound.swDur;
      const t = hound.swT >= 1 ? 1 : hound.swT;
      const smoothT = t * t * (3 - 2 * t);

      for (const legIdx of DIAGONAL_LEG_PAIRS[hound.sw]) {
        const footRecord = hound.feet[legIdx];
        footRecord.p.lerpVectors(footRecord.from, footRecord.to, smoothT);
        footRecord.p.y += Math.sin(Math.PI * t) * hound.lift;
      }

      if (hound.swT >= 1) {
        // 落地踏步撞击与音效事件 (Foot Plant Contact Event)
        const plantFoot = hound.feet[DIAGONAL_LEG_PAIRS[hound.sw][0]];
        engineCtx.events.emit("enemy:step", {
          pos: plantFoot.p,
          type: "hound",
          enemy: hound,
          speed: hound.speed,
        });
        hound.sY.v -= 0.12 + hound.speed * 0.03; // 踏步底盘反冲
        hound.lastPair = hound.sw;
        hound.sw = -1;
      }
    }
  }

  /**
   * 姿态动力学与四足解析 IK 绑定 (Chassis Suspension & Leg IK Application)
   */
  function applyIKAndPose(dt) {
    const cosY = Math.cos(hound.yaw);
    const sinY = Math.sin(hound.yaw);

    // 四足支撑多边形高度平均
    const frontGroundY = (hound.feet[0].p.y + hound.feet[1].p.y) * 0.5;
    const rearGroundY = (hound.feet[2].p.y + hound.feet[3].p.y) * 0.5;
    const leftGroundY = (hound.feet[0].p.y + hound.feet[2].p.y) * 0.5;
    const rightGroundY = (hound.feet[1].p.y + hound.feet[3].p.y) * 0.5;

    const terrainHeightDelta = (frontGroundY + rearGroundY) * 0.5 - hound.pos.y;
    const accelDelta = dt > 0 ? (hound.speed - hound.prevSpeed) / dt : 0;

    let targetChassisPitch =
      Math.atan2(rearGroundY - frontGroundY, 0.8) * 0.6 +
      clampValue(accelDelta * 0.006, -0.07, 0.07);
    let targetChassisRoll =
      Math.atan2(leftGroundY - rightGroundY, 0.55) * 0.6 +
      clampValue(hound.yawRate * hound.speed * 0.02, -0.12, 0.12);
    let targetChassisHeave = terrainHeightDelta * 0.45 - Math.min(0.05, hound.speed * 0.011);

    if (!hound.alive) {
      targetChassisPitch = hound.diePitch;
      targetChassisRoll = hound.dieRoll;
      targetChassisHeave = 0;
    } else {
      springDamper(hound.sY, targetChassisHeave, 160, 17, dt);
      springDamper(hound.sP, targetChassisPitch, 130, 15, dt);
      springDamper(hound.sR, targetChassisRoll, 130, 15, dt);
      springDamper(hound.sL, 0, 110, 13, dt);
    }

    const idleBreathing = hound.alive ? Math.sin(hiveCtx.t * 1.7 + hound.phase) * 0.004 : 0;
    const bodyLocalX = hound.sL.x;
    const bodyLocalY = HOUND_RIG_SPEC.stand + hound.sY.x - hound.crouch + idleBreathing;
    const bodyPitch = hound.sP.x;
    const bodyRoll = hound.sR.x;

    skinnedMeshWrapper.group.rotation.y = hound.yaw;
    bones.body.position.set(bodyLocalX, bodyLocalY, 0);
    bones.body.rotation.set(bodyPitch, 0, bodyRoll);

    bones.turret.rotation.y = hound.tyaw;
    bones.gun.rotation.x = hound.tpitch - bodyPitch * 0.5;
    bones.head.rotation.set(hound.hpitch, hound.hyaw, 0);

    // 战术天线柔性摆动 (Antenna Whip Inertia)
    springDamper(hound.sA, clampValue(-accelDelta * 0.03 - bodyPitch, -0.6, 0.6), 60, 5, dt);
    springDamper(hound.sA2, clampValue(hound.yawRate * 0.12 - bodyRoll, -0.6, 0.6), 60, 5, dt);
    bones.antenna.rotation.set(hound.sA.x, 0, hound.sA2.x);

    // 肢体关节逆运动学变换矩阵解算 (Transform to Hip Local Space for IK)
    const cosPitch = Math.cos(bodyPitch);
    const sinPitch = Math.sin(bodyPitch);
    const cosRoll = Math.cos(bodyRoll);
    const sinRoll = Math.sin(bodyRoll);

    for (let i = 0; i < 4; i++) {
      const footPos = hound.feet[i].p;
      const worldDx = footPos.x - hound.pos.x;
      const worldDy = footPos.y + HOUND_RIG_SPEC.footR * 0.6 - hound.pos.y;
      const worldDz = footPos.z - hound.pos.z;

      // 投影至猎犬机体坐标系
      const localYawX = worldDx * cosY - worldDz * sinY - bodyLocalX;
      const localYawY = worldDy - bodyLocalY;
      const localYawZ = worldDx * sinY + worldDz * cosY;

      const pitchY = localYawY * cosPitch + localYawZ * sinPitch;
      const pitchZ = -localYawY * sinPitch + localYawZ * cosPitch;

      const hipLocalX = localYawX * cosRoll + pitchY * sinRoll;
      const hipLocalY = -localYawX * sinRoll + pitchY * cosRoll;
      const hipLocalZ = pitchZ;

      solveLegIK(
        ikAngles,
        hipLocalX - HOUND_RIG_SPEC.side[i] * HOUND_RIG_SPEC.hipX,
        hipLocalY - HOUND_RIG_SPEC.hipY,
        hipLocalZ - HOUND_RIG_SPEC.fore[i] * HOUND_RIG_SPEC.hipZ,
        HOUND_RIG_SPEC.side[i],
        HOUND_RIG_SPEC.l0,
        HOUND_RIG_SPEC.L1,
        HOUND_RIG_SPEC.L2 - HOUND_RIG_SPEC.footR * 0.6,
      );

      abdJoints[i].rotation.z = ikAngles.abd;
      thighJoints[i].rotation.x = ikAngles.hip;
      shinJoints[i].rotation.x = ikAngles.knee;
    }

    skinnedMeshWrapper.group.updateMatrixWorld(true);
    hound.headPos.setFromMatrixPosition(bones.head.matrixWorld);
  }

  /**
   * 猎犬死亡处理 (Hound Death Ragdoll, Sparks & Wreck Persistence)
   */
  function killHound(impulse) {
    hound.alive = false;
    hiveCtx.releaseToken(hound);
    hound.dieT = 0;
    hound.vy = 0;
    hound.es = "move";
    bones.beacon.scale.setScalar(1e-4);

    hound.dieRoll = (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.3);
    hound.diePitch = (rng() - 0.5) * 0.25;
    hound.sR.v += hound.dieRoll * 3.0;
    hound.sP.v += (rng() - 0.5) * 2.0;

    for (let i = 0; i < 4; i++) {
      const foot = hound.feet[i];
      if (hound.sw >= 0) foot.p.y = hound.pos.y;
      const side = HOUND_RIG_SPEC.side[i] * (0.16 + rng() * 0.2);
      const fore = HOUND_RIG_SPEC.fore[i] * (0.05 + rng() * 0.22) + (rng() - 0.5) * 0.1;
      const cosY = Math.cos(hound.yaw);
      const sinY = Math.sin(hound.yaw);
      foot.slide.set(side * cosY + fore * sinY, 0, -side * sinY + fore * cosY);
    }

    hound.sw = -1;
    hound.speed *= 0.3;

    footScratchPos.copy(hound.headPos);
    engineCtx.fx.sparks(footScratchPos, DOWN_DIR, 16);
    engineCtx.fx.debris(footScratchPos, { count: 4 });
    engineCtx.events.emit("enemy:killed", { enemy: hound, pos: hound.pos, type: "hound" });
    hiveCtx.addWreck(hound);
  }

  /**
   * 猎犬残骸倒塌与燃烧处理 (Dead Hound Ragdoll Decay & Settling)
   */
  function updateDeadHound(dt) {
    if (hound.sink > 0) {
      hound.sink += dt;
      hound.pos.y -= 0.22 * dt;
      if (hound.sink > 3.2) hiveCtx.retire(hound);
      return;
    }

    hound.dieT += dt;
    const timeSinceDeath = hound.dieT;

    if (timeSinceDeath < 2.2) {
      const groundFloorY = 0.215 - HOUND_RIG_SPEC.stand;
      hound.vy -= 9.8 * dt * (timeSinceDeath < 0.12 ? 0.3 : 1.0);
      hound.sY.x += hound.vy * dt;

      if (hound.sY.x < groundFloorY) {
        hound.sY.x = groundFloorY;
        if (hound.vy < -1.2) {
          engineCtx.events.emit("enemy:step", {
            pos: hound.pos,
            type: "hound",
            enemy: hound,
            speed: 5,
            crash: true,
          });
          engineCtx.fx.dust(hound.pos, DOWN_DIR);
        }
        hound.vy = -hound.vy * 0.22;
      }

      springDamper(hound.sP, hound.diePitch, 60, 9, dt);
      springDamper(hound.sR, hound.dieRoll, 60, 9, dt);
      springDamper(hound.sL, 0, 40, 8, dt);

      const frictionDecay = Math.exp(-3.2 * dt);
      for (let i = 0; i < 4; i++) {
        const foot = hound.feet[i];
        foot.p.x += foot.slide.x * (1 - frictionDecay);
        foot.p.z += foot.slide.z * (1 - frictionDecay);
        foot.slide.multiplyScalar(frictionDecay);
      }

      hound.pos.x += Math.sin(hound.yaw) * hound.speed * dt;
      hound.pos.z += Math.cos(hound.yaw) * hound.speed * dt;
      hound.speed *= Math.exp(-5 * dt);

      hound.hpitch += (0.55 - hound.hpitch) * (1 - Math.exp(-5 * dt));
      hound.hyaw += (hound.dieRoll - hound.hyaw) * (1 - Math.exp(-3 * dt));
      hound.tpitch += (0.3 - hound.tpitch) * (1 - Math.exp(-4 * dt));

      const deathFlicker =
        timeSinceDeath < 1.2
          ? Math.sin(timeSinceDeath * 60) > 0.2
            ? 1 - timeSinceDeath / 1.2
            : 0.05
          : 0.02;
      lensMat.color.setRGB(6 * deathFlicker + 0.05, 0.6 * deathFlicker + 0.01, 0.2 * deathFlicker);

      applyIKAndPose(dt);
    }

    if (timeSinceDeath < 6.5) {
      hound.smokeT -= dt;
      if (hound.smokeT <= 0) {
        hound.smokeT = timeSinceDeath < 2.0 ? 0.09 : 0.2;
        footScratchPos.set(
          hound.pos.x + (rng() - 0.5) * 0.4,
          hound.pos.y + 0.42,
          hound.pos.z + (rng() - 0.5) * 0.4,
        );
        engineCtx.fx.smoke(footScratchPos, {
          size: 0.5 + rng() * 0.3,
          life: 1.8,
          color: 0x17181b,
          rise: 1.1,
        });

        if (timeSinceDeath < 4.0 && rng() < 0.55) {
          tempSparkPos.set(rng() - 0.5, 1, rng() - 0.5).normalize();
          engineCtx.fx.sparks(footScratchPos, tempSparkPos, timeSinceDeath < 1.0 ? 8 : 3);
        }

        if (timeSinceDeath < 3.5 && rng() < 0.4) {
          engineCtx.fx.smoke(footScratchPos, {
            size: 0.22,
            life: 0.45,
            color: 0xff7b22,
            rise: 1.6,
          });
        }
      }
    } else if (!hound.wreck) {
      hound.wreck = true;
      if (hound.loop) {
        try {
          hound.loop.stop();
        } catch {}
        hound.loop = null;
      }
    }

    if (hound.loop) {
      hound.loop.setGain(Math.max(0, 0.4 - timeSinceDeath * 0.3));
    }
  }

  return hound;
}

const iM = createHound;

// ============================================================================
// 空间射线相交计算与碰撞检测几何算法 (Spatial Intersection & Math Routines)
// ============================================================================

/**
 * 射线与球体精确解析相交判定 (Ray-Sphere Analytic Intersection)
 * @param {THREE.Vector3} rayOrigin 射线起点
 * @param {THREE.Vector3} rayDir 归一化射线方向
 * @param {THREE.Vector3} sphereCenter 球心坐标
 * @param {number} sphereRadius 球体半径
 * @param {number} maxDist 射线最大检测距离
 * @param {object} outHit 命中结果输出载体
 * @returns {boolean} 是否发生有效相交
 */
function intersectRaySphere(rayOrigin, rayDir, sphereCenter, sphereRadius, maxDist, outHit) {
  const dx = rayOrigin.x - sphereCenter.x;
  const dy = rayOrigin.y - sphereCenter.y;
  const dz = rayOrigin.z - sphereCenter.z;

  const b = dx * rayDir.x + dy * rayDir.y + dz * rayDir.z;
  const c = dx * dx + dy * dy + dz * dz - sphereRadius * sphereRadius;
  const discriminant = b * b - c;

  if (discriminant < 0) return false;

  const hitDist = -b - Math.sqrt(discriminant);
  if (hitDist < 0 || hitDist > maxDist || hitDist >= outHit.dist) return false;

  outHit.dist = hitDist;
  outHit.point.copy(rayOrigin).addScaledVector(rayDir, hitDist);
  outHit.normal.copy(outHit.point).sub(sphereCenter).normalize();
  return true;
}

const sM = intersectRaySphere;

const vSegDelta = new W();
const vRayToSegStart = new W();
const vClosestOnSeg = new W();

/**
 * 射线与胶囊体精确相交判定 (Ray-Capsule Analytic Intersection)
 * 计算射线至线段轴线的最近点投影，转化为球体相交检测
 * @param {THREE.Vector3} rayOrigin
 * @param {THREE.Vector3} rayDir
 * @param {THREE.Vector3} segA 线段起点
 * @param {THREE.Vector3} segB 线段终点
 * @param {number} radius 胶囊体半径
 * @param {number} maxDist
 * @param {object} outHit
 * @returns {boolean}
 */
function intersectRayCapsule(rayOrigin, rayDir, segA, segB, radius, maxDist, outHit) {
  vSegDelta.copy(segB).sub(segA);
  vRayToSegStart.copy(rayOrigin).sub(segA);

  const segLengthSq = vSegDelta.dot(vSegDelta);
  const segDotRay = vSegDelta.dot(rayDir);
  const segDotOrigin = vSegDelta.dot(vRayToSegStart);
  const rayDotOrigin = rayDir.dot(vRayToSegStart);

  const denom = segLengthSq - segDotRay * segDotRay;
  let t = denom > 1e-8 ? (segDotOrigin - segDotRay * rayDotOrigin) / denom : 0;
  t = Math.max(0, Math.min(1, t));

  vClosestOnSeg.copy(segA).addScaledVector(vSegDelta, t);
  return intersectRaySphere(rayOrigin, rayDir, vClosestOnSeg, radius, maxDist, outHit);
}

const nM = intersectRayCapsule;

// ============================================================================
// 敌方单位 AI 行为决策与全局感知参数表 (AI Behavior & Combat Tuning)
// ============================================================================

const TUNE = {
  gull: Zv, // 机械飞鸥专属数值配置
  hound: Kv, // 机械猎犬专属数值配置
  sightRange: 45, // 基础视觉感知半径 (米)
  sightCone: 200, // 视野广角锥度 (度)
  loseSight: 4, // 脱离视线后维持交火目标倒计时 (秒)
  searchTime: 8, // 到达最后目击点后的搜寻时间 (秒)
  hearRadius: 45, // 枪声/爆炸声听觉警觉半径 (米)
  maxTokens: 2, // 默认并发射击许可令牌数 (防止多敌同时齐射集火秒杀玩家)
  maxTokensCrowd: 3, // 群体包围战况下的并发攻击令牌数
  tokenGap: 1.25, // 两次攻击令牌发放之间的最小硬冷却 (秒)
  exposureUp: 0.1, // 视线暴露值递增速率 (秒^-1)
  exposureDown: 0.45, // 脱离视线暴露值衰减速率
  poolGulls: 10, // 机械飞鸥对象池容量
  poolHounds: 8, // 机械猎犬对象池容量
  maxWrecks: 5, // 场景中保留的最大残骸数量
  maxBolts: 32, // 场景中飞行的等离子脉冲弹丸最大并发数
};

const Ui = TUNE;
const SIGHT_CONE_COS = Math.cos(((TUNE.sightCone / 2) * Math.PI) / 180);

// 临时计算变量
const vTemp1 = new W();
const vTemp2 = new W();
const vTempDir = new W();
const qTempRot = new Lt();
const mTempMatrix = new Ye();
const vUnitScale = new W(1, 1, 1);
const VEC_Z_FORWARD = new W(0, 0, 1);
const VEC_Y_DOWN = new W(0, -1, 0);
const vPlayerFeet = new W();
const vPlayerHead = new W();

/**
 * 创建敌方单位群落总管理器 (Enemies Hive Manager)
 * 统一调度机械飞鸥与猎犬的 AI 决策、并发攻击令牌、射线击中判定、等离子弹丸渲染与探照灯
 * @param {object} ctx 全局引擎上下文
 */
async function createEnemiesManager(ctx) {
  const rng = il(+((ctx.params && ctx.params.eseed) || 9001));
  const activeEnemies = [];
  const activeWrecks = [];

  const rootGroup = new wt();
  rootGroup.name = "enemies";
  ctx.scene.add(rootGroup);

  // 预热发光与装甲着色材质
  const whiteMat = ctx.mats.emissive(0xffffff, 1);
  const glowMat = whiteMat && whiteMat.isMeshBasicMaterial ? whiteMat.clone() : new Nn();
  glowMat.color.setRGB(1, 1, 1);
  glowMat.vertexColors = true;
  glowMat.needsUpdate = true;

  const orangeEmissive = ctx.mats.emissive(0xffa000, 6);
  const lensBaseMat =
    orangeEmissive && orangeEmissive.isMeshBasicMaterial
      ? orangeEmissive
      : new Nn({ color: 0xffa000 });

  const isToneMapped = whiteMat && whiteMat.toneMapped !== undefined ? whiteMat.toneMapped : true;

  const enemyMaterials = {
    shell: ctx.mats.get("armor_white", { triplanar: true, vertexColors: true }),
    metal: ctx.mats.get("gunmetal", { triplanar: true, vertexColors: true }),
    glow: glowMat,
    lensBase: lensBaseMat,
    disc: new Nn({
      color: 0x0c0c0f,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: Sn,
      toneMapped: isToneMapped,
    }),
    cone: new zn({
      uniforms: {
        uColor: { value: new Ve(1, 0.9, 0.74) },
        uGain: { value: 0.085 },
      },
      vertexShader: `
        #include <common>
        #include <skinning_pars_vertex>
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
          vN = normalMatrix * objectNormal; vV = -mv.xyz; vT = 1.0 - uv.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uGain;
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = abs(dot(normalize(vN), normalize(vV)));
          f = f * f * (3.0 - 2.0 * f);
          float t = clamp(vT, 0.0, 1.0);
          float k = pow(1.0 - t, 1.7) * (0.35 + 0.65 * smoothstep(0.0, 0.06, t));
          gl_FragColor = vec4(uColor * (uGain * f * k), 1.0);
        }`,
      transparent: true,
      blending: hr,
      depthWrite: false,
      side: Sn,
      fog: false,
    }),
  };

  // 群落共享运行时上下文
  const hiveContext = {
    G: ctx,
    rng,
    list: activeEnemies,
    t: 0,
    playerSpeed: 0,
    tokens: 0,
    tokenT: -9,
    lastType: "",
    wantT: { gull: -9, hound: -9 },
    mergeSimple: (geos) => sa(geos, false),

    /**
     * 申请射击/突袭许可令牌 (Token Management)
     * 控制同一时刻对玩家开火的敌人数，防止不可避伤害
     */
    requestToken(enemy) {
      if (enemy.hasToken) return true;
      let aliveCount = 0;
      for (const e of activeEnemies) if (e.alive) aliveCount++;

      const maxAllowed = aliveCount > 5 ? TUNE.maxTokensCrowd : TUNE.maxTokens;
      const timeSinceLastToken = hiveContext.t - hiveContext.tokenT;
      const otherType = enemy.type === "gull" ? "hound" : "gull";
      const isRepeatedTypeTooFast =
        hiveContext.lastType === enemy.type &&
        hiveContext.t - hiveContext.wantT[otherType] < 0.5 &&
        timeSinceLastToken < TUNE.tokenGap * 2.2;

      if (
        hiveContext.tokens >= maxAllowed ||
        timeSinceLastToken < TUNE.tokenGap ||
        isRepeatedTypeTooFast
      ) {
        hiveContext.wantT[enemy.type] = hiveContext.t;
        return false;
      }

      hiveContext.tokens++;
      hiveContext.tokenT = hiveContext.t;
      hiveContext.lastType = enemy.type;
      enemy.hasToken = true;
      return true;
    },

    releaseToken(enemy) {
      if (enemy.hasToken) {
        enemy.hasToken = false;
        hiveContext.tokens = Math.max(0, hiveContext.tokens - 1);
      }
    },

    /**
     * 敌方感知思考 (Line of Sight & State Transitions)
     */
    think(enemy, dt, seeThreshold) {
      const player = ctx.player;
      if (enemy.passive || !player) {
        enemy.los = false;
        return;
      }

      enemy.senseT -= dt;
      if (enemy.senseT <= 0) {
        enemy.senseT = 0.11 + rng() * 0.08;
        let canSee = false;

        if (player.alive !== false) {
          const eyePos = player.eye || player.pos;
          const dx = eyePos.x - enemy.sensor.x;
          const dy = eyePos.y - enemy.sensor.y;
          const dz = eyePos.z - enemy.sensor.z;
          const dist = Math.hypot(dx, dy, dz);

          if (dist < TUNE.sightRange) {
            const planarDist = Math.hypot(dx, dz) || 1e-4;
            const facingDot = (dx * enemy.fwd.x + dz * enemy.fwd.z) / planarDist;
            if (enemy.mode === "engage" || facingDot > SIGHT_CONE_COS || dist < 3.5) {
              canSee = ctx.physics.lineOfSight(enemy.sensor, eyePos);
            }
          }
        }
        enemy.los = canSee;
      }

      if (enemy.los) {
        enemy.seeT += dt;
        enemy.noSeeT = 0;
        enemy.lastKnown.copy(player.pos);
        enemy.exposure = Math.min(1, enemy.exposure + dt * TUNE.exposureUp);
      } else {
        enemy.noSeeT += dt;
        enemy.seeT = Math.max(0, enemy.seeT - dt * 0.6);
        enemy.exposure = Math.max(0, enemy.exposure - dt * TUNE.exposureDown);
      }

      if (enemy.mode === "engage") {
        if (enemy.noSeeT > TUNE.loseSight || player.alive === false) {
          enemy.mode = "search";
          enemy.modeT = TUNE.searchTime + rng() * 3;
          hiveContext.releaseToken(enemy);
        }
      } else if (
        enemy.los &&
        enemy.seeT > (enemy.mode === "patrol" ? seeThreshold : seeThreshold * 0.45)
      ) {
        enemy.mode = "engage";
        enemy.noSeeT = 0;
        ctx.events.emit("enemy:alert", { enemy });
        hiveContext.rally(enemy.pos, 18, player.pos, enemy);
      } else if (enemy.mode !== "patrol") {
        enemy.modeT -= dt;
        if (enemy.modeT <= 0) {
          enemy.mode = "patrol";
          enemy.home.x = enemy.pos.x;
          enemy.home.z = enemy.pos.z;
        }
      }
    },

    rally(origin, radius, targetPos, caller) {
      for (const e of activeEnemies) {
        if (e === caller || !e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > radius * radius) continue;
        e.lastKnown.copy(targetPos);
        e.mode = "investigate";
        e.modeT = 9 + rng() * 4;
      }
    },

    provoke(enemy) {
      const player = ctx.player;
      if (!player || enemy.passive || !enemy.alive) return;
      if (enemy.mode !== "engage") {
        enemy.lastKnown.copy(player.pos);
        enemy.mode = "investigate";
        enemy.modeT = 10;
        enemy.seeT = 1;
        enemy.senseT = 0;
      }
      hiveContext.rally(enemy.pos, 20, player.pos, enemy);
    },

    fireBolt(origin, dir) {
      let freeBolt = null;
      for (let i = 0; i < boltPool.length; i++) {
        if (!boltPool[i].on) {
          freeBolt = boltPool[i];
          break;
        }
      }
      if (freeBolt) {
        freeBolt.on = true;
        freeBolt.life = 1.3;
        freeBolt.pos.copy(origin);
        freeBolt.dir.copy(dir);
        freeBolt.from.copy(origin);
        freeBolt.len = 0;
      }
    },

    addWreck(enemy) {
      activeWrecks.push(enemy);
      while (activeWrecks.length > TUNE.maxWrecks) {
        const oldest = activeWrecks.shift();
        if (oldest.active) oldest.sink = 0.001;
      }
    },

    retire(enemy) {
      enemy._deactivate();
      const idxList = activeEnemies.indexOf(enemy);
      if (idxList >= 0) activeEnemies.splice(idxList, 1);
      const idxWreck = activeWrecks.indexOf(enemy);
      if (idxWreck >= 0) activeWrecks.splice(idxWreck, 1);
    },
  };

  // 预生成程序化 3D 骨架模型
  const gullRigDef = j_();
  const houndRigDef = Z_();

  // 初始化对象池
  const gullPool = [];
  const houndPool = [];

  for (let i = 0; i < TUNE.poolGulls; i++) {
    const gull = Q_(hiveContext, gullRigDef, enemyMaterials, i);
    gullPool.push(gull);
    rootGroup.add(gull.rig.group);
  }

  for (let i = 0; i < TUNE.poolHounds; i++) {
    const hound = iM(hiveContext, houndRigDef, enemyMaterials, i);
    houndPool.push(hound);
    rootGroup.add(hound.rig.group);
  }

  // 等离子脉冲弹丸对象池与 InstancedMesh 批量渲染
  const boltPool = [];
  for (let i = 0; i < TUNE.maxBolts; i++) {
    boltPool.push({
      on: false,
      life: 0,
      len: 0,
      pos: new W(),
      dir: new W(),
      from: new W(),
    });
  }

  const boltGeo = new Ys(0.016, 0.03, 1, 6, 1);
  boltGeo.rotateX(Math.PI / 2);
  boltGeo.translate(0, 0, -0.5);

  const boltEmissive = ctx.mats.emissive(0xff681a, 14);
  const boltMat =
    boltEmissive && boltEmissive.isMeshBasicMaterial
      ? boltEmissive
      : new Nn({ color: new Ve(0xff681a).multiplyScalar(14) });

  const boltInstancedMesh = new Sr(boltGeo, boltMat, TUNE.maxBolts);
  boltInstancedMesh.frustumCulled = false;
  boltInstancedMesh.castShadow = false;
  boltInstancedMesh.receiveShadow = false;
  boltInstancedMesh.count = 0;
  boltInstancedMesh.instanceMatrix.setUsage(bo);
  rootGroup.add(boltInstancedMesh);

  const impactEventData = {
    point: new W(),
    normal: new W(),
    dist: 0,
    surface: "concrete",
    enemy: null,
    part: null,
    dir: new W(),
    from: "enemy",
  };

  /**
   * 等离子弹丸每帧物理步进与碰撞判定
   */
  function updateBolts(dt) {
    const player = ctx.player;
    let visibleCount = 0;

    for (let i = 0; i < boltPool.length; i++) {
      const bolt = boltPool[i];
      if (!bolt.on) continue;

      const stepDist = TUNE.gull.boltSpeed * dt;
      bolt.life -= dt;

      // 场景射线检测
      const envHit = ctx.physics.raycast(bolt.pos, bolt.dir, stepDist);
      const effectiveDist = envHit ? envHit.dist : stepDist;

      let hitPlayer = false;
      if (player && player.alive !== false) {
        vTemp1.copy(bolt.pos).addScaledVector(bolt.dir, effectiveDist);
        vPlayerFeet.set(player.pos.x, player.pos.y + 0.35, player.pos.z);
        vPlayerHead.set(player.pos.x, player.pos.y + (player.crouching ? 1.0 : 1.5), player.pos.z);

        // 检测弹丸线段与玩家中轴线段最近距离
        if (segmentSegmentDistanceSq(bolt.pos, vTemp1, vPlayerFeet, vPlayerHead) < 0.36 * 0.36) {
          hitPlayer = true;
        }
      }

      if (hitPlayer) {
        player.damage(TUNE.gull.boltDamage, bolt.from);
        bolt.on = false;
        continue;
      }

      if (envHit) {
        impactEventData.point.copy(envHit.point);
        impactEventData.normal.copy(envHit.normal);
        impactEventData.dist = envHit.dist;
        impactEventData.surface = envHit.surface;
        impactEventData.dir.copy(bolt.dir);
        ctx.events.emit("impact", impactEventData);
        bolt.on = false;
        continue;
      }

      if (bolt.life <= 0) {
        bolt.on = false;
        continue;
      }

      bolt.pos.addScaledVector(bolt.dir, stepDist);
      bolt.len = Math.min(1.5, bolt.len + stepDist);

      qTempRot.setFromUnitVectors(VEC_Z_FORWARD, bolt.dir);
      vUnitScale.set(1, 1, Math.max(0.2, bolt.len));
      mTempMatrix.compose(bolt.pos, qTempRot, vUnitScale);
      boltInstancedMesh.setMatrixAt(visibleCount++, mTempMatrix);
    }

    if (visibleCount || boltInstancedMesh.count) {
      boltInstancedMesh.count = visibleCount;
      boltInstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // 飞鸥动态探照灯分配
  let spotlightHolder = null;
  let spotlightAcquired = false;
  let spotlightTimer = 0;
  const vSpotTarget = new W();
  let spotFactor = 0;

  function updateSearchlight(dt) {
    if (!spotlightAcquired) {
      spotlightAcquired = true;
      try {
        spotlightHolder =
          ctx.render && ctx.render.lightPool && ctx.render.lightPool.acquire
            ? ctx.render.lightPool.acquire()
            : null;
      } catch (e) {
        spotlightHolder = null;
      }
      if (spotlightHolder && spotlightHolder.light) {
        spotlightHolder.light.color.setRGB(1, 0.9, 0.75);
        spotlightHolder.light.distance = 9;
      }
    }

    if (!spotlightHolder || !spotlightHolder.light) return;

    let nearestGull = null;
    let minCamDistSq = 3600;
    const camPos = ctx.camera ? ctx.camera.position : null;

    for (const enemy of activeEnemies) {
      if (enemy.type !== "gull" || !enemy.alive) continue;
      const dSq = camPos ? enemy.pos.distanceToSquared(camPos) : 0;
      if (dSq < minCamDistSq) {
        minCamDistSq = dSq;
        nearestGull = enemy;
      }
    }

    let targetIntensity = 0;
    if (nearestGull) {
      spotlightTimer -= dt;
      if (spotlightTimer <= 0) {
        spotlightTimer = 0.1;
        const netYaw = nearestGull.yaw + nearestGull.gy;
        const cosPitch = Math.cos(nearestGull.gp);
        vTempDir
          .set(Math.sin(netYaw) * cosPitch, -Math.sin(nearestGull.gp), Math.cos(netYaw) * cosPitch)
          .normalize();
        const hit = ctx.physics.raycast(nearestGull.sensor, vTempDir, 14);
        vSpotTarget.copy(nearestGull.sensor).addScaledVector(vTempDir, (hit ? hit.dist : 8) - 0.6);
        spotFactor = hit ? 1 : 0.3;
      }
      targetIntensity = 26 * spotFactor;
      spotlightHolder.light.position.lerp(vSpotTarget, 1 - Math.exp(-12 * dt));
    }

    spotlightHolder.light.intensity +=
      (targetIntensity - spotlightHolder.light.intensity) * (1 - Math.exp(-8 * dt));
  }

  let nextEnemyId = 1;
  let gunshotAlertCooldown = 0;

  const enemiesManager = {
    list: activeEnemies,
    TUNE,

    /**
     * 生成敌方单位
     * @param {'gull'|'hound'} type
     * @param {THREE.Vector3} spawnPos
     * @param {object} [options]
     * @returns {object|null}
     */
    spawn(type, spawnPos, options = {}) {
      const pool = type === "gull" ? gullPool : type === "hound" ? houndPool : null;
      if (!pool) return null;

      let enemy = null;
      for (const candidate of pool) {
        if (!candidate.active) {
          enemy = candidate;
          break;
        }
      }

      // 猎犬超量时回收最旧残骸
      if (!enemy && type === "hound" && activeWrecks.length) {
        const recycled = activeWrecks[0];
        hiveContext.retire(recycled);
        enemy = recycled;
      }

      if (enemy) {
        enemy.id = nextEnemyId++;
        activeEnemies.push(enemy);
        enemy._activate(spawnPos, options);
        ctx.events.emit("enemy:spawn", { enemy });
        return enemy;
      }
      return null;
    },

    /**
     * 玩家射击对敌群的全局射线检测 (返回最近命中单位与受击部位)
     * @param {THREE.Vector3} origin
     * @param {THREE.Vector3} dir
     * @param {number} [maxRange=300]
     * @returns {object|null}
     */
    raycast(origin, dir, maxRange = 300) {
      let closestHit = null;

      for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        if (!enemy.alive) continue;

        const dx = enemy.pos.x - origin.x;
        const dy = enemy.pos.y + (enemy.type === "hound" ? 0.6 : 0) - origin.y;
        const dz = enemy.pos.z - origin.z;
        const proj = dx * dir.x + dy * dir.y + dz * dir.z;

        // 粗筛包围球剔除
        if (proj < -1.5 || proj > maxRange + 1.5) continue;
        if (dx * dx + dy * dy + dz * dz - proj * proj > 1.7) continue;

        if (!closestHit) {
          closestHit = {
            dist: Infinity,
            point: new W(),
            normal: new W(),
            enemy: null,
            part: "body",
          };
        }

        enemy._raycast(origin, dir, maxRange, closestHit);
      }

      return closestHit && closestHit.enemy ? closestHit : null;
    },

    aliveCount() {
      let count = 0;
      for (const e of activeEnemies) if (e.alive) count++;
      return count;
    },

    clear() {
      for (const g of gullPool) if (g.active) g._deactivate();
      for (const h of houndPool) if (h.active) h._deactivate();
      activeEnemies.length = 0;
      activeWrecks.length = 0;
      hiveContext.tokens = 0;
      for (const b of boltPool) b.on = false;
      boltInstancedMesh.count = 0;
      if (spotlightHolder && spotlightHolder.light) {
        spotlightHolder.light.intensity = 0;
      }
    },

    /**
     * 声音与警报大范围唤醒通知
     */
    alert(origin, radius = 40) {
      for (const e of activeEnemies) {
        if (!e.alive || e.passive || e.mode === "engage") continue;
        if (e.pos.distanceToSquared(origin) > radius * radius) continue;
        e.lastKnown.copy(origin);
        e.lastKnown.y = Math.max(0, origin.y - 1.6);
        if (e.mode === "patrol") {
          ctx.events.emit("enemy:alert", { enemy: e, noise: true });
        }
        e.mode = "investigate";
        e.modeT = 9 + rng() * 4;
      }
    },

    /**
     * 每帧动力学与 AI 状态机更新
     */
    update(dt) {
      if (dt <= 0) return;
      if (dt > 0.05) dt = 0.05;

      hiveContext.t += dt;
      gunshotAlertCooldown -= dt;

      const player = ctx.player;
      if (player) {
        const speed = player.vel ? Math.hypot(player.vel.x, player.vel.z) : player.speed || 0;
        hiveContext.playerSpeed += (speed - hiveContext.playerSpeed) * (1 - Math.exp(-6 * dt));
      }

      for (let i = activeEnemies.length - 1; i >= 0; i--) {
        activeEnemies[i]._update(dt);
      }

      updateBolts(dt);
      updateSearchlight(dt);
    },

    debug: {
      ctx: hiveContext,
      gulls: gullPool,
      hounds: houndPool,
      wrecks: activeWrecks,
      bolts: boltPool,
      mats: enemyMaterials,
      tris: {
        gull: gullRigDef.tris + gullRigDef.extra.tris,
        hound: houndRigDef.tris,
      },
    },
  };

  ctx.events.on("weapon:fire", (e) => {
    if (gunshotAlertCooldown > 0) return;
    gunshotAlertCooldown = 0.3;
    const origin = (e && (e.origin || e.muzzle)) || (ctx.player && ctx.player.pos);
    if (origin) {
      enemiesManager.alert(origin, TUNE.hearRadius);
    }
  });

  ctx.events.on("explosion", (e) => {
    if (e && e.pos) {
      enemiesManager.alert(e.pos, 30);
    }
  });

  ctx.events.on("game:state", (e) => {
    if (e && e.state === "title") {
      enemiesManager.clear();
    }
  });

  return enemiesManager;
}

const Em = createEnemiesManager;

// ============================================================================
// 空间线段与线段最近距离计算 (Segment-to-Segment Shortest Distance Squared)
// ============================================================================

const vSegA = new W();
const vSegB = new W();
const vSegOrig = new W();

function segmentSegmentDistanceSq(segA1, segA2, segB1, segB2) {
  vSegA.copy(segA2).sub(segA1);
  vSegB.copy(segB2).sub(segB1);
  vSegOrig.copy(segA1).sub(segB1);

  const lenSqA = vSegA.dot(vSegA);
  const lenSqB = vSegB.dot(vSegB);
  const dotBOrig = vSegB.dot(vSegOrig);

  let s, t;

  if (lenSqA <= 1e-9 && lenSqB <= 1e-9) {
    return vSegOrig.dot(vSegOrig);
  }

  if (lenSqA <= 1e-9) {
    s = 0;
    t = Math.min(1, Math.max(0, dotBOrig / lenSqB));
  } else {
    const dotAOrig = vSegA.dot(vSegOrig);
    if (lenSqB <= 1e-9) {
      t = 0;
      s = Math.min(1, Math.max(0, -dotAOrig / lenSqA));
    } else {
      const dotAB = vSegA.dot(vSegB);
      const denom = lenSqA * lenSqB - dotAB * dotAB;

      s =
        denom > 1e-9 ? Math.min(1, Math.max(0, (dotAB * dotBOrig - dotAOrig * lenSqB) / denom)) : 0;
      t = (dotAB * s + dotBOrig) / lenSqB;

      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -dotAOrig / lenSqA));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (dotAB - dotAOrig) / lenSqA));
      }
    }
  }

  const cx = vSegOrig.x + vSegA.x * s - vSegB.x * t;
  const cy = vSegOrig.y + vSegA.y * s - vSegB.y * t;
  const cz = vSegOrig.z + vSegA.z * s - vSegB.z * t;
  return cx * cx + cy * cy + cz * cz;
}

const HC = segmentSegmentDistanceSq;

// ============================================================================
// 敌机展台工坊检视模式 (?show=enemies)
// ============================================================================

/**
 * 展台/调试工作台检视模式控制器 (Enemy Showcase Studio Mode)
 * @param {object} ctx
 */
async function createShowcase(ctx) {
  const manager = await createEnemiesManager(ctx);
  ctx.enemies = manager;

  const mkVec = (x, y, z) => new W(x, y, z);
  const showMode = ctx.params.eshow || "both";

  let camPos = [3, 1.45, 3.9];
  let camTarget = [0.5, 0.95, 0];
  let warmupSeconds = 2.6;

  if (showMode === "gull") {
    manager.spawn("gull", mkVec(0, 1.6, 0), {
      passive: true,
      hover: 1.6,
      patrolRadius: 0.02,
      yaw: 0.7,
    });
    camPos = [1.25, 1.95, 1.45];
    camTarget = [0, 1.52, 0];
    warmupSeconds = 1.2;
  } else if (showMode === "hound") {
    manager.spawn("hound", mkVec(0, 0, 0), {
      passive: true,
      yaw: 0.9,
      patrolLine: [mkVec(1.6, 0, 1.3), mkVec(-1.6, 0, -1.3)],
    });
    camPos = [2.1, 1, 2.3];
    camTarget = [0.5, 0.62, 0.4];
    warmupSeconds = 1.25;
  } else if (showMode === "fight") {
    manager.spawn("hound", mkVec(-7, 0, -9), { state: "alert" });
    manager.spawn("hound", mkVec(8, 0, -7), { state: "alert" });
    manager.spawn("hound", mkVec(0, 0, -14), { state: "alert" });
    manager.spawn("gull", mkVec(-5, 6, -13), { state: "alert" });
    manager.spawn("gull", mkVec(9, 6, -11), { state: "alert" });
    camPos = [5, 2.6, 10];
    camTarget = [0, 2.2, -5];
    warmupSeconds = 7;
  } else if (showMode === "dead") {
    const hound = manager.spawn("hound", mkVec(0, 0, 0), { passive: true, yaw: 0.8 });
    const gull = manager.spawn("gull", mkVec(-1.6, 3.4, -0.5), {
      passive: true,
      hover: 3.4,
      patrolRadius: 0.02,
    });
    manager.spawn("hound", mkVec(2.2, 0, -1.6), {
      passive: true,
      yaw: -0.6,
      patrolLine: [mkVec(2.2, 0, -1.6), mkVec(3.4, 0, -3)],
    });

    for (let i = 0; i < 30; i++) manager.update(1 / 60);
    hound.damage(999, hound.pos, mkVec(0.6, 0, -0.8), "body");
    for (let i = 0; i < 110; i++) manager.update(1 / 60);
    gull.damage(999, gull.pos, mkVec(0, 0, 1), "body");

    camPos = [2.6, 1.3, 3.2];
    camTarget = [0, 0.5, 0];
    warmupSeconds = 0.42;
  } else {
    manager.spawn("gull", mkVec(-0.9, 2.2, -0.2), {
      passive: true,
      hover: 2.2,
      patrolRadius: 0.25,
      yaw: 0.5,
    });
    manager.spawn("hound", mkVec(0.2, 0, 0.6), {
      passive: true,
      yaw: 1.2,
      patrolLine: [mkVec(2.6, 0, 1.2), mkVec(-1.8, 0, 0.2)],
    });
  }

  if (ctx.params.epre != null) {
    warmupSeconds = +ctx.params.epre;
  }

  const warmupFrames = Math.round(warmupSeconds * 60);
  for (let i = 0; i < warmupFrames; i++) {
    manager.update(1 / 60);
  }

  const isFrozen = !!ctx.params.efreeze;

  return {
    cam: camPos,
    target: camTarget,
    update(dt) {
      if (!isFrozen) manager.update(dt);
    },
  };
}

const VC = createShowcase;

export const create = createEnemiesManager;
export const showcase = createShowcase;
export { TUNE, TUNE as Ui, createEnemiesManager as Em, createShowcase as VC, ex };
