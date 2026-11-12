// @ts-check
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

var Xv = {};
br(Xv, { create: () => dm, showcase: () => PC });
var im = (i, e, t) => {
    let n = Math.sin(i * 12.9898 + e * 78.233 + t * 37.719) * 43758.5453;
    return n - Math.floor(n);
  },
  cC = (i, e, t) => Math.max(Math.abs(i), Math.abs(e), Math.abs(t)) < 0.95,
  b_ = (i, e, t) => {
    let n = Math.abs(t);
    return n > 0.15 && n < 0.95;
  };
function sm(i, e, t = 0, n = null) {
  let s = i.attributes.position,
    o = i.attributes.normal,
    r = s.count,
    a = new Float32Array(r * 3);
  for (let l = 0; l < r; l++) {
    let c = s.getX(l),
      u = s.getY(l),
      h = s.getZ(l),
      f = 0.9 + 0.2 * im(Math.round(c * 70), Math.round(u * 70), Math.round(h * 70));
    if (t > 0 && n && n(o.getX(l), o.getY(l), o.getZ(l))) {
      let p = im(Math.round(c * 300), Math.round(u * 300), Math.round(h * 300));
      {
        let d = Math.max(0, p - 0.84) / 0.16;
        f *= 1 + t * 1.6 * d * d;
      }
    }
    ((a[l * 3] = e[0] * f), (a[l * 3 + 1] = e[1] * f), (a[l * 3 + 2] = e[2] * f));
  }
  return (i.setAttribute("color", new et(a, 3)), i);
}
var y_ = new In(),
  uC = new Ye();
function Rt(i, e, t, n, s, o, r, a, l = 0, c = null) {
  let u = Wi(i, e, t, n);
  return (
    sm(u, a, l, cC),
    c && (y_.set(c[0], c[1], c[2]), u.applyMatrix4(uC.makeRotationFromEuler(y_))),
    u.translate(s, o, -r),
    u
  );
}
function hC(i, e) {
  let t = new ji();
  if ((i.forEach((n, s) => (s ? t.lineTo(n[0], n[1]) : t.moveTo(n[0], n[1]))), t.closePath(), e))
    for (let n of e) t.holes.push(new or(n.map((s) => new Ae(s[0], s[1]))));
  return t;
}
function __(i, e, t, n) {
  return new rr(hC(i, n), {
    depth: Math.max(1e-4, e - 2 * t),
    bevelEnabled: t > 0,
    bevelThickness: t,
    bevelSize: t,
    bevelOffset: -t,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 6,
  });
}
function M_(i) {
  i.computeBoundingBox();
  let e = i.boundingBox.min.z,
    t = i.boundingBox.max.z,
    n = i.attributes.position,
    s = i.attributes.normal;
  for (let o = 0; o < n.count; o++) {
    let r = s.getZ(o),
      a = Math.abs(r);
    if (a < 0.15 || a > 0.95) continue;
    let l = n.getZ(o);
    if (Math.abs(l - e) < 1e-6 || Math.abs(l - t) < 1e-6) s.setXYZ(o, 0, 0, Math.sign(r));
    else {
      let c = Math.hypot(s.getX(o), s.getY(o)) || 1;
      s.setXYZ(o, s.getX(o) / c, s.getY(o) / c, 0);
    }
  }
  return i;
}
function xr(i, e, t, n, s, o = 0, r = null) {
  let a = __(i, t - e, n, r);
  return (sm(a, s, o, b_), M_(a), a.translate(0, 0, e + n), a.rotateY(Math.PI / 2), a);
}
function qo(i, e, t, n, s, o = 0, r = null) {
  let a = __(i, t - e, n, r);
  return (sm(a, s, o, b_), M_(a), a.translate(0, 0, -t + n), a);
}
function Cn(i, e, t, n = 0, s = 0, o = 0, r = null) {
  let a = [],
    l = [],
    c = [],
    u = [],
    h = 0;
  for (let p = 0; p < i.length - 1; p++) {
    let [d, v] = i[p],
      [g, x] = i[p + 1],
      y = g - d,
      b = x - v,
      m = Math.hypot(y, b);
    if (m < 1e-7) continue;
    let A = b / m,
      _ = -y / m,
      M = Math.abs(A) > 0.25 && Math.abs(_) > 0.25;
    for (let E = 0; E <= e; E++) {
      let w = (E / e) * Math.PI * 2,
        S = Math.cos(w),
        z = Math.sin(w);
      for (let H = 0; H < 2; H++) {
        let O = H ? g : d,
          q = H ? x : v,
          U = s + O * S,
          T = o + O * z,
          D = -q;
        (a.push(U, T, D), l.push(A * S, A * z, -_));
        let C = 0.9 + 0.2 * im(Math.round(q * 150), Math.round(w * 3), p);
        if (M && n > 0) {
          let j = im(E * 7.1, p * 3.3, q * 100);
          {
            let N = Math.max(0, j - 0.84) / 0.16;
            C *= 1 + n * 1.6 * N * N;
          }
        }
        let G = r ? r(O, q, t) : t;
        c.push(G[0] * C, G[1] * C, G[2] * C);
      }
    }
    for (let E = 0; E < e; E++) {
      let w = h + E * 2,
        S = w + 2,
        z = w + 1,
        H = w + 3;
      u.push(w, z, S, S, z, H);
    }
    h += (e + 1) * 2;
  }
  let f = new nt();
  return (
    f.setAttribute("position", new He(a, 3)),
    f.setAttribute("normal", new He(l, 3)),
    f.setAttribute("color", new He(c, 3)),
    f.setAttribute("uv", new He(new Float32Array((a.length / 3) * 2), 2)),
    f.setIndex(u),
    f
  );
}
function Fi(i, e, t, n, s, o, r = 12, a = 0) {
  let l = Math.min(i * 0.25, e * 0.25),
    c = e / 2,
    u = Cn(
      [
        [0, -c],
        [i - l, -c],
        [i, -c + l],
        [i, c - l],
        [i - l, c],
        [0, c],
      ],
      r,
      o,
      a,
    );
  return (u.rotateY(Math.PI / 2), u.translate(t, n, -s), u);
}
function Dv(i, e, t, n, s = 4) {
  let o = [],
    r = n / 2,
    a = t / 2 - r;
  for (let l = 0; l <= s; l++) {
    let c = -Math.PI / 2 + (l / s) * Math.PI;
    o.push([i + a + Math.cos(c) * r, e + Math.sin(c) * r]);
  }
  for (let l = 0; l <= s; l++) {
    let c = Math.PI / 2 + (l / s) * Math.PI;
    o.push([i - a + Math.cos(c) * r, e + Math.sin(c) * r]);
  }
  return o;
}
var fC = (i, e, t, n, s) => [
    [i + s, e],
    [t - s, e],
    [t, e + s],
    [t, n - s],
    [t - s, n],
    [i + s, n],
    [i, n - s],
    [i, e + s],
  ],
  mi = {
    name: "几猫九式突击步枪",
    muzzle: [0, 0, -0.531],
    eject: [0.023, 0.004, -0.028],
    sightY: 0.069,
    lensF: 0.0285,
    window: [
      [-0.016, 0.057],
      [0.016, 0.057],
      [0.016, 0.0772],
      [0.0122, 0.081],
      [-0.0122, 0.081],
      [-0.016, 0.0772],
    ],
    magPos: [0, -0.02, -0.0665],
    boltTravel: 0.062,
    railTop: 0.0435,
    grip: [0, -0.1, 0.073],
    handguard: [0, 0, -0.255],
    handguardR: 0.021,
    handlePos: [-0.026, 0.007, -0.078],
    squeeze: 0.86,
  };
function w_() {
  let i = [1, 1, 1],
    e = [1, 1, 1],
    t = [5.5, 5.5, 5.7],
    n = [0.4, 0.4, 0.42],
    s = [1, 1, 1],
    o = [0.022, 0.022, 0.023],
    r = [],
    a = [],
    l = [],
    c = [],
    u = [],
    h = [],
    f = [],
    p = 9,
    d = 5,
    v = 0.6,
    g = [
      [-0.1, -0.02],
      [0.1, -0.02],
      [0.1, 0.027],
      [0.093, 0.034],
      [-0.088, 0.034],
      [-0.1, 0.024],
    ];
  (r.push(xr(g, 0, 0.0205, 0.0014, i, p, [fC(-0.012, -0.01, 0.06, 0.012, 0.003)])),
    r.push(xr(g, -0.0205, 0, 0.0014, i, p, [Dv(0.032, 0.007, 0.112, 0.0075, 4)])),
    a.push(Rt(0.004, 0.036, 0.19, 5e-4, -0.0135, 0.006, 0, n)),
    a.push(Rt(0.004, 0.012, 0.19, 5e-4, 0.0145, 0.022, 0, n)),
    a.push(Rt(0.004, 0.008, 0.19, 5e-4, 0.0145, -0.014, 0, n)),
    a.push(
      Cn(
        [
          [0, 0.058],
          [0.0128, 0.058],
          [0.0128, 0.099],
          [0, 0.099],
        ],
        16,
        [0.8, 0.8, 0.82],
      ),
    ),
    r.push(Rt(0.009, 0.02, 0.018, 0.003, 0.0225, 0.004, -0.026, i, p, [0, -0.35, 0])),
    r.push(
      Cn(
        [
          [0, -0.086],
          [0.0062, -0.086],
          [0.0072, -0.084],
          [0.0072, -0.06],
          [0.0045, -0.057],
          [0, -0.057],
        ],
        12,
        i,
        p,
        0.0215,
        0.012,
      ),
    ),
    a.push(
      Cn(
        [
          [0, -0.094],
          [0.0048, -0.094],
          [0.0055, -0.092],
          [0.0055, -0.086],
          [0, -0.086],
        ],
        12,
        t,
        0,
        0.0215,
        0.012,
      ),
    ),
    r.push(Rt(0.004, 0.012, 0.05, 0.0015, -0.0212, -0.006, -0.055, i, p)),
    r.push(Rt(0.004, 0.006, 0.15, 0.0015, -0.0212, 0.0215, 0.012, i, p)),
    r.push(Rt(0.003, 0.01, 0.03, 0.001, 0.0212, 0.022, 0.075, i, p)),
    r.push(
      qo(
        [
          [-0.0078, 0.0335],
          [0.0078, 0.0335],
          [0.0106, 0.0402],
          [-0.0106, 0.0402],
        ],
        -0.096,
        0.397,
        5e-4,
        i,
        0,
      ),
    ));
  let x = [
    [-0.0102, 0.0398],
    [0.0102, 0.0398],
    [0.0106, 0.0408],
    [0.0084, 0.0435],
    [-0.0084, 0.0435],
    [-0.0106, 0.0408],
  ];
  for (let F = 0; F < 49; F++) {
    let X = -0.094 + F * 0.01;
    r.push(qo(x, X, X + 0.0048, 8e-4, i, p));
  }
  let y = [
    [-0.1, -0.021],
    [0.099, -0.021],
    [0.101, -0.03],
    [0.098, -0.088],
    [0.036, -0.082],
    [0.031, -0.058],
    [-0.03, -0.058],
    [-0.04, -0.066],
    [-0.078, -0.055],
    [-0.1, -0.044],
  ];
  (l.push(xr(y, -0.019, 0.019, 0.0014, s, v)),
    l.push(Rt(0.043, 0.01, 0.066, 0.002, 0, -0.0835, 0.0668, s, v, [-0.095, 0, 0])),
    l.push(Rt(0.0405, 0.052, 0.005, 8e-4, 0, -0.052, 0.0975, s, v)),
    l.push(Rt(0.0405, 0.04, 0.005, 8e-4, 0, -0.048, 0.0345, s, v)),
    a.push(Fi(0.0038, 0.0396, 0, -0.031, -0.086, t, 12)),
    a.push(Fi(0.0038, 0.0396, 0, -0.029, 0.087, t, 12)),
    a.push(Fi(0.0022, 0.0392, 0, -0.04, -0.012, t, 8)),
    a.push(Fi(0.0022, 0.0392, 0, -0.032, -0.032, t, 8)));
  for (let F of [-1, 1])
    (a.push(Fi(0.0068, 0.004, F * 0.0205, -0.036, -0.048, e, 14, d)),
      a.push(Rt(0.004, 0.006, 0.024, 0.0015, F * 0.0228, -0.036, -0.036, e, d, [0.5, 0, 0])));
  a.push(Rt(0.0045, 0.024, 0.013, 0.0015, -0.0212, -0.03, 0.022, e, d));
  for (let F = 0; F < 4; F++)
    a.push(Rt(0.0012, 0.002, 0.012, 5e-4, -0.0238, -0.021 - F * 0.0045, 0.022, e, d));
  (a.push(Fi(0.0058, 0.005, 0.0205, -0.042, 0.016, e, 12, d)),
    l.push(Rt(0.004, 0.004, 0.026, 8e-4, 0.0205, -0.051, 0.016, s, v)),
    l.push(Rt(0.004, 0.02, 0.004, 8e-4, 0.0205, -0.043, 0.027, s, v)),
    l.push(
      xr(
        [
          [0.033, -0.056],
          [0.033, -0.093],
          [0.024, -0.1005],
          [-0.031, -0.1005],
          [-0.041, -0.09],
          [-0.041, -0.06],
        ],
        -0.0085,
        0.0085,
        8e-4,
        s,
        v,
        [
          [
            [0.028, -0.059],
            [0.028, -0.091],
            [0.022, -0.096],
            [-0.029, -0.096],
            [-0.036, -0.088],
            [-0.036, -0.061],
          ],
        ],
      ),
    ),
    a.push(
      xr(
        [
          [-0.006, -0.057],
          [0.004, -0.057],
          [0.003, -0.069],
          [0.0065, -0.079],
          [0.01, -0.086],
          [0.0065, -0.088],
          [0.001, -0.081],
          [-0.004, -0.07],
        ],
        -0.0032,
        0.0032,
        8e-4,
        t,
        0,
      ),
    ),
    l.push(
      xr(
        [
          [-0.038, -0.05],
          [-0.045, -0.074],
          [-0.049, -0.086],
          [-0.049, -0.1],
          [-0.054, -0.112],
          [-0.057, -0.13],
          [-0.064, -0.158],
          [-0.11, -0.152],
          [-0.102, -0.112],
          [-0.096, -0.082],
          [-0.095, -0.064],
          [-0.103, -0.046],
          [-0.08, -0.044],
        ],
        -0.0165,
        0.0165,
        0.005,
        s,
        v,
      ),
    ));
  for (let F = 0; F < 9; F++) {
    let X = -0.078 - F * 0.0082,
      ne = -0.073 + (X + 0.078) * 0.26;
    l.push(Rt(0.0345, 0.0028, 0.03, 0.001, 0, X, ne, s, v, [-0.25, 0, 0]));
  }
  for (let F = 0; F < 7; F++) {
    let X = -0.078 - F * 0.01,
      ne = -0.098 + (X + 0.078) * 0.14;
    l.push(Rt(0.022, 0.0045, 0.006, 0.0015, 0, X, ne, s, v, [-0.14, 0, 0]));
  }
  (l.push(Rt(0.035, 0.006, 0.05, 0.002, 0, -0.157, -0.087, s, v, [0.13, 0, 0])),
    a.push(Fi(0.003, 0.034, 0, -0.15, -0.085, t, 8)));
  let b = mi.handguardR,
    m = 0.00885,
    A = 0.0028,
    _ = 0.101,
    M = 0.398,
    E = [
      [_, -m],
      [M, -m],
      [M, m],
      [_, m],
    ];
  for (let F = 0; F < 8; F++) {
    let X = [];
    if (F === 0 || F === 4 || F === 6)
      for (let $ = 0; $ < 6; $++) X.push(Dv(0.13 + $ * 0.047, 0, 0.032, 0.007, 4));
    else if (F !== 2)
      for (let $ = 0; $ < 10; $++) {
        let ue = 0.124 + $ * 0.027;
        (F === 3 && ue > 0.3) || X.push(Dv(ue, 0, 0.013, 0.0052, 3));
      }
    let ne = xr(E, b - A, b, 9e-4, i, p, X);
    (ne.rotateZ((F * Math.PI) / 4), r.push(ne));
    let re = ((F + 0.5) * Math.PI) / 4;
    r.push(
      Cn(
        [
          [0, _],
          [0.003, _],
          [0.003, M],
          [0, M],
        ],
        8,
        i,
        0,
        Math.cos(re) * 0.0197,
        Math.sin(re) * 0.0197,
      ),
    );
  }
  (r.push(
    qo(
      [
        [-0.0088, 0.02],
        [0.0088, 0.02],
        [0.0106, 0.029],
        [0.0082, 0.0338],
        [-0.0082, 0.0338],
        [-0.0106, 0.029],
      ],
      0.1012,
      0.3978,
      0.0012,
      i,
      p,
    ),
  ),
    r.push(
      Cn(
        [
          [0.016, 0.096],
          [0.0238, 0.096],
          [0.0243, 0.0966],
          [0.0243, 0.106],
          [0.0232, 0.1075],
          [0.016, 0.1075],
        ],
        24,
        i,
        p,
      ),
    ),
    r.push(
      Cn(
        [
          [0.018, 0.3985],
          [0.0224, 0.3985],
          [0.0224, 0.4003],
          [0.0218, 0.401],
          [0.018, 0.401],
          [0.018, 0.3985],
        ],
        8,
        i,
        p,
      ),
    ));
  for (let F of [-1, 1])
    for (let X of [0.112, 0.126]) a.push(Fi(0.0024, 0.0024, F * 0.0212, -0.004, X, t, 10));
  for (let F of [0.115, 0.215, 0.3, 0.385])
    for (let X of [-1, 1])
      a.push(
        Cn(
          [
            [0, -8e-4],
            [0.0017, -8e-4],
            [0.002, -4e-4],
            [0.002, 6e-4],
            [0, 6e-4],
          ],
          8,
          t,
          0,
          0,
          0,
        )
          .rotateX(Math.PI / 2)
          .translate(X * 0.0098, 0.0312, -F),
      );
  {
    let X = [
      qo(
        [
          [-0.0078, 0.0206],
          [0.0078, 0.0206],
          [0.0106, 0.0242],
          [-0.0106, 0.0242],
        ],
        0.318,
        0.396,
        5e-4,
        i,
        0,
      ),
    ];
    for (let ne = 0; ne < 8; ne++) {
      let re = 0.319 + ne * 0.01;
      X.push(
        qo(
          x.map(($) => [$[0], $[1] - 0.016]),
          re,
          re + 0.0048,
          5e-4,
          i,
          p,
        ),
      );
    }
    for (let ne of X) (ne.rotateZ(Math.PI / 4), r.push(ne));
  }
  {
    let F = [];
    for (let X = 0; X < 4; X++) {
      let ne = 0.352 + X * 0.01;
      F.push(
        qo(
          x.map((re) => [re[0], re[1] - 0.016]),
          ne,
          ne + 0.0048,
          5e-4,
          i,
          p,
        ),
      );
    }
    F.push(
      qo(
        [
          [-0.0078, 0.0206],
          [0.0078, 0.0206],
          [0.0106, 0.0242],
          [-0.0106, 0.0242],
        ],
        0.35,
        0.392,
        5e-4,
        i,
        0,
      ),
    );
    for (let X of F) (X.rotateZ(Math.PI), r.push(X));
  }
  (l.push(
    xr(
      [
        [0.35, -0.026],
        [0.392, -0.026],
        [0.388, -0.036],
        [0.372, -0.05],
        [0.362, -0.05],
        [0.354, -0.036],
      ],
      -0.011,
      0.011,
      0.003,
      s,
      v,
    ),
  ),
    l.push(
      xr(
        [
          [0.2395, -0.0215],
          [0.2725, -0.0215],
          [0.2725, -0.03],
          [0.27, -0.092],
          [0.2665, -0.0965],
          [0.2455, -0.0975],
          [0.242, -0.093],
          [0.2395, -0.03],
        ],
        -0.014,
        0.014,
        0.0045,
        s,
        v,
      ),
    ));
  for (let F = 0; F < 6; F++)
    l.push(Rt(0.0292, 0.0022, 0.0315, 8e-4, 0, -0.04 - F * 0.0085, 0.256 - F * 3e-4, s, v));
  (l.push(Rt(0.03, 0.005, 0.04, 0.0015, 0, -0.024, 0.256, s, v)),
    a.push(Fi(0.003, 0.031, 0, -0.025, 0.256, t, 10)),
    a.push(
      Cn(
        [
          [0.0115, 0.095],
          [0.0115, 0.15],
          [0.0095, 0.153],
          [0.0095, 0.285],
          [0.009, 0.288],
          [0.009, 0.322],
          [0.0086, 0.326],
          [0.0086, 0.435],
          [0.0092, 0.437],
          [0.0092, 0.453],
          [0.0075, 0.455],
          [0.0075, 0.461],
        ],
        20,
        e,
        d,
      ),
    ),
    a.push(
      Cn(
        [
          [0.0092, 0.286],
          [0.0135, 0.286],
          [0.0142, 0.2875],
          [0.0142, 0.3165],
          [0.0135, 0.318],
          [0.0092, 0.318],
        ],
        16,
        e,
        d,
      ),
    ),
    a.push(Rt(0.014, 0.009, 0.03, 0.002, 0, 0.0145, 0.302, e, d)),
    a.push(
      Cn(
        [
          [0, 0.1],
          [0.0026, 0.1],
          [0.0026, 0.3],
          [0, 0.3],
        ],
        8,
        t,
        0,
        0,
        0.0172,
      ),
    ),
    a.push(Fi(0.002, 0.0145, 0, 0.012, 0.308, t, 6)),
    a.push(
      Cn(
        [
          [0.0075, 0.459],
          [0.0108, 0.459],
          [0.0116, 0.4605],
          [0.0116, 0.477],
          [0.011, 0.478],
          [0.0052, 0.478],
        ],
        20,
        e,
        d,
      ),
    ),
    a.push(
      Cn(
        [
          [0.0052, 0.477],
          [0.0052, 0.517],
        ],
        12,
        n,
      ),
    ));
  for (let F of [0.4865, 0.4965, 0.5065])
    a.push(
      Cn(
        [
          [0.0052, F - 0.0019],
          [0.011, F - 0.0019],
          [0.0116, F - 0.0012],
          [0.0116, F + 0.0012],
          [0.011, F + 0.0019],
          [0.0052, F + 0.0019],
        ],
        20,
        e,
        d,
      ),
    );
  a.push(
    Cn(
      [
        [0.0052, 0.5145],
        [0.011, 0.5145],
        [0.0116, 0.5155],
        [0.0116, 0.527],
        [0.0102, 0.5305],
        [0.0048, 0.5305],
        [0.0036, 0.526],
        [0.0036, 0.495],
      ],
      20,
      e,
      d,
      0,
      0,
      (F, X, ne) => (F < 0.0047 ? [0.25, 0.25, 0.25] : ne),
    ),
  );
  for (let F of [-1, 1]) a.push(Rt(0.0125, 0.0042, 0.042, 0.0012, 0, F * 0.0096, 0.496, e, d));
  for (let F = 0; F < 3; F++) a.push(Fi(0.0016, 0.0236, 0, 0, 0.4675 + F * 0.0035, n, 6));
  (r.push(
    Cn(
      [
        [0, -0.292],
        [0.0142, -0.292],
        [0.0148, -0.2905],
        [0.0148, -0.1],
      ],
      20,
      i,
      p,
    ),
  ),
    r.push(
      Cn(
        [
          [0.0148, -0.122],
          [0.0185, -0.122],
          [0.0195, -0.1205],
          [0.0195, -0.1115],
          [0.0185, -0.11],
          [0.0148, -0.11],
        ],
        12,
        i,
        p * 1.5,
      ),
    ));
  {
    let F = [
        [-0.019, -0.024],
        [0.019, -0.024],
        [0.021, -0.018],
        [0.021, 0.018],
        [0.016, 0.024],
        [-0.016, 0.024],
        [-0.021, 0.018],
        [-0.021, 0.006],
        [-0.036, 0.004],
        [-0.04, -0.002],
        [-0.04, -0.014],
        [-0.034, -0.02],
        [-0.021, -0.02],
      ],
      X = [
        [-0.025, -0.014],
        [-0.025, -0.002],
        [-0.033, -5e-4],
        [-0.036, -0.004],
        [-0.036, -0.012],
        [-0.032, -0.016],
      ];
    a.push(qo(F, -0.1095, -0.1045, 8e-4, [1.6, 1.6, 1.65], d, [X]));
  }
  (l.push(
    xr(
      [
        [-0.146, 0.024],
        [-0.3, 0.024],
        [-0.331, 0.014],
        [-0.334, -0.086],
        [-0.318, -0.101],
        [-0.29, -0.096],
        [-0.232, -0.04],
        [-0.146, -0.024],
      ],
      -0.019,
      0.019,
      0.004,
      s,
      v,
      [
        [
          [-0.262, -0.036],
          [-0.306, -0.036],
          [-0.306, -0.074],
          [-0.292, -0.074],
        ],
      ],
    ),
  ),
    l.push(Rt(0.033, 0.016, 0.118, 0.006, 0, 0.031, -0.232, s, v)));
  for (let F of [-0.196, -0.268]) a.push(Fi(0.0032, 0.035, 0, 0.03, F, t, 8));
  (l.push(Rt(0.012, 0.012, 0.04, 0.003, 0, -0.033, -0.19, s, v, [0.2, 0, 0])),
    f.push(Rt(0.037, 0.12, 0.011, 0.004, 0, -0.04, -0.3395, o, 0)));
  for (let F = 0; F < 9; F++)
    f.push(Rt(0.031, 0.004, 0.003, 0.001, 0, 0.004 - F * 0.011, -0.3455, o, 0));
  for (let F of [-1, 1]) a.push(Fi(0.0065, 0.003, F * 0.0195, -0.06, -0.318, t, 12));
  let w = mi.sightY,
    S = mi.window,
    z = [0.012, 0.012, 0.013];
  (r.push(Rt(0.03, 0.0092, 0.04, 0.0016, 0, 0.048, 0.021, i, p)),
    r.push(Rt(0.0045, 0.0085, 0.034, 0.001, -0.0162, 0.0452, 0.021, i, p)));
  for (let F of [0.009, 0.033])
    (a.push(Fi(0.004, 0.0042, -0.02, 0.0452, F, t, 6)),
      a.push(Fi(0.003, 0.0022, 0.016, 0.0452, F, t, 10)));
  let H = [
    [-0.0192, 0.0525],
    [0.0192, 0.0525],
    [0.0192, 0.0788],
    [0.0138, 0.0842],
    [-0.0138, 0.0842],
    [-0.0192, 0.0788],
  ];
  (r.push(qo(H, 0.008, 0.034, 0.001, i, p, [S])),
    f.push(
      qo(
        S.map((F) => [F[0] * 1.004, (F[1] - w) * 1.004 + w]),
        0.0078,
        0.0342,
        0,
        z,
        0,
        [S.map((F) => [F[0] * 0.982, (F[1] - w) * 0.982 + w])],
      ),
    ));
  let O = [
    [-0.0204, 0.06],
    [-0.0204, 0.0792],
    [-0.0143, 0.0854],
    [0.0143, 0.0854],
    [0.0204, 0.0792],
    [0.0204, 0.06],
    [0.0193, 0.06],
    [0.0193, 0.0788],
    [0.0138, 0.0843],
    [-0.0138, 0.0843],
    [-0.0193, 0.0788],
    [-0.0193, 0.06],
  ];
  (r.push(qo(O, 0.029, 0.038, 3e-4, i, p)),
    a.push(
      Cn(
        [
          [0, -0.006],
          [0.0052, -0.006],
          [0.0058, -0.0054],
          [0.0058, 0.0036],
          [0.0052, 0.0042],
          [0, 0.0042],
        ],
        14,
        e,
        d,
        0,
        0,
      )
        .rotateY(Math.PI / 2)
        .translate(0.0222, 0.0625, -0.021),
    ));
  for (let F of [0.0165, 0.0245]) f.push(Rt(0.0022, 0.0055, 0.0055, 9e-4, -0.0196, 0.064, F, o, 0));
  for (let F of [0.012, 0.03])
    for (let X of [-1, 1]) a.push(Fi(0.0016, 0.0012, X * 0.0195, 0.0555, F, t, 8));
  f.push(Rt(0.009, 0.0026, 0.006, 6e-4, 0, 0.058, 0.0115, z));
  for (let [F, X] of [
    [0.0128, 0.0548],
    [-0.0128, 0.0548],
  ])
    a.push(
      Cn(
        [
          [0, -6e-4],
          [0.0019, -6e-4],
          [0.0022, -2e-4],
          [0.0022, 7e-4],
          [0, 7e-4],
        ],
        10,
        t,
        0,
        F,
        X,
      )
        .translate(0, 0, -0.008 + 1e-4)
        .rotateY(0),
    );
  (a.push(
    Cn(
      [
        [0, -0.001],
        [0.0026, -0.001],
        [0.003, -5e-4],
        [0.003, 0.0012],
        [0, 0.0012],
      ],
      12,
      t,
      0,
      0,
      0,
    )
      .rotateX(Math.PI / 2)
      .translate(0.009, 0.0842, -0.014),
  ),
    f.push(Rt(0.0012, 2e-4, 0.0044, 5e-5, 0.009, 0.0855, 0.014, z)),
    f.push(qo(S, 0.0304, 0.0318, 0, z, 0, [S.map((F) => [F[0] * 0.955, (F[1] - w) * 0.955 + w])])));
  for (let [F, X] of [
    [-0.03, 1],
    [0.372, -1],
  ])
    (a.push(Rt(0.021, 0.0075, 0.03, 0.0015, 0, 0.0472, F, e, d)),
      a.push(Rt(0.0125, 0.004, 0.036, 0.001, 0, 0.0527, F + X * 0.004, e, d)),
      a.push(Fi(0.0028, 0.024, 0, 0.0505, F - X * 0.013, e, 8)),
      a.push(Rt(0.004, 0.006, 0.006, 0.001, X * 0.0125, 0.0475, F, e, d)),
      a.push(Fi(0.0042, 0.0045, -0.0125, 0.0475, F + 0.006, t, 8)));
  (a.push(
    Cn(
      [
        [0.0016, -0.0012],
        [0.0034, -0.0012],
        [0.0038, -8e-4],
        [0.0038, 8e-4],
        [0.0034, 0.0012],
        [0.0016, 0.0012],
        [0.0016, -0.0012],
      ],
      12,
      e,
      d,
      0,
      0,
    )
      .rotateX(Math.PI / 2)
      .translate(0, 0.0553, 0.016),
  ),
    a.push(Fi(0.0048, 0.005, 0.015, 0.049, -0.036, e, 12, d)));
  for (let F = 0; F < 6; F++)
    a.push(
      Rt(
        0.0044,
        0.001,
        0.001,
        3e-4,
        0.015,
        0.049 + Math.sin(F * 1.047) * 0.0046,
        -0.036 + Math.cos(F * 1.047) * 0.0046,
        e,
        d,
      ),
    );
  (r.push(Rt(0.016, 0.005, 0.02, 0.0012, 0, 0.0355, -0.098, i, p)),
    a.push(Rt(0.01, 0.003, 0.008, 8e-4, 0, 0.0392, -0.0985, e, d)));
  for (let F = 0; F < 4; F++)
    a.push(Rt(0.0092, 8e-4, 0.001, 3e-4, 0, 0.0409, -0.0958 - F * 0.0018, e, d));
  let q = -0.0267,
    U = 0.0267;
  (a.push(
    Cn(
      [
        [0, 0.308],
        [0.0095, 0.308],
        [0.0108, 0.3095],
        [0.0108, 0.322],
        [0.0118, 0.323],
        [0.0118, 0.378],
        [0.0128, 0.38],
        [0.0142, 0.382],
        [0.0142, 0.404],
        [0.0136, 0.406],
        [0.0142, 0.408],
        [0.0142, 0.412],
        [0.0128, 0.4135],
        [0.0118, 0.4135],
        [0.0112, 0.409],
      ],
      18,
      e,
      d,
      q,
      U,
    ),
  ),
    a.push(
      Cn(
        [
          [0.0112, 0.409],
          [0, 0.409],
        ],
        18,
        [0.35, 0.4, 0.45],
        0,
        q,
        U,
      ),
    ));
  for (let F = 0; F < 5; F++)
    a.push(
      Cn(
        [
          [0.0118, 0.33 + F * 0.008],
          [0.0124, 0.3305 + F * 0.008],
          [0.0124, 0.3335 + F * 0.008],
          [0.0118, 0.334 + F * 0.008],
        ],
        18,
        e,
        d,
        q,
        U,
      ),
    );
  {
    let F = Rt(0.02, 0.008, 0.04, 0.0012, 0, 0.028, 0.352, e, d);
    (F.rotateZ(Math.PI / 4), a.push(F));
  }
  {
    let F = Fi(0.004, 0.006, 0.0135, 0.028, 0.352, t, 8);
    (F.rotateZ(Math.PI / 4), a.push(F));
  }
  f.push(Rt(0.0185, 0.0065, 0.07, 0.0025, 0, 0.0468, 0.214, o, 0));
  for (let F = 0; F < 6; F++)
    f.push(Rt(0.014, 0.0012, 0.004, 5e-4, 0, 0.0503, 0.192 + F * 0.009, o, 0));
  let T = Fn(
    [
      [q, U, -0.308],
      [q - 0.001, U + 0.002, -0.296],
      [-0.0265, 0.0235, -0.284],
      [-0.0255, 0.0215, -0.272],
      [-0.0235, 0.027, -0.262],
      [-0.016, 0.04, -0.256],
      [-0.007, 0.0465, -0.252],
      [-0.002, 0.047, -0.247],
    ],
    0.0018,
    6,
  );
  (sm(T, o, 0), f.push(T));
  for (let F of [
    [-0.0262, 0.0228, 0.28],
    [-0.0242, 0.0255, 0.265],
  ]) {
    let X = Rt(0.0065, 0.0026, 0.0035, 8e-4, 0, 0, 0, [0.03, 0.03, 0.03], 0);
    (X.rotateZ(Math.PI / 4), X.translate(F[0], F[1], -F[2]), f.push(X));
  }
  c.push(
    Cn(
      [
        [0, -0.058],
        [0.0118, -0.058],
        [0.0124, -0.057],
        [0.0124, -0.01],
        [0.0116, -0.008],
        [0.0116, -0.002],
        [0.0124, 0],
        [0.0124, 0.046],
        [0.0105, 0.048],
        [0.0105, 0.056],
        [0.0062, 0.056],
        [0.0062, 0.06],
        [0, 0.06],
      ],
      16,
      [7, 7, 7.2],
      0,
      0,
      0.001,
    ),
  );
  for (let F = 0; F < 5; F++)
    c.push(Rt(0.0015, 0.008, 0.003, 5e-4, 0.0122, 0.001, 0.01 + F * 0.007, [1.2, 1.2, 1.2], 0));
  c.push(Rt(0.012, 0.0055, 0.014, 0.0015, -0.0165, 0.007, 0.078, e, d));
  {
    let F = Cn(
      [
        [0, -0.009],
        [0.0045, -0.009],
        [0.0056, -0.0078],
        [0.0056, -0.003],
        [0.0048, -0.002],
        [0.0048, 0.002],
        [0.0056, 0.003],
        [0.0056, 0.0078],
        [0.0045, 0.009],
        [0, 0.009],
      ],
      12,
      e,
      d,
    );
    (F.rotateY(Math.PI / 2), F.translate(-0.031, 0.007, -0.078), c.push(F));
  }
  let D = (F) => 1.5 * Math.pow(Math.max(0, F - 0.07), 2),
    C = (F) => 3 * Math.max(0, F - 0.07),
    G = [1, 1, 1],
    j = [],
    N = 0.212,
    Q = 12;
  for (let F = 0; F <= Q; F++) {
    let X = -0.004 + ((N + 0.004) * F) / Q;
    j.push([D(X) + 0.0298, -X]);
  }
  for (let F = Q; F >= 0; F--) {
    let X = -0.004 + ((N + 0.004) * F) / Q;
    j.push([D(X) - 0.0298, -X]);
  }
  u.push(xr(j, -0.0113, 0.0113, 0.002, G, 0.25));
  for (let F = 0; F < 8; F++) {
    let X = 0.082 + F * 0.0155;
    u.push(Rt(0.0246, 0.0058, 0.05, 0.0016, 0, -X, D(X), G, 0.3, [Math.atan(C(X)), 0, 0]));
  }
  for (let F = 0; F < 10; F++) {
    let X = 0.078 + F * 0.013;
    u.push(Rt(0.012, 0.011, 0.004, 0.001, 0, -X, D(X) + 0.0302, G, 0.3, [Math.atan(C(X)), 0, 0]));
  }
  (u.push(
    Rt(0.027, 0.009, 0.068, 0.003, 0, -N - 0.003, D(N) + 0.001, G, 0.3, [Math.atan(C(N)), 0, 0]),
  ),
    u.push(
      Rt(0.01, 0.004, 0.012, 0.001, 0, -N - 0.008, D(N) - 0.01, [0.6, 0.6, 0.6], 0, [
        Math.atan(C(N)),
        0,
        0,
      ]),
    ),
    u.push(Rt(0.003, 0.006, 0.04, 0.001, -0.0085, 0.0045, 0.004, G, 0.3)),
    u.push(Rt(0.003, 0.006, 0.04, 0.001, 0.0085, 0.0045, 0.004, G, 0.3)));
  let K = [1.25, 0.72, 0.5];
  (h.push(
    Cn(
      [
        [0, -0.02],
        [0.004, -0.02],
        [0.0047, -0.019],
        [0.0047, 0.01],
        [0.0034, 0.014],
        [0.0034, 0.018],
      ],
      12,
      [1, 1, 1],
      0,
      0.002,
      0.0062,
    ),
  ),
    h.push(
      Cn(
        [
          [0.003, 0.018],
          [0.0029, 0.024],
          [0.0022, 0.03],
          [0.001, 0.0345],
          [0, 0.0352],
        ],
        12,
        K,
        0,
        0.002,
        0.0062,
      ),
    ),
    h.push(
      Cn(
        [
          [0, -0.02],
          [0.004, -0.02],
          [0.0047, -0.019],
          [0.0047, 0.01],
        ],
        10,
        [0.8, 0.8, 0.8],
        0,
        -0.003,
        5e-4,
      ),
    ));
  let ie = {
    ano: Ii(r),
    gun: Ii(a),
    poly: Ii(l),
    plain: Ii(f),
    bolt: Ii(c),
    mag: Ii(u),
    round: Ii(h),
  };
  for (let F of ["ano", "gun", "poly", "plain", "bolt"]) {
    let X = ie[F].attributes.position;
    for (let ne = 0; ne < X.count; ne++)
      X.getZ(ne) > -0.1002 && X.getY(ne) < 0.0341 && X.setX(ne, X.getX(ne) * mi.squeeze);
  }
  for (let F in ie) ie[F].computeBoundingSphere();
  return ie;
}
var Kc = (i) => (i.index ? i.index.count : i.attributes.position.count) / 3;
var ti = W,
  vl = Lt,
  rm = Ye,
  Bv = [31, 21.5, 12.5],
  Fv = [5.6, 5.3, 5],
  Lv = [3.2, 3.1, 3],
  am = [12.5, 10, 7.6],
  lm = [16, 11, 6.6],
  dC = [3, 2.6, 2.2],
  kf = [36, 27, 16],
  gl = [20, 14, 8.4],
  Df = [4.8, 4.5, 4.2],
  pC = [30, 9.5, 2.2],
  E_ = [5, 6.9, 9],
  mC = [30, 9.5, 2.2],
  gC = [26, 26, 25],
  um = (i) => (i < 0 ? 0 : i > 1 ? 1 : i),
  xl = (i, e, t) => ((t = um((t - i) / (e - i))), t * t * (3 - 2 * t)),
  Ff = (i, e) => Math.sign(i) * Math.pow(Math.abs(i), e),
  vC = (i) => {
    let e = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return e - Math.floor(e);
  },
  Xo = new ti(),
  S_ = new ti(0, 0, -1),
  yl = class {
    constructor(e) {
      ((this.N = e), (this.P = []), (this.C = []), (this.weld = []));
    }
    v(e, t, n = 1) {
      (this.P.push(e.x, e.y, e.z), this.C.push(t[0] * n, t[1] * n, t[2] * n));
    }
    rings() {
      return this.P.length / 3 / this.N;
    }
    collapse() {
      this.weld.push(this.rings() - 1);
    }
    geo(e = !1) {
      let t = this.N,
        n = this.rings(),
        s = [];
      for (let a = 0; a < n - 1; a++)
        for (let l = 0; l < t; l++) {
          let c = a * t + l,
            u = a * t + ((l + 1) % t),
            h = c + t,
            f = u + t;
          e ? s.push(c, u, h, u, f, h) : s.push(c, h, u, u, h, f);
        }
      let o = new nt();
      (o.setAttribute("position", new He(this.P, 3)),
        o.setAttribute("color", new He(this.C, 3)),
        o.setAttribute("uv", new He(new Float32Array((this.P.length / 3) * 2), 2)),
        o.setIndex(s),
        o.computeVertexNormals());
      let r = o.attributes.normal;
      for (let a of this.weld) {
        let l = 0,
          c = 0,
          u = 0;
        for (let f = 0; f < t; f++)
          ((l += r.getX(a * t + f)), (c += r.getY(a * t + f)), (u += r.getZ(a * t + f)));
        let h = Math.hypot(l, c, u) || 1;
        for (let f = 0; f < t; f++) r.setXYZ(a * t + f, l / h, c / h, u / h);
      }
      return o;
    }
  };
function I_(i, e, t) {
  let n = [],
    s = [],
    o = [],
    r = i.length,
    a = e.length;
  for (let c = 0; c < a; c++)
    for (let u = 0; u < r; u++) {
      let h = t(i[u], e[c], Xo);
      (n.push(Xo.x, Xo.y, Xo.z), s.push(h[0], h[1], h[2]));
    }
  for (let c = 0; c < a - 1; c++)
    for (let u = 0; u < r - 1; u++) {
      let h = c * r + u,
        f = h + 1,
        p = h + r,
        d = p + 1;
      o.push(h, f, p, f, d, p);
    }
  let l = new nt();
  return (
    l.setAttribute("position", new He(n, 3)),
    l.setAttribute("color", new He(s, 3)),
    l.setAttribute("uv", new He(new Float32Array((n.length / 3) * 2), 2)),
    l.setIndex(o),
    l.computeVertexNormals(),
    l
  );
}
var Uv = [-1, -0.9, -0.5, 0, 0.5, 0.9, 1],
  cm = (i) => (Math.abs(i) > 0.95 ? -1 : Math.abs(i) > 0.8 ? 0.82 : 1);
function Lf(i, e, t, n, s, o, r, a = null, l = !1, c = Uv, u = Uv) {
  return I_(c, u, (h, f, p) => {
    let d = i + h * t,
      v = e + (l ? f : -f) * n,
      g = Math.min(cm(h), cm(f)),
      x = r(d, v) + (g < 0 ? -0.0022 : s * g);
    (p.set(d, l ? -x : x, v), a && a(p));
    let y = typeof o == "function" ? o(h, f) : o,
      b = g < 0 ? 0.5 : g < 1 ? 0.8 : 1;
    return [y[0] * b, y[1] * b, y[2] * b];
  });
}
var om = [
    { base: [-0.031, 0, -0.094], len: [0.044, 0.026, 0.022], rad: [0.0096, 0.009, 0.0083, 0.0076] },
    {
      base: [-0.0105, 0.001, -0.099],
      len: [0.049, 0.03, 0.023],
      rad: [0.0097, 0.0091, 0.0084, 0.0077],
    },
    {
      base: [0.0105, 0, -0.095],
      len: [0.045, 0.028, 0.022],
      rad: [0.0094, 0.0088, 0.0081, 0.0074],
    },
    {
      base: [0.03, -0.002, -0.086],
      len: [0.035, 0.021, 0.02],
      rad: [0.0084, 0.0078, 0.0072, 0.0066],
    },
  ],
  Nv = [12, 34, 44, 68, 90, 112, 136, 146, 168, 192, 220, 245, 270, 295, 320, 348].map(
    (i) => (i * Math.PI) / 180,
  ),
  T_ = Nv.length,
  A_ = 0.0012,
  R_ = [0.14, 0.22, 0.27, 0.73, 0.78, 0.88],
  xC = [0.1, 0.17, 0.1];
function z_(i) {
  let e = new yl(T_),
    { base: t, qs: n, len: s, rad: o } = i,
    r = i.pads || [1, 1, 0],
    a = i.patchJ ?? 1,
    l = i.bump || xC,
    c = i.tipW || 1,
    u = i.tipH || 1,
    h = [],
    f = [],
    p = t.clone();
  for (let M = 0; M < 3; M++)
    (h.push(p.clone()),
      f.push(S_.clone().applyQuaternion(n[M + 1])),
      p.addScaledVector(f[M], s[M]));
  let d = S_.clone().applyQuaternion(n[0]),
    v = (M) => (M ? f[M - 1] : d),
    g = [0, 1, 2].map((M) => new ti().addVectors(v(M), f[M]).normalize()),
    x = (M, E) => (M.x - h[E].x) * g[E].x + (M.y - h[E].y) * g[E].y + (M.z - h[E].z) * g[E].z,
    y = (M, E) => {
      let w = x(M, E);
      w > 0 && M.addScaledVector(v(E), -w / v(E).dot(g[E]));
    },
    b = (M, E) => {
      let w = x(M, E);
      w < 0 && M.addScaledVector(f[E], -w / f[E].dot(g[E]));
    },
    m = new ti(),
    A = new vl(),
    _ = (M, E, w, S) => {
      let z = S.kD || 1,
        H = S.kP || 1,
        O = S.ao || 1;
      for (let q = 0; q < T_; q++) {
        let U = Math.cos(Nv[q]),
          T = Math.sin(Nv[q]),
          D = q >= 1 && q <= 7,
          C = q >= 2 && q <= 6,
          G = w * U,
          j = T > 0 ? w * 0.96 * T * (C ? z : 1 + (z - 1) * 0.4) : w * 0.98 * T * H;
        (S.pad && C && ((G += U * A_), (j += T * A_)),
          (G *= S.wx || 1),
          (j *= S.wy || 1),
          m.set(G, j, 0).applyQuaternion(M).add(E),
          S.a >= 0 && y(m, S.a),
          S.b >= 0 && b(m, S.b));
        let N = D ? Bv : q >= 10 && q <= 14 ? am : lm,
          Q = O;
        (S.pad && C ? (N = Fv) : S.patch && C && ((N = lm), (Q *= 0.9)),
          ((S.pad && D && !C) || (S.edge && D)) && (N = dC),
          S.saddle && q >= 8 && ((N = am), (Q *= 0.9)),
          S.stitch && D && ((N = kf), (Q *= 0.8)),
          (q === 0 || q === 8 || q === 9 || q === 15) && (Q *= 0.72),
          q >= 9 && (Q *= S.aoP || 1),
          e.v(m, N, Q));
      }
    };
  (_(n[0], Xo.copy(h[0]).addScaledVector(d, -(i.rootBack || 0.012) - 0.002), 1e-5, {
    a: 0,
    b: -1,
    ao: i.rootAo || 0.5,
  }),
    e.collapse(),
    _(n[0], Xo.copy(h[0]).addScaledVector(d, -(i.rootBack || 0.012)), o[0] * (i.rootK || 1), {
      a: 0,
      b: -1,
      ao: i.rootAo || 0.5,
      saddle: i.saddle,
    }));
  for (let M = 0; M < 3; M++) {
    for (let E = 0; E < 4; E++) {
      let w = E / 3;
      (A.slerpQuaternions(n[M], n[M + 1], w),
        _(A, Xo.copy(h[M]).addScaledVector(E < 2 ? v(M) : f[M], (E - 1.5) * 4e-4), o[M], {
          a: w < 0.5 ? M : -1,
          b: w < 0.5 ? -1 : M,
          kD: 1 + l[M] * (E === 0 || E === 3 ? 0.55 : 1),
          patch: M === a,
          saddle: i.saddle && M < 2,
          wx: M === 2 ? 1 + (c - 1) * 0.5 : 1,
          wy: M === 2 ? 1 + (u - 1) * 0.5 : 1,
          ao: M === 0 && !i.rootAo ? 0.62 + 0.1 * E : 1,
          aoP: E === 1 || E === 2 ? 0.55 : 0.8,
        }));
    }
    if (M < 2)
      for (let E = 0; E < R_.length; E++) {
        let w = R_[E],
          S = (o[M] + (o[M + 1] - o[M]) * w) * (1 - 0.06 * Math.sin(Math.PI * w));
        _(n[M + 1], Xo.copy(h[M]).addScaledVector(f[M], s[M] * w), S, {
          a: M + 1,
          b: M,
          pad: r[M] && (E === 2 || E === 3),
          edge: r[M] && (E === 1 || E === 4),
          saddle: i.saddle && M === 0,
          ao: M === 0 && !i.rootAo ? 0.86 + 0.14 * xl(0, 0.5, w) : 1,
        });
      }
    else {
      let E = o[3],
        w = s[2] - E;
      (_(n[3], Xo.copy(h[2]).addScaledVector(f[2], s[2] * 0.2), o[2] * 0.97, {
        a: -1,
        b: 2,
        stitch: 1,
        wx: c,
        wy: u,
      }),
        _(n[3], Xo.copy(h[2]).addScaledVector(f[2], s[2] * 0.42), (o[2] + E) * 0.5, {
          a: -1,
          b: 2,
          kP: 1.08,
          wx: c,
          wy: u,
        }));
      for (let S of [0, 0.6, 1.05, 1.36])
        _(n[3], Xo.copy(h[2]).addScaledVector(f[2], w + E * 1.08 * Math.sin(S)), E * Math.cos(S), {
          a: -1,
          b: -1,
          kP: 1.06,
          wx: c,
          wy: u,
        });
      (_(n[3], Xo.copy(h[2]).addScaledVector(f[2], w + E * 1.08), 1e-5, { a: -1, b: -1 }),
        e.collapse());
    }
  }
  return e.geo();
}
var yC = (i) => new vl().setFromAxisAngle(new ti(0, 1, 0), i),
  bC = (i) => new vl().setFromAxisAngle(new ti(1, 0, 0), i);
function C_(i, e) {
  let t = [yC(e[3] || 0)];
  for (let n = 0; n < 3; n++) t.push(t[n].clone().multiply(bC(-e[n])));
  return z_({ base: new ti(i.base[0], i.base[1], i.base[2]), qs: t, len: i.len, rad: i.rad });
}
function _C(i, e) {
  let t = i.clone().negate(),
    n = new ti().crossVectors(e, t);
  (n.lengthSq() < 1e-6 && n.set(1, 0, 0), n.normalize());
  let s = new ti().crossVectors(t, n);
  return new vl().setFromRotationMatrix(new rm().makeBasis(n, s, t));
}
function MC(i) {
  let e = i.map((o) => new ti(o[0], o[1], o[2]).normalize()),
    t = new ti(-0.72, 0.69, 0),
    n = [],
    s = e[2].clone().sub(e[0]);
  s.length() > 0.12 && t.multiplyScalar(0.25).addScaledVector(s.normalize(), -1);
  for (let o = 0; o < 3; o++) n.push(_C(e[o], t));
  return (
    n.unshift(n[0].clone()),
    z_({
      base: new ti(-0.028, -0.007, -0.014),
      qs: n,
      len: [0.044, 0.031, 0.026],
      rad: [0.0165, 0.0118, 0.011, 0.01],
      pads: [0, 1, 0],
      patchJ: 2,
      bump: [0, 0.2, 0.2],
      tipW: 1.12,
      tipH: 0.86,
      saddle: 1,
      rootBack: 0.01,
      rootK: 0.72,
      rootAo: 0.9,
    })
  );
}
var Qc = 0.006,
  D_ = (i) => -0.0975 + 0.0125 * Math.pow((i + 0.008) / 0.04, 2),
  Ov = (i) => D_(i) + 0.006,
  Hv = (i) => 0.029 + 0.014 * xl(0.05, 0.85, i),
  L_ = (i) => 0.0185 - 0.0065 * xl(0.1, 1, i),
  k_ = (i) => 0.0185 + 0.003 * Math.sin(Math.PI * um(i * 1.6)) - 0.0055 * xl(0.3, 1, i);
function kv(i, e) {
  let t = um((Qc - e) / (Qc - Ov(i))),
    n = Math.min(0.999, Math.abs(i / Hv(t)));
  return L_(t) * Math.pow(1 - Math.pow(n, 2.5), 0.4);
}
function wC(i, e) {
  let t = um((Qc - e) / (Qc - Ov(i))),
    n = Hv(t),
    s = Math.min(0.999, Math.abs(i / n));
  return (
    k_(t) *
    Math.pow(1 - Math.pow(s, 2.5), 0.4) *
    (1 + 0.14 * Math.max(0, i / n) * Math.sin(Math.PI * t))
  );
}
function EC() {
  let e = new yl(24),
    t = new ti(),
    n = [
      [0, 0, 1, 1],
      [0.1, 0, 1, 1],
      [0.22, 0, 1, 1],
      [0.36, 0, 1, 1],
      [0.5, 0, 1, 1],
      [0.64, 0, 1, 1],
      [0.77, 0, 1, 1],
      [0.89, 0, 1, 1],
      [1, 0, 1, 1],
      [1, -0.005, 0.8, 1],
      [1, -0.009, 0.45, 0.985],
      [1, -0.0105, 0.04, 0.97],
    ];
  for (let [s, o, r, a] of n) {
    let l = Hv(s) * a,
      c = L_(s) * r,
      u = k_(s) * r;
    for (let h = 0; h < 24; h++) {
      let f = ((h + 0.5) / 24) * Math.PI * 2,
        p = Math.cos(f),
        d = Math.sin(f),
        v = l * Ff(p, 0.8),
        g =
          d >= 0
            ? c * Ff(d, 0.8)
            : u * Ff(d, 0.8) * (1 + 0.14 * Math.max(0, v / l) * Math.sin(Math.PI * s));
      t.set(v, g, Qc + (Ov(v) - Qc) * s + o);
      let x = d > 0.3 ? Bv : d < -0.3 ? am : lm,
        y = 1;
      (s === 0.1 && d > 0.3 && ((x = kf), (y = 0.75)),
        o < 0 && ((x = lm), (y = 0.7 + o * 30)),
        d < -0.3 && (y *= 0.82 + 0.18 * Math.abs(p)),
        e.v(t, x, y));
    }
  }
  return e.geo();
}
function SC(i) {
  let t = new yl(12),
    n = new ti(),
    s = new ti(),
    o = new ti(),
    r = new ti(),
    a = new ti(),
    l = new ti(i.x, i.y, i.z - 1).normalize(),
    c = [-0.12, 0, 0.2, 0.4, 0.6, 0.78, 0.9];
  for (let d = 0; d < c.length; d++) {
    let v = c[d],
      g = d === 0 || d === c.length - 1;
    (s.set(-0.028, -0.007, -0.014).addScaledVector(i, 0.044 * v),
      o.set(-0.03, -0.003, -0.022 - 0.06 * v),
      r.subVectors(s, o));
    let x = r.length() * 0.5 + 0.005;
    (r.normalize(), a.crossVectors(r, l).normalize());
    let y = g ? 1e-5 : 0.0085 * (1 - 0.55 * v),
      b = g ? 1e-5 : x * (1 - 0.3 * v * v);
    for (let m = 0; m < 12; m++) {
      let A = ((m + 0.5) / 12) * Math.PI * 2,
        _ = Math.cos(A),
        M = Math.sin(A);
      n.copy(s)
        .add(o)
        .multiplyScalar(0.5)
        .addScaledVector(r, _ * b)
        .addScaledVector(a, M * y);
      let E = a.y * M < 0;
      t.v(n, E ? am : Bv, E ? 0.85 : 0.92);
    }
    g && t.collapse();
  }
  let u = t.geo(),
    h = u.attributes.position,
    f = u.index.array,
    p = 0;
  for (let d = 0; d < f.length; d += 3)
    (s.fromBufferAttribute(h, f[d]),
      o.fromBufferAttribute(h, f[d + 1]),
      n.fromBufferAttribute(h, f[d + 2]),
      (p += s.dot(o.cross(n))));
  if (p < 0) {
    for (let d = 0; d < f.length; d += 3) {
      let v = f[d + 1];
      ((f[d + 1] = f[d + 2]), (f[d + 2] = v));
    }
    u.computeVertexNormals();
  }
  return u;
}
function P_(i) {
  if ((i.scale(-1, 1, 1), !i.index)) {
    let t = i.attributes.position.count,
      n = new Uint32Array(t);
    for (let s = 0; s < t; s++) n[s] = s;
    i.setIndex(new et(n, 1));
  }
  let e = i.index.array;
  for (let t = 0; t < e.length; t += 3) {
    let n = e[t + 1];
    ((e[t + 1] = e[t + 2]), (e[t + 2] = n));
  }
  return i;
}
function Vv(i) {
  let e = [],
    t = i.debugParts || null,
    n = (d, v) => (e.push(v), t && t.push([d, v]), v);
  n("palm", EC());
  {
    let d = [];
    for (let v = 0; v <= 30; v++) d.push(-1 + v / 15);
    n(
      "guard",
      I_(d, [-1, -0.9, -0.5, 0, 0.5, 0.9, 1], (v, g, x) => {
        let y = -5e-4 + v * 0.0405,
          b = D_(y) + 0.0045 - g * 0.011,
          m = Math.min(cm(v), cm(g)),
          A = 0;
        for (let M = 0; M < 4; M++) {
          let E = (y - om[M].base[0]) / 0.0058;
          A += (M === 3 ? 0.8 : 1) * Math.exp(-E * E);
        }
        ((A = Math.min(1, A) * (1 - 0.55 * g * g)),
          x.set(
            y,
            kv(y, b) + (m < 0 ? (g > 0.95 ? -0.008 : -0.003) : (0.0016 + 0.006 * A) * m),
            b,
          ));
        let _ = m < 0 ? 0.6 : 0.85 + 1.3 * A;
        return [Lv[0] * _, Lv[1] * _, Lv[2] * _];
      }),
    );
  }
  for (let d = 0; d < 3; d++)
    n("bar", Lf(0.001, -0.034 - d * 0.015, 0.023 + d * 0.0025, 0.0052, 0.0019, Fv, kv));
  (n(
    "seam",
    Lf(
      0,
      -0.0225,
      0.027,
      0.0013,
      9e-4,
      kf.map((d) => d * 0.8),
      kv,
      null,
      !1,
      Uv,
      [-1, 0, 1].map((d) => d * 0.9),
    ),
  ),
    n("heelPad", Lf(0.013, -0.03, 0.0135, 0.017, 0.0017, Fv, wC, null, !0)));
  let s = [];
  for (let d = 0; d < 4; d++) {
    if (d === 0 && i.indexPoses) {
      for (let v of i.indexPoses) s.push(C_(om[0], v));
      continue;
    }
    n("finger" + d, C_(om[d], i.fingers[d]));
  }
  (n("thumb", MC(i.thumb)),
    n("web", SC(new ti(i.thumb[0][0], i.thumb[0][1], i.thumb[0][2]).normalize())));
  let o = new ti(i.forearm[0], i.forearm[1], i.forearm[2]).normalize(),
    r = i.sleeve || 0.36,
    a = 0.022,
    l = new vl().setFromUnitVectors(new ti(0, 0, 1), o),
    c = new vl(),
    u = new vl(),
    h = (d) => (
      u.slerpQuaternions(c, l, xl(0.002, 0.042, d.z)),
      (d.z -= a),
      d.applyQuaternion(u),
      (d.z += a),
      d
    );
  {
    let v = new yl(24),
      g = new ti(),
      x = [
        [-0.0085, -0.0015, Df, 0.6],
        [-0.009, 0.0022, Df, 1.3],
        [-0.006, 0.0026, Df, 1.3],
        [-0.0052, 0.002, gl, 0.75],
        [0.004, 0.0014, gl, 1],
        [0.011, 0.0016, gl, 0.7],
        [0.0122, 0.003, Df, 1.2],
        [0.0305, 0.0032, Df, 1.2],
        [0.0317, 0.0018, gl, 0.7],
        [0.04, 0.002, gl, 1],
        [0.054, 0.0024, gl, 1],
        [0.058, 0.0026, kf, 0.7],
        [0.058, -0.004, gl, 0.4],
      ];
    for (let [y, b, m, A] of /** @type {[number, number, any, number][]} */ (x))
      for (let _ = 0; _ < 24; _++) {
        let M = ((_ + 0.5) / 24) * Math.PI * 2,
          E = Math.sin(M);
        v.v(
          h(
            g.set(
              (0.0296 + b) * Ff(Math.cos(M), 0.8),
              (E >= 0 ? 0.0185 + b : 0.0204 + b) * Ff(E, 0.8),
              y,
            ),
          ),
          m,
          A,
        );
      }
    n("cuff", v.geo(!0));
  }
  (n(
    "strapTab",
    Lf(
      0.009,
      0.0215,
      0.0135,
      0.0076,
      0.0017,
      (d) => (d > 0.55 ? kf.map((v) => v * 0.75) : [9, 9, 9.6]),
      (d) => 0.0217 * Math.pow(1 - Math.pow(Math.min(0.999, Math.abs(d / 0.0328)), 2.5), 0.4),
      h,
    ),
  ),
    n(
      "pullTab",
      Lf(0.003, 0.004, 0.0065, 0.0115, 0.0022, pC, () => 0.022, h, !0),
    ));
  {
    let d = [];
    for (let z = 0; z < 24; z++)
      (d.push(z * 15),
        (z === 4 || z === 16) && d.push(z * 15 + 11.5),
        (z === 5 || z === 17) && d.push(z * 15 + 3.5));
    d.sort((z, H) => z - H);
    let v = d.length,
      g = d.indexOf(75),
      x = d.indexOf(255),
      y = new yl(v),
      b = new ti(),
      m = 0.04 + r,
      A = [
        [0.0415, 0],
        [0.04, 1],
        [0.044, 2],
        [0.049, 3],
        [0.055, 3],
        [0.061, 3],
        [0.0655, 4],
        [0.0685, 5],
      ],
      _ = [0.1415, 0.143, 0.157, 0.1582, 0.1662, 0.1674, 0.181, 0.1825],
      M = _.slice(),
      E = Math.ceil((m - 0.074) / 0.0052);
    for (let z = 0; z <= E; z++) {
      let H = 0.074 + ((m - 0.074) * z) / E;
      _.some((O) => Math.abs(O - H) < 0.0016) || M.push(H);
    }
    M.sort((z, H) => z - H);
    for (let z of M) A.push([z, 6]);
    let w = 0;
    for (let [z, H] of A)
      for (let O = 0; O < v; O++) {
        let q = (d[O] * Math.PI) / 180,
          U,
          T = 1,
          D = E_;
        if (H === 0) ((U = 0.0292), (T = 0.4));
        else if (H === 1) ((U = 0.0372), (T = 1.15));
        else if (H === 2) ((U = 0.0377), (T = 1.1));
        else if (H === 3) {
          let C = Math.cos(q * 12);
          ((U = 0.0368 + 0.0012 * C), (T = 0.62 + 0.26 * C));
        } else if (H === 4) ((U = 0.0356), (T = 0.55));
        else if (H === 5) ((U = 0.038), (T = 0.9));
        else {
          let C = (z - 0.0685) / (m - 0.0685),
            G = 0.0048 * Math.exp(-Math.pow((C - 0.13) / 0.11, 2)),
            j = 0.0048 * xl(0.62, 0.85, C),
            N =
              Math.pow(
                Math.abs(
                  Math.sin(
                    (Math.PI * z) / 0.027 + 1.7 * Math.sin(q + 0.5) + 0.8 * Math.sin(2 * q + 1.3),
                  ),
                ),
                0.6,
              ) *
                2 -
              1.25,
            Q =
              Math.pow(
                Math.abs(
                  Math.sin((Math.PI * z) / 0.034 + 1.9 * Math.sin(q - 0.8) + 0.7 * Math.sin(2 * q)),
                ),
                0.6,
              ) *
                2 -
              1.25,
            K = Math.sin(z * 40 + 2 * Math.sin(q * 2 + 1)) + 0.6 * Math.sin(3 * q + z * 25);
          ((U =
            0.0405 +
            0.012 * Math.pow(C, 0.85) +
            0.0025 * Math.exp(-Math.pow((z - 0.082) / 0.012, 2)) +
            G * N +
            j * Q +
            0.0016 * K),
            (T = 0.78 + 0.26 * xl(-1.1, 0.5, (G * N + j * Q) / (G + j + 8e-4)) + 0.04 * K));
          let ie = vC(w);
          z > 0.1575 && z < 0.167
            ? ((D = gC), (T *= 0.85 + 0.25 * ie))
            : z > 0.1425 && z < 0.1815 && ((D = mC), (T *= 0.78 + 0.3 * ie));
        }
        (H > 0 &&
          (O === g || O === x
            ? ((U += 0.0019), (T *= 1.3))
            : (Math.abs(O - g) === 1 || Math.abs(O - x) === 1) && (T *= 0.52)),
          b.set(Math.cos(q) * U, Math.sin(q) * U * 0.84, z),
          y.v(b, D, T),
          w++);
      }
    for (let z = 0; z < v; z++) y.v(b.set(0, 0, m + 0.006), E_, 0.3);
    y.collapse();
    let S = y.geo(!0);
    (S.applyMatrix4(
      new rm()
        .makeTranslation(0, 0, a)
        .multiply(new rm().makeRotationFromQuaternion(l))
        .multiply(new rm().makeTranslation(0, 0, -a)),
    ),
      n("sleeve", S));
  }
  let p = { fabric: Ii(e), rubber: null, index: s.length ? s : null, knuckle: om[0].base.slice() };
  return (i.mirror && (P_(p.fabric), p.index && p.index.forEach(P_), (p.knuckle[0] *= -1)), p);
}
var hm = {
    model: [8, 8, 330, 84],
    maker: [8, 100, 560, 40],
    cal: [8, 146, 560, 40],
    prop: [8, 192, 700, 40],
    safe: [8, 240, 90, 34],
    semi: [110, 240, 90, 34],
    auto: [212, 240, 90, 34],
    rack: [8, 290, 300, 110],
    warn: [330, 290, 420, 110],
    optic: [580, 8, 300, 60],
    light: [580, 76, 300, 60],
    dots: [320, 240, 60, 34],
    r2: [8, 420, 56, 40],
    r4: [72, 420, 56, 40],
    r6: [136, 420, 56, 40],
    r8: [200, 420, 56, 40],
    r10: [264, 420, 56, 40],
    r12: [328, 420, 56, 40],
  },
  Uf = 1024,
  Nf = 512;
function TC() {
  let i = document.createElement("canvas");
  ((i.width = Uf), (i.height = Nf));
  let e = i.getContext("2d");
  (e.clearRect(0, 0, Uf, Nf), (e.textBaseline = "middle"));
  let t = (u, h, f, p, d = "left") => {
      let [v, g, x, y] = hm[u];
      ((e.font = f),
        (e.fillStyle = p),
        (e.textAlign = /** @type {CanvasTextAlign} */ (d)),
        e.fillText(h, d === "left" ? v + 2 : v + x / 2, g + y / 2 + 1, x - 4));
    },
    n = '"PingFang SC", "PingFang SC", Arial, sans-serif',
    s = '"PingFang SC", "PingFang SC", monospace',
    o = '"PingFang SC", "PingFang SC", Impact, sans-serif',
    r = "rgba(196,198,194,0.92)";
  (t("model", "PAC-9", `700 78px ${o}`, r),
    t("maker", "几猫兵工厂 · 港区装备", `600 30px ${n}`, r),
    t("cal", "CAL 5.8\xD740   SN PA-004217", `500 27px ${s}`, r),
    t("prop", "港务局装备 · 四号泊位武器库", `600 28px ${n}`, r),
    t("safe", "S", `700 30px ${n}`, r, "center"),
    t("semi", "1", `700 30px ${n}`, r, "center"),
    t("auto", "A", `700 30px ${n}`, "rgba(205,60,40,0.95)", "center"),
    t("rack", "B4-07", `800 104px ${o}`, "rgba(214,206,170,0.9)", "center"));
  for (let u of [2, 4, 6, 8, 10, 12])
    t("r" + u, "T" + u, `600 30px ${s}`, "rgba(190,192,188,0.85)", "center");
  (t("optic", "HX-2 反射瞄具", `700 44px ${n}`, r, "center"),
    t("light", "900 LM  IPX8", `600 40px ${n}`, r, "center"));
  {
    let [u, h] = hm.warn;
    ((e.fillStyle = r),
      (e.textAlign = "left"),
      (e.font = `600 24px ${n}`),
      ["警告：存放前必须清空弹膛", "仅限授权突击队员使用", "港务安全规程 44/7"].forEach((f, p) =>
        e.fillText(f, u + 2, h + 20 + p * 34),
      ));
  }
  {
    let [u, h, f, p] = hm.dots;
    ((e.fillStyle = r),
      e.beginPath(),
      e.arc(u + 12, h + p / 2, 7, 0, 7),
      e.fill(),
      (e.fillStyle = "rgba(205,60,40,0.95)"),
      e.beginPath(),
      e.arc(u + 40, h + p / 2, 7, 0, 7),
      e.fill());
  }
  e.globalCompositeOperation = "destination-out";
  let a = 7,
    l = () => ((a = (a * 16807) % 2147483647), a / 2147483647);
  for (let u = 0; u < 2600; u++) {
    e.fillStyle = `rgba(0,0,0,${0.25 + l() * 0.6})`;
    let h = l() < 0.9 ? 1 + l() * 1.5 : 2 + l() * 5;
    e.fillRect(l() * Uf, l() * Nf, h, h * (0.4 + l()));
  }
  let c = new xs(i);
  return ((c.colorSpace = Vn), (c.anisotropy = 8), (c.generateMipmaps = !0), (c.minFilter = Ln), c);
}
function F_(i) {
  let e = [],
    t = [],
    n = [],
    s = [];
  for (let [l, c, u, h, f, p, d = 0] of i) {
    let [v, g, x, y] = hm[l],
      b = (f * x) / y,
      m = v / Uf,
      A = (v + x) / Uf,
      _ = 1 - g / Nf,
      M = 1 - (g + y) / Nf,
      E = e.length / 3,
      w;
    if (
      (p === "L"
        ? (w = [
            [c, u - f / 2, -(h + b / 2)],
            [c, u - f / 2, -(h - b / 2)],
            [c, u + f / 2, -(h - b / 2)],
            [c, u + f / 2, -(h + b / 2)],
          ])
        : p === "R"
          ? (w = [
              [c, u - f / 2, -(h - b / 2)],
              [c, u - f / 2, -(h + b / 2)],
              [c, u + f / 2, -(h + b / 2)],
              [c, u + f / 2, -(h - b / 2)],
            ])
          : (w = [
              [c - b / 2, u, -(h - f / 2)],
              [c + b / 2, u, -(h - f / 2)],
              [c + b / 2, u, -(h + f / 2)],
              [c - b / 2, u, -(h + f / 2)],
            ]),
      d)
    ) {
      let z = Math.cos(d),
        H = Math.sin(d),
        O = u,
        q = -h;
      for (let U of w) {
        let T = U[1] - O,
          D = U[2] - q;
        ((U[1] = O + T * z - D * H), (U[2] = q + T * H + D * z));
      }
    }
    for (let z of w) e.push(z[0], z[1], z[2]);
    t.push(m, M, A, M, A, _, m, _);
    let S = p === "L" ? [-1, 0, 0] : p === "R" ? [1, 0, 0] : [0, 1, 0];
    for (let z = 0; z < 4; z++) n.push(S[0], S[1], S[2]);
    s.push(E, E + 1, E + 2, E, E + 2, E + 3);
  }
  let o = new nt();
  (o.setAttribute("position", new He(e, 3)),
    o.setAttribute("uv", new He(t, 2)),
    o.setAttribute("normal", new He(n, 3)),
    o.setIndex(s));
  let r = new Qt({
      map: TC(),
      transparent: !0,
      roughness: 0.62,
      metalness: 0,
      depthWrite: !1,
      polygonOffset: !0,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      side: Sn,
    }),
    a = new Qe(o, r);
  return ((a.renderOrder = 2), a);
}
function U_(i, e) {
  let t = new ji();
  (i.forEach((r, a) => (a ? t.lineTo(r[0], r[1]) : t.moveTo(r[0], r[1]))), t.closePath());
  let n = new H0(t);
  n.translate(0, 0, -e);
  {
    let r = 1e9,
      a = -1e9,
      l = 1e9,
      c = -1e9;
    for (let f of i)
      ((r = Math.min(r, f[0])),
        (a = Math.max(a, f[0])),
        (l = Math.min(l, f[1])),
        (c = Math.max(c, f[1])));
    let u = n.attributes.position,
      h = n.attributes.uv;
    for (let f = 0; f < u.count; f++)
      h.setXY(f, (u.getX(f) - r) / (a - r), (u.getY(f) - l) / (c - l));
  }
  let s = new zn({
      transparent: !0,
      premultipliedAlpha: !0,
      depthWrite: !1,
      side: Sn,
      uniforms: {
        uBright: { value: 7 },
        uSun: { value: Mn.dir.clone() },
        uSunCol: { value: Mn.color.clone() },
        uZen: { value: en.zenith.clone() },
        uHor: { value: en.horizonAway.clone() },
        uTilt: { value: 0.1 },
      },
      vertexShader: `
      varying vec3 vView, vFwd, vRight, vUp, vWPos, vWN; varying vec2 vUv;
      uniform float uTilt;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = mv.xyz;
        vFwd = (modelViewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz; vRight = (modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz; vUp = (modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
        vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * normalize(vec3(0.0, -uTilt, 1.0)));   // real sights tilt the glass a few degrees
        gl_Position = projectionMatrix * mv;
      }`,
      fragmentShader: `
      varying vec3 vView, vFwd, vRight, vUp, vWPos, vWN; varying vec2 vUv;
      uniform float uBright; uniform vec3 uSun, uSunCol, uZen, uHor;
      void main(){
        vec3 d = normalize(vView), fw = normalize(vFwd);
        float k = max(dot(d, fw), 1e-3);
        vec2 a = vec2(dot(d, normalize(vRight)), dot(d, normalize(vUp))) / k;      // tangent of the angle off the bore axis
        float r = length(a), px = max(fwidth(r), 1e-5);
        float dotR = max(0.0011, px * 0.9), ringW = max(0.00045, px * 0.6);
        float dotI = 1.0 - smoothstep(dotR - px, dotR + px, r);
        float ring = 1.0 - smoothstep(ringW - px * 0.5, ringW + px, abs(r - 0.0128));
        float ang = atan(a.y, a.x);
        float tick = (1.0 - smoothstep(0.0, px * 1.2 + 0.0004, min(abs(a.x), abs(a.y)))) * step(0.0128, r) * (1.0 - smoothstep(0.0165, 0.0175, r));
        float ret = clamp(dotI + ring * 0.8 + tick * 0.8, 0.0, 1.0);
        // faint halo so the bloom has something to hold on to
        ret += 0.05 * exp(-r * r / 0.00002);
        vec3 retCol = vec3(1.0, 0.11, 0.045) * ret * uBright;
        // coated glass: sky/sun reflection through a ruby-teal dichroic coating, stronger at grazing angles
        vec3 wv = normalize(vWPos - cameraPosition); vec3 n = normalize(vWN); if (dot(n, wv) > 0.0) n = -n;
        vec3 rf = reflect(wv, n);
        float fres = pow(1.0 - abs(dot(wv, n)), 3.0);
        vec3 sky = mix(uHor, uZen, clamp(rf.y * 1.4 + 0.2, 0.0, 1.0));
        float sd = max(dot(rf, uSun), 0.0);
        sky += uSunCol * (pow(sd, 6.0) * 0.6 + pow(sd, 90.0) * 6.0);
        // blue -> amber dichroic coating across the glass, a soft diagonal sheen band, and a thin dark edge
        float band = smoothstep(0.25, 0.5, vUv.x * 0.6 + vUv.y) * (1.0 - smoothstep(0.62, 0.95, vUv.x * 0.6 + vUv.y));
        vec3 coat = mix(vec3(0.30, 0.50, 0.95), vec3(1.0, 0.62, 0.28), clamp(fres * 2.2 + vUv.y * 0.75 - 0.15, 0.0, 1.0));
        vec2 e = abs(vUv - 0.5) * 2.0; float edge = smoothstep(0.90, 1.0, max(e.x, e.y));
        float refl = 0.12 + 0.60 * fres + 0.07 * band;
        // faint emitter glow that stays visible off-axis (what you see of a powered sight from the hip)
        vec2 eg = (vUv - vec2(0.5, 0.16)) * vec2(1.0, 1.6); retCol += vec3(1.0, 0.10, 0.04) * 0.20 * exp(-dot(eg, eg) * 60.0) * (1.0 - smoothstep(0.985, 0.9995, k));
        vec3 col = (sky * 1.5 + vec3(0.03, 0.035, 0.045)) * coat * refl * (1.0 - edge) + retCol;
        float alpha = clamp(0.20 + 0.32 * fres + 0.05 * band + 0.6 * edge, 0.0, 0.94);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
    o = new Qe(n, s);
  return ((o.renderOrder = 5), o);
}
function N_() {
  let i = [],
    e = [],
    t = [],
    n = [],
    s = (d, v, g, x, y) => {
      let b = i.length / 3;
      for (let m of [d, v, g, x]) i.push(m[0], m[1], m[2]);
      e.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let m = 0; m < 4; m++) t.push(y);
      n.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
  (s([-0.13, -0.13, -0.03], [0.13, -0.13, -0.03], [0.13, 0.13, -0.03], [-0.13, 0.13, -0.03], 0),
    s(
      [-0.13 * 0.7, -0.13 * 0.7, -0.09],
      [0.13 * 0.7, -0.13 * 0.7, -0.09],
      [0.13 * 0.7, 0.13 * 0.7, -0.09],
      [-0.13 * 0.7, 0.13 * 0.7, -0.09],
      0,
    ));
  let r = 0.065,
    a = 0.34;
  (s([-r, 0, 0.01], [r, 0, 0.01], [r, 0, -a], [-r, 0, -a], 1),
    s([0, -r, 0.01], [0, r, 0.01], [0, r, -a], [0, -r, -a], 1));
  let l = 0.17,
    c = 0.05,
    u = 0.035;
  (s([-l, -c, u], [l, -c, u], [l, c, u], [-l, c, u], 2),
    s([-l, 0, u + c], [l, 0, u + c], [l, 0, u - c], [-l, 0, u - c], 2),
    s([-0.05, -0.05, -0.01], [0.05, -0.05, -0.01], [0.05, 0.05, -0.01], [-0.05, 0.05, -0.01], 3),
    s([-0.03, -0.03, 0.02], [0.03, -0.03, 0.02], [0.03, 0.03, 0.02], [-0.03, 0.03, 0.02], 4));
  let h = new nt();
  (h.setAttribute("position", new He(i, 3)),
    h.setAttribute("uv", new He(e, 2)),
    h.setAttribute("aType", new He(t, 1)),
    h.setIndex(n));
  let f = new zn({
      transparent: !0,
      depthWrite: !1,
      blending: hr,
      side: Sn,
      uniforms: {
        uSeed: { value: 0 },
        uInt: { value: 0 },
        uHeat: { value: 0 },
        uJet: { value: 1 },
      },
      vertexShader: `attribute float aType; varying vec2 vUv; varying float vType;
      void main(){ vUv = uv; vType = aType; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; varying float vType; uniform float uSeed, uInt, uHeat, uJet;
      float h1(float n){ return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453); }
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x); float I = 0.0; vec3 tintc = vec3(1.0, 0.50, 0.16);
        if (vType < 0.5) {
          float n1 = 3.0 + floor(h1(1.0) * 3.0), n2 = 5.0 + floor(h1(2.0) * 4.0);
          float pet = pow(abs(cos(a * n1 * 0.5 + h1(3.0) * 6.283)), 5.0) * (0.55 + 0.45 * h1(4.0));
          pet += pow(abs(cos(a * n2 * 0.5 + h1(5.0) * 6.283)), 14.0) * 0.55;
          float reach = 0.35 + 0.65 * pet;
          I = (0.25 + pet) * smoothstep(reach, reach * 0.15, r) * (0.75 + 0.25 * sin(r * 26.0 + h1(6.0) * 20.0));
        } else if (vType < 1.5) {
          float y = vUv.y, x = p.x * (1.0 + 0.5 * sin(y * 17.0 + h1(7.0) * 30.0) * y);
          float wdt = mix(0.20, 0.75, smoothstep(0.0, 0.35, y)) * (1.0 - y * 0.75);
          I = exp(-x * x / (wdt * wdt * 0.35)) * pow(1.0 - y, 1.4) * (0.7 + 0.3 * sin(y * 31.0 + h1(8.0) * 9.0)) * 0.9;
        } else if (vType < 2.5) {
          float u = abs(p.x), len = 0.55 + 0.45 * h1(9.0 + step(0.0, p.x));
          float wv = p.y * (1.0 + u * 3.0) + 0.12 * sin(u * 14.0 + h1(10.0) * 20.0) * u;
          I = exp(-wv * wv * 22.0) * smoothstep(len, 0.06, u) * smoothstep(0.02, 0.10, u) * 0.85 * uJet;
        } else if (vType < 3.5) {
          I = exp(-r * r * 5.0) * 2.4 * smoothstep(1.0, 0.6, r); tintc = vec3(1.0, 0.82, 0.58);
        } else {
          gl_FragColor = vec4(vec3(1.0, 0.28, 0.06) * exp(-r * r * 4.0) * smoothstep(1.0, 0.5, r) * uHeat, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
        }
        vec3 col = mix(tintc, vec3(1.0, 0.90, 0.70), clamp(I * I * 0.7, 0.0, 1.0)) * I * uInt;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
    p = new Qe(h, f);
  return ((p.renderOrder = 10), (p.frustumCulled = !1), p);
}
var Wv = { value: 1 },
  AC = `
varying vec3 vObjP; varying vec3 vWNrm; varying vec3 vONrm; uniform float uKind; uniform float uRain;
float dh3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dh3(i), dh3(i + vec3(1,0,0)), f.x), mix(dh3(i + vec3(0,1,0)), dh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dh3(i + vec3(0,0,1)), dh3(i + vec3(1,0,1)), f.x), mix(dh3(i + vec3(0,1,1)), dh3(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec2 dh2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec2 dDrops(vec2 uv, float cell, float seed){ vec2 g = uv / cell, i = floor(g), f = fract(g); float best = 0.0;
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) { vec2 o = vec2(float(a), float(b)); vec2 r = dh2(i + o + seed);
    float keep = step(0.70, fract(r.x * 7.31 + r.y * 3.17)); vec2 c = o + 0.2 + 0.6 * r; float rad = (0.16 + 0.22 * fract(r.x * 13.7)) * keep;
    float d = length(f - c); best = max(best, sqrt(max(rad * rad - d * d, 0.0))); }
  return vec2(best * cell, step(1e-6, best)); }
vec3 dBump(vec3 N, float h){ vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition); float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpdy, N), r2 = cross(N, dpdx); float det = dot(dpdx, r1); vec3 g = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - g); }
`,
  RC = `
vec3 dP = vObjP; vec3 dAn = abs(vONrm);
vec2 dUV = (dAn.y > dAn.x && dAn.y > dAn.z) ? dP.xz : (dAn.x > dAn.z ? dP.zy : dP.xy);
float dSm = dn3(dP * 36.0), dSm2 = dn3(dP * 150.0 + 7.0), dFine = dn3(dP * 2400.0);
float dHt = 0.0, dR = 0.0;
if (uKind < 0.5) {
  float scuff = smoothstep(0.70, 0.9, dn3(dP * vec3(420.0, 420.0, 26.0) + 3.0));
  float smudge = smoothstep(0.55, 0.8, dn3(dP * 55.0 + 11.0));
  dR = (dSm - 0.5) * 0.20 + (dSm2 - 0.5) * 0.10 + (dFine - 0.5) * 0.08 + scuff * 0.18 - smudge * 0.12;
  dHt = dFine * 0.000010 - scuff * 0.000015;
} else if (uKind < 1.5) {
  float ring = sin(dP.z * 5200.0) * 0.5 + 0.5, streak = dn3(vec3(dP.z * 950.0, 1.0, 2.0));
  dR = (streak - 0.5) * 0.26 + (dSm - 0.5) * 0.14 + (dFine - 0.5) * 0.10;
  dHt = ring * 0.000014 + dFine * 0.000010;
} else {
  float st = dn3(dP * 1500.0) * 0.6 + dn3(dP * 3100.0 + 5.0) * 0.4;
  dR = (dSm - 0.5) * 0.18 + (st - 0.5) * 0.14 - smoothstep(0.6, 0.85, dSm2) * 0.10;
  dHt = st * 0.000075;
}
float dUp = smoothstep(0.30, 0.75, vWNrm.y) * uRain;
vec2 dD1 = dDrops(dUV, 0.0046, 3.0), dD2 = dDrops(dUV + 0.31, 0.0023, 9.0);
float dDrop = max(dD1.y, dD2.y) * dUp, dDropH = max(dD1.x, dD2.x) * dUp;
float dWet = dUp * (0.5 + 0.5 * smoothstep(0.3, 0.7, dSm));
roughnessFactor = clamp(roughnessFactor + dR, 0.10, 1.0);
roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.5, dWet);
roughnessFactor = mix(roughnessFactor, 0.10, dDrop);
diffuseColor.rgb *= 1.0 - 0.18 * dWet;
`,
  CC = `
normal = dBump(normal, dHt + dDropH * 0.32);
`;
function Bf(i, e) {
  return (
    (i.onBeforeCompile = (t) => {
      ((t.uniforms.uKind = { value: e }),
        (t.uniforms.uRain = Wv),
        (t.vertexShader = t.vertexShader
          .replace(
            "#include <common>",
            `#include <common>
varying vec3 vObjP; varying vec3 vWNrm; varying vec3 vONrm;`,
          )
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
vObjP = position; vONrm = normal; vWNrm = normalize(mat3(modelMatrix) * normal);`,
          )),
        (t.fragmentShader = t.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
` + AC,
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
` + RC,
          )
          .replace(
            "#include <normal_fragment_maps>",
            `#include <normal_fragment_maps>
` + CC,
          )));
    }),
    (i.customProgramCacheKey = () => "pac9-detail-" + e),
    i
  );
}
// ============================================================================
// 几猫九式突击步枪 (PAC-9 / KR-7) - 核心动力学与视模运行时系统 (Viewmodel System)
// ============================================================================

const Vector3_ = W;
const Quaternion_ = Lt;

/** 弹匣容量 (30发标准穿甲步枪弹) */
const MAG_CAPACITY = 30;
/** 初始备用弹药量 */
const DEFAULT_RESERVE_AMMO = 150;
/** 理论射速 (RPM - 每分钟 720 发) */
const FIRE_RATE_RPM = 720;
/** 单发对甲基础伤害 */
const BASE_DAMAGE = 26;
/** 最大有效杀伤射程 (米) */
const MAX_FIRE_RANGE = 300;

/** 腰射 (Hipfire) 默认视模变换偏移: p = [x,y,z], r = [pitch,yaw,roll] */
const POSE_HIPFIRE = {
  p: [0.118, -0.122, -0.275],
  r: [0.034, 0.085, -0.03],
};

/** 开镜瞄准 (ADS - Aim Down Sights) 视模对齐偏移 (全息红点光轴居中) */
const POSE_ADS = {
  p: [0, -mi.sightY, -0.135],
  r: [0, 0, 0],
};

/** 战术疾跑 (Sprint) 低姿出枪偏移 */
const POSE_SPRINT = {
  p: [-0.035, 0.004, 0.03],
  r: [-0.04, 0.62, 0.26],
};

/** 战术换弹姿态基准偏移 */
const POSE_RELOAD = {
  p: [-0.03, 0.1, -0.02],
  r: [0.46, 0.22, -0.8],
};

/** 战术换弹时长 (秒) */
const RELOAD_DURATION_TACTICAL = 2.1;
/** 空仓挂机换弹时长 (秒，包含左手拉栓复进动作) */
const RELOAD_DURATION_EMPTY = 2.72;

/**
 * Ken Perlin 五次平滑阶跃函数 (Smootherstep: 6t^5 - 15t^4 + 10t^3)
 * @param {number} t
 * @returns {number}
 */
const smootherstep = (t) => {
  t = Fo(t);
  return t * t * t * (t * (6 * t - 15) + 10);
};

/**
 * 创建二阶阻尼简谐振子弹簧 (Damped Harmonic Oscillator)
 * @param {number} stiffness 弹性系数 k
 * @param {number} damping 阻尼系数 c
 */
const createSpring = (stiffness, damping) => ({
  x: 0,
  v: 0,
  k: stiffness,
  c: damping,
});

/**
 * 物理弹簧步进积分器 (包含自适应微步进子切片，杜绝高帧率/卡顿时欧拉积分发散)
 * @param {object} spring 弹簧状态对象
 * @param {number} target 目标平衡位置
 * @param {number} dt 帧耗时 (秒)
 * @returns {number} 当前弹簧位移
 */
function stepSpring(spring, target, dt) {
  const steps = dt > 0.012 ? Math.ceil(dt / 0.008) : 1;
  const subDt = dt / steps;
  for (let i = 0; i < steps; i++) {
    spring.v += ((target - spring.x) * spring.k - spring.v * spring.c) * subDt;
    spring.x += spring.v * subDt;
  }
  return spring.x;
}

/**
 * 欧拉角快捷转换为四元数
 */
const eulerToQuat = (x, y, z, order = "XYZ") =>
  new Quaternion_().setFromEuler(new In(x, y, z, /** @type {any} */ (order)));

/**
 * 创建几猫九式突击步枪视模控制器 (PAC-9 First-Person Viewmodel Controller)
 * @param {import('./types').EngineContext} ctx 全局引擎上下文 (包含 camera, player, input, combat, fx, mats, events 等)
 * @returns {Promise<import('./types').WeaponState>}
 */
async function createWeapon(ctx) {
  const root = new wt();
  root.name = "viewmodel-pac9";

  // 1. 获取程序化几何体构件
  const geo = w_();

  // 2. 材质分配与三向投影贴图纹理
  const matScaleMap = {
    anodized_black: 2,
    gunmetal: 2,
    brass: 4,
    glove_fabric: 3,
    rubber: 4,
  };
  const getProceduralMat = (name) =>
    ctx.mats.get(name, {
      triplanar: true,
      vertexColors: true,
      scale: matScaleMap[name] || 1,
    });

  const createMesh = (geometry, material) => {
    const mesh = new Qe(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  };

  // 枪身机匣黑色阳极氧化铝材质
  const matAnodized = new Qt({
    color: new Ve(0.0085, 0.009, 0.0105),
    roughness: 0.4,
    metalness: 0.45,
    vertexColors: true,
  });
  matAnodized.name = "pac9_anodised";
  Bf(matAnodized, 0);

  // 哑光印字/刻字材质
  const matMatte = new Qt({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    vertexColors: true,
  });
  matMatte.name = "pac9_matte";

  // 枪机枪管磷化/发黑军用高碳钢材质
  const matPhosphate = new Qt({
    color: new Ve(0.016, 0.016, 0.0165),
    roughness: 0.5,
    metalness: 0.7,
    vertexColors: true,
  });
  matPhosphate.name = "pac9_phosphate";
  Bf(matPhosphate, 1);

  // 工程塑料下机匣/握把聚合物材质
  const matPolymer = new Qt({
    color: new Ve(0.0125, 0.0128, 0.0135),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymer.name = "pac9_polymer";
  Bf(matPolymer, 2);

  // 棕褐色军规抗冲击弹匣工程塑料
  const matPolymerTan = new Qt({
    color: new Ve(0.105, 0.08, 0.05),
    roughness: 0.62,
    metalness: 0,
    vertexColors: true,
  });
  matPolymerTan.name = "pac9_polymer_tan";
  Bf(matPolymerTan, 2);

  // 组装机匣主体
  root.add(
    createMesh(geo.ano, matAnodized),
    createMesh(geo.gun, matPhosphate),
    createMesh(geo.poly, matPolymer),
    createMesh(geo.plain, matMatte),
  );

  // 组装往复式枪机组 (Bolt Carrier Group)
  const boltMesh = createMesh(geo.bolt, matPhosphate);
  root.add(boltMesh);

  // 组装可拆卸供弹具 (30发弹匣与首发黄铜穿甲弹)
  const magGroup = new wt();
  const magDefaultPos = new Vector3_().fromArray(mi.magPos);
  magGroup.position.copy(magDefaultPos);

  const topRoundMesh = createMesh(geo.round, getProceduralMat("brass"));
  magGroup.add(createMesh(geo.mag, matPolymerTan), topRoundMesh);
  root.add(magGroup);

  // 组装高精度机匣激光刻字与导轨刻度 (PAC-9 刻标、警示标记、快慢机 AUTO/SEMI/SAFE)
  let markingsMesh = null;
  try {
    markingsMesh = F_([
      ["model", -0.0168, -0.0315, 0.064, 0.0095, "L"],
      ["maker", -0.0168, -0.042, 0.064, 0.003, "L"],
      ["cal", -0.0168, -0.0465, 0.064, 0.0028, "L"],
      ["prop", -0.0168, -0.071, 0.066, 0.0026, "L"],
      ["auto", -0.0168, -0.027, -0.0335, 0.0036, "L"],
      ["semi", -0.0168, -0.0262, -0.049, 0.0036, "L"],
      ["safe", -0.0168, -0.0362, -0.062, 0.0036, "L"],
      ["rack", -0.0168, -0.004, -0.205, 0.02, "L"],
      ["warn", -0.0181, -0.01, 0.03, 0.0062, "L"],
      ["optic", -0.0195, 0.0735, 0.021, 0.0024, "L"],
      ["model", 0.0168, -0.0315, 0.068, 0.0095, "R"],
      ["warn", 0.0168, -0.066, 0.066, 0.0075, "R"],
      ["rack", 0.0168, -0.004, -0.205, 0.02, "R"],
      ["auto", 0.0168, -0.027, -0.0335, 0.0036, "R"],
      ["safe", 0.0168, -0.0362, -0.062, 0.0036, "R"],
      ["optic", 0.0195, 0.0735, 0.021, 0.0024, "R"],
      ["cal", 0.0181, 0.0245, -0.055, 0.0026, "R"],
      ["r2", 0, 0.04365, -0.0816, 0.003, "T"],
      ["r4", 0, 0.04365, -0.0616, 0.003, "T"],
      ["r6", 0, 0.04365, 0.0584, 0.003, "T"],
      ["r8", 0, 0.04365, 0.0784, 0.003, "T"],
      ["r10", 0, 0.04365, 0.0984, 0.003, "T"],
      ["r12", 0, 0.04365, 0.1184, 0.003, "T"],
    ]);
    markingsMesh.castShadow = false;
    markingsMesh.receiveShadow = true;
    markingsMesh.frustumCulled = false;
    root.add(markingsMesh);
  } catch (err) {
    console.warn("[weapon] markings skipped: " + err);
  }

  // 全息瞄准镜分划板与准直物镜
  const opticSightMesh = U_(
    mi.window.map((pt) => [pt[0] * 1.01, (pt[1] - mi.sightY) * 1.01 + mi.sightY]),
    mi.lensF + 0.0025,
  );
  opticSightMesh.frustumCulled = false;
  root.add(opticSightMesh);

  // 枪口焰粒子与几何体
  const muzzleFlashMesh = N_();
  muzzleFlashMesh.position.fromArray(mi.muzzle);
  muzzleFlashMesh.visible = false;
  root.add(muzzleFlashMesh);

  // 3. 动力学手套与骨骼姿态系统
  const projectDirection = (quat, dir, mirror) => {
    const vec = new Vector3_(dir[0], dir[1], dir[2])
      .normalize()
      .applyQuaternion(quat.clone().invert());
    if (mirror) vec.x *= -1;
    return [vec.x, vec.y, vec.z];
  };

  // 右手（持握机匣握把，扣扳机手）
  const rightHandBaseQuat = eulerToQuat(-0.24, 0, 0).multiply(eulerToQuat(0, 0, -Math.PI / 2));
  const rightHandRig = Vv({
    mirror: false,
    fingers: [null, [0.62, 1.72, 0.8, 0], [0.68, 1.7, 0.8, -0.03], [0.74, 1.66, 0.8, -0.09]],
    indexPoses: [
      [0.1, 0.16, 0.1, 0.05],
      [0.46, 1.15, 0.5, 0],
    ],
    thumb: [
      projectDirection(rightHandBaseQuat, [-0.85, 0.05, -0.5]),
      projectDirection(rightHandBaseQuat, [-0.6, -0.05, -0.8]),
      projectDirection(rightHandBaseQuat, [-0.05, -0.2, -0.97]),
    ],
    forearm: projectDirection(rightHandBaseQuat, [0.27, -0.44, 0.86]),
    sleeve: 0.34,
  });

  const rightHandGroup = new wt();
  rightHandGroup.quaternion.copy(rightHandBaseQuat);
  rightHandGroup.position
    .fromArray(mi.grip)
    .sub(new Vector3_(0.006, -0.031, -0.085).applyQuaternion(rightHandBaseQuat));

  const matGloveFabric = getProceduralMat("glove_fabric");
  rightHandGroup.add(createMesh(rightHandRig.fabric, matGloveFabric));

  const triggerFingerMesh = createMesh(rightHandRig.index[0].clone(), matGloveFabric);
  rightHandGroup.add(triggerFingerMesh);
  root.add(rightHandGroup);

  // 扳机手指渐变插值函数 (扣动扳机动作动力学)
  const indexAttrRelaxed = rightHandRig.index[0].attributes;
  const indexAttrPulled = rightHandRig.index[1].attributes;
  let lastFingerProgress = -1;

  function updateTriggerFinger(progress) {
    if (Math.abs(progress - lastFingerProgress) < 0.004) return;
    lastFingerProgress = progress;

    const posAttr = triggerFingerMesh.geometry.attributes.position;
    const normAttr = triggerFingerMesh.geometry.attributes.normal;
    const relaxedPos = indexAttrRelaxed.position.array;
    const pulledPos = indexAttrPulled.position.array;
    const relaxedNorm = indexAttrRelaxed.normal.array;
    const pulledNorm = indexAttrPulled.normal.array;

    for (let i = 0; i < relaxedPos.length; i++) {
      posAttr.array[i] = relaxedPos[i] + (pulledPos[i] - relaxedPos[i]) * progress;
      normAttr.array[i] = relaxedNorm[i] + (pulledNorm[i] - relaxedNorm[i]) * progress;
    }
    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
  }

  // 左手（托住战术护木、拔插弹匣、拉动枪栓）
  const leftHandBaseQuat = eulerToQuat(0, 0, Math.PI / 2).multiply(eulerToQuat(0.06, 0, 0));
  const leftHandRig = Vv({
    mirror: true,
    fingers: [
      [1.27, 1.42, 0.75, 0.02],
      [1.3, 1.45, 0.75, 0],
      [1.3, 1.45, 0.75, -0.02],
      [1.33, 1.45, 0.75, -0.05],
    ],
    thumb: [
      projectDirection(leftHandBaseQuat, [0, 0.25, -0.97], true),
      projectDirection(leftHandBaseQuat, [0.05, 0.1, -0.99], true),
      projectDirection(leftHandBaseQuat, [0, 0, -1], true),
    ],
    forearm: projectDirection(leftHandBaseQuat, [-0.5, -0.35, 0.79], true),
    sleeve: 0.34,
  });

  const leftHandGroup = new wt();
  leftHandGroup.add(createMesh(leftHandRig.fabric, matGloveFabric));
  root.add(leftHandGroup);

  // 左手 IK 动画空间关键帧构造辅助
  const wristOffset = new Vector3_(0, -0.015, -0.055);
  const makePose = (quat, posArr, offset = wristOffset) => ({
    q: quat.clone(),
    p: new Vector3_(posArr[0], posArr[1], posArr[2]).sub(offset.clone().applyQuaternion(quat)),
  });
  const offsetPose = (base, dx, dy, dz, overrideQuat = null) => ({
    q: overrideQuat ? overrideQuat.clone() : base.q.clone(),
    p: base.p.clone().add(new Vector3_(dx, dy, dz)),
  });

  const leftHandHoldQuat = eulerToQuat(0, 0, Math.PI / 2).multiply(eulerToQuat(0.12, 0, 0));
  const poseGripHandguard = makePose(leftHandBaseQuat, [-0.015, -0.062, -0.236]);
  const poseAtMagWell = makePose(leftHandHoldQuat, [-0.0135, -0.15, -0.0745]);
  const poseApproachMag = offsetPose(poseAtMagWell, -0.035, -0.02, 0.01);
  const poseDropMagDown = offsetPose(
    poseAtMagWell,
    -0.06,
    -0.3,
    0.13,
    leftHandHoldQuat.clone().multiply(eulerToQuat(-0.5, 0, 0.25)),
  );
  const poseInsertMagPrep = offsetPose(poseAtMagWell, 0, -0.035, 0.004);
  const poseMagClickIn = offsetPose(poseAtMagWell, -0.004, -0.06, 0);
  const poseTapBasePlate = offsetPose(poseAtMagWell, 0, -0.012, 0);

  // 拉栓关键手位
  const rackQuat = eulerToQuat(-0.6, 0, 0).multiply(
    new Quaternion_().setFromRotationMatrix(
      new Ye().makeBasis(new Vector3_(0, 0, 1), new Vector3_(-1, 0, 0), new Vector3_(0, -1, 0)),
    ),
  );
  const poseGripChargingHandle = makePose(
    rackQuat,
    [mi.handlePos[0] - 0.004, mi.handlePos[1], mi.handlePos[2]],
    new Vector3_(0, -0.024, -0.118),
  );
  const poseRackBoltBack = offsetPose(poseGripChargingHandle, 0, 0, mi.boltTravel);

  // 换弹关键帧时间表: [时间(秒), 姿态]
  const kfTacticalReload = [
    [0, poseGripHandguard],
    [0.1, poseGripHandguard],
    [0.36, poseApproachMag],
    [0.44, poseAtMagWell],
    [0.5, poseAtMagWell],
    [0.8, poseDropMagDown],
    [0.98, poseDropMagDown],
    [1.28, poseInsertMagPrep],
    [1.35, poseAtMagWell],
    [1.45, poseMagClickIn],
    [1.52, poseTapBasePlate],
    [1.62, poseAtMagWell],
    [1.7, poseApproachMag],
    [2.02, poseGripHandguard],
    [9, poseGripHandguard],
  ];

  // 空仓换弹时间表 (增加拉动拉机柄动作)
  const kfEmptyReload = [
    ...kfTacticalReload.slice(0, 12),
    [1.7, poseApproachMag],
    [1.96, poseGripChargingHandle],
    [2.02, poseGripChargingHandle],
    [2.14, poseRackBoltBack],
    [2.19, poseRackBoltBack],
    [2.26, poseGripChargingHandle],
    [2.36, poseGripChargingHandle],
    [2.66, poseGripHandguard],
    [9, poseGripHandguard],
  ];

  // 关键帧时间戳节点
  const T_MAG_OUT = 0.47;
  const T_MAG_IN = 1.345;
  const T_RACK_START = 2.02;
  const T_RACK_BACK = 2.14;
  const T_RACK_RELEASE = 2.19;

  const tempVec = new Vector3_();
  const tempQuat1 = new Quaternion_();
  const tempQuat2 = new Quaternion_();

  function sampleHandKeyframes(keyframes, time) {
    let idx = 0;
    while (idx < keyframes.length - 2 && time > keyframes[idx + 1][0]) {
      idx++;
    }
    const k0 = keyframes[idx];
    const k1 = keyframes[idx + 1];
    const alpha = smootherstep((time - k0[0]) / Math.max(1e-4, k1[0] - k0[0]));
    tempVec.copy(k0[1].p).lerp(k1[1].p, alpha);
    tempQuat1.copy(k0[1].q).slerp(k1[1].q, alpha);
  }

  leftHandGroup.position.copy(poseGripHandguard.p);
  leftHandGroup.quaternion.copy(poseGripHandguard.q);

  const leftHandMagInvert = leftHandHoldQuat.clone().invert();

  // 设置第一人称视模渲染层级
  root.traverse((obj) => {
    obj.layers.set(zc);
  });
  ctx.camera.add(root);

  // 统计几何体面数与网格数
  const totalTris =
    Object.values(geo).reduce((sum, g) => sum + Kc(g), 0) +
    Kc(rightHandRig.fabric) +
    Kc(rightHandRig.index[0]) +
    Kc(leftHandRig.fabric) +
    (markingsMesh ? Kc(markingsMesh.geometry) : 0) +
    2;

  let totalMeshes = 0;
  root.traverse((obj) => {
    if (/** @type {any} */ (obj).isMesh) totalMeshes++;
  });
  console.log(
    "[weapon] " +
      mi.name +
      ": " +
      Math.round(totalTris) +
      " tris, " +
      totalMeshes +
      " meshes (flash only while firing)",
  );

  const random = ctx.rng && ctx.rng.fork ? ctx.rng.fork() : Math.random;

  // 运行时物理与动画状态对象
  const state = {
    t: 0,
    cooldown: 0,
    prevFire: false,
    dryDone: false,
    autoReload: -1,
    reload: null,
    burst: 0,
    lastShot: -9,
    bloom: 0,
    heat: 0,
    smoke: 0,
    smokeTick: 0,
    adsLin: 0,
    adsE: 0,
    sprintT: 0,
    reloadW: 0,
    rackW: 0,
    bobPhase: 0,
    bobAmt: 0,
    finger: 0,
    boltT: 9,
    boltLocked: false,
    flashT: 0,
    flashDur: 0.05,
    recPhase: 0,
    wasGround: true,
    lastVy: 0,
    spreadS: 0.0125,
    idleT: 0,
    inspect: -1,

    // 动力学弹簧
    kZ: createSpring(520, 30), // 后坐力机匣向后冲量
    kP: createSpring(380, 26), // 后坐力枪口上扬 Pitch
    kY: createSpring(300, 22), // 后坐力水平游离 Yaw
    kR: createSpring(300, 20), // 后坐力枪身扭转 Roll
    swY: createSpring(110, 15), // 瞄准水平摆动 (Look Sway Yaw)
    swP: createSpring(110, 15), // 瞄准垂直摆动 (Look Sway Pitch)
    jY: createSpring(140, 13), // 跳跃/下落水平晃动
    jP: createSpring(140, 13), // 跳跃/下落垂直晃动
    bump: createSpring(600, 30), // 着陆撞击弹簧
  };

  const debug = {
    freeze: false,
    reloadT: null,
    empty: false,
    flash: false,
    noFire: false,
  };

  const weapon = {
    name: mi.name,
    ammo: MAG_CAPACITY,
    magSize: MAG_CAPACITY,
    reserve: DEFAULT_RESERVE_AMMO,
    state: "idle",
    ads: 0,
    spread: 0.0125,
    damage: BASE_DAMAGE,
    rpm: FIRE_RATE_RPM,
    root,
    debug,
    info: {
      tris: Math.round(totalTris),
      meshes: totalMeshes,
    },
    update,
    reset,
    setVisible(v) {
      root.visible = !!v;
    },
    muzzleWorld: getMuzzleWorldPos,
    reloadNow: triggerReload,
    addAmmo(count) {
      weapon.reserve += count;
    },
    setWetness(w) {
      Wv.value = Math.max(0, Math.min(1, +w || 0));
    },
    snap() {
      state.adsLin = ctx.input.ads ? 1 : 0;
      for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
        state[s].x = 0;
        state[s].v = 0;
      }
      state.sprintT = ctx.player.sprinting ? 1 : 0;
    },
  };

  /**
   * 重置枪械所有状态
   */
  function reset() {
    weapon.ammo = MAG_CAPACITY;
    weapon.reserve = DEFAULT_RESERVE_AMMO;
    weapon.state = "idle";
    weapon.ads = 0;
    Object.assign(state, {
      cooldown: 0,
      prevFire: false,
      dryDone: false,
      autoReload: -1,
      reload: null,
      burst: 0,
      lastShot: -9,
      bloom: 0,
      heat: 0,
      smoke: 0,
      adsLin: 0,
      adsE: 0,
      sprintT: 0,
      reloadW: 0,
      boltT: 9,
      boltLocked: false,
      flashT: 0,
      idleT: 0,
      inspect: -1,
    });
    for (const s of ["kZ", "kP", "kY", "kR", "swY", "swP", "jY", "jP", "bump"]) {
      state[s].x = 0;
      state[s].v = 0;
    }
    topRoundMesh.visible = true;
    magGroup.visible = true;
    magGroup.position.copy(magDefaultPos);
    magGroup.quaternion.identity();
    leftHandGroup.position.copy(poseGripHandguard.p);
    leftHandGroup.quaternion.copy(poseGripHandguard.q);
  }

  /**
   * 计算枪身局部点变换到世界坐标 (考虑武器视场角投影补偿)
   */
  function localPointToWorld(localArr, outVec) {
    root.updateMatrix();
    outVec.fromArray(localArr).applyMatrix4(root.matrix);
    const cam = ctx.camera;
    const fovCompensation =
      Math.tan((cam.fov * Math.PI) / 360) / Math.tan((ctx.viewCamera.fov * Math.PI) / 360);
    outVec.x *= fovCompensation;
    outVec.y *= fovCompensation;
    return outVec.applyQuaternion(cam.quaternion).add(cam.position);
  }

  function getMuzzleWorldPos(outVec = new Vector3_()) {
    return localPointToWorld(mi.muzzle, outVec);
  }

  /**
   * 触发主动换弹
   */
  function triggerReload() {
    if (state.reload || weapon.ammo >= weapon.magSize || weapon.reserve <= 0) return false;
    const isEmpty = weapon.ammo <= 0;
    state.reload = {
      t: 0,
      T: isEmpty ? RELOAD_DURATION_EMPTY : RELOAD_DURATION_TACTICAL,
      empty: isEmpty,
      f: {},
    };
    state.autoReload = -1;
    ctx.events.emit("weapon:reload", { phase: "start", empty: isEmpty });
    return true;
  }

  // 临时向量
  const vRayDir = new Vector3_();
  const vMuzzlePos = new Vector3_();
  const vHitPos = new Vector3_();
  const vEjectPos = new Vector3_();
  const vShellVel = new Vector3_();
  const vEyePos = new Vector3_();

  /**
   * 击发核心物理过程 (Raycast, Ballistics, Visual/Audio Effects)
   */
  function fireShot() {
    const player = ctx.player;
    const camera = ctx.camera;

    weapon.ammo--;
    state.burst++;
    state.lastShot = state.t;
    state.heat = Math.min(1.3, state.heat + 0.05);

    // 弹道锥形随机散布
    const spread = weapon.spread;
    const spreadAngle = random() * Math.PI * 2;
    const spreadRadius = Math.tan(spread) * Math.sqrt(random());

    vRayDir
      .set(Math.cos(spreadAngle) * spreadRadius, Math.sin(spreadAngle) * spreadRadius, -1)
      .normalize()
      .applyQuaternion(camera.quaternion);

    vEyePos.copy(player.eye || camera.position);

    // 命中测试 (射线检测)
    let hitResult = null;
    try {
      hitResult = ctx.combat.playerShot(vEyePos, vRayDir, {
        damage: BASE_DAMAGE,
        range: MAX_FIRE_RANGE,
      });
    } catch (e) {}

    if (hitResult && hitResult.point) {
      vHitPos.copy(hitResult.point);
    } else {
      vHitPos.copy(vEyePos).addScaledVector(vRayDir, MAX_FIRE_RANGE);
    }

    getMuzzleWorldPos(vMuzzlePos);

    // 触发特效 (弹道曳光与抛壳)
    const fx = ctx.fx;
    if (fx) {
      if (fx.tracer) fx.tracer(vMuzzlePos, vHitPos);
      if (fx.shell) {
        localPointToWorld(mi.eject, vEjectPos);
        vShellVel
          .set(2 + random() * 1.2, 1.2 + random() * 0.8, 0.5 - random() * 0.6)
          .applyQuaternion(camera.quaternion);
        if (player.vel) vShellVel.add(player.vel);
        fx.shell(vEjectPos, vShellVel);
      }
    }

    // 枪口动态点光源闪烁
    if (ctx.render && ctx.render.lightPool && ctx.render.lightPool.flash) {
      ctx.render.lightPool.flash(vMuzzlePos, 0xffa020, 45, 9, 0.05);
    }

    ctx.events.emit("weapon:fire", {
      origin: vEyePos,
      dir: vRayDir,
      muzzle: vMuzzlePos,
      ads: state.adsE,
    });

    // 后坐力计算与施加给玩家视角
    const adsFactor = bi(1, 0.55, state.adsE) * (player.crouching ? 0.85 : 1);
    const burstCount = state.burst;
    const recoilScale = burstCount <= 9 ? 1 : 0.38;
    const recoilYaw =
      (burstCount < 4
        ? (random() - 0.5) * 0.0022
        : Math.sin(burstCount * 0.57 + state.recPhase) * 0.0042 + (random() - 0.5) * 0.002) *
      adsFactor;

    if (player.addRecoil) {
      player.addRecoil(0.0068 * recoilScale * adsFactor * (0.85 + random() * 0.3), recoilYaw);
    }
    if (player.addShake) {
      player.addShake(0.12 * adsFactor);
    }

    // 视模弹簧冲量激振
    state.kZ.v += 1.5 * bi(1, 0.6, state.adsE);
    state.kP.v += 1.5 * adsFactor;
    state.kY.v += (random() - 0.5) * 1 * adsFactor;
    state.kR.v += (random() - 0.5) * 1.8 * adsFactor;
    state.bloom = Math.min(1, state.bloom + 0.17);
    state.flashT = state.flashDur = 0.036 + random() * 0.02;

    // 枪口焰 Shader 参数
    const flashUniforms = muzzleFlashMesh.material.uniforms;
    flashUniforms.uSeed.value = random() * 100;
    flashUniforms.uJet.value = 0.6 + random() * 0.6;
    muzzleFlashMesh.rotation.z = (random() - 0.5) * 0.4;

    const flashScale = (0.8 + random() * 0.5) * bi(1, 0.62, state.adsE);
    muzzleFlashMesh.scale.set(flashScale, flashScale, flashScale * (0.8 + random() * 0.5));

    state.boltT = 0;
    if (weapon.ammo <= 0) {
      state.boltLocked = true;
      topRoundMesh.visible = false;
    }
  }

  /**
   * 视模每帧动力学更新与姿态插值
   * @param {number} dt 帧耗时 (秒)
   */
  function update(dt) {
    const player = ctx.player;
    const input = ctx.input;
    if (!player || !input || !player.alive) {
      state.prevFire = false;
      if (muzzleFlashMesh) muzzleFlashMesh.visible = false;
      return;
    }

    state.t += dt;

    // 射击输入检测
    const wantsFire = !!input.fire && root.visible && !debug.noFire;
    state.prevFire = wantsFire;
    if (!wantsFire) state.dryDone = false;

    // 疾跑状态判定
    const isSprinting = !!player.sprinting && !wantsFire && !input.ads && !state.reload;
    state.sprintT = kn(state.sprintT, isSprinting ? 1 : 0, 9, dt);

    // 换弹按键与空仓自动换弹
    if (input.pressed && input.pressed("reload")) {
      triggerReload();
    }
    if (state.autoReload >= 0) {
      state.autoReload -= dt;
      if (state.autoReload < 0) triggerReload();
    }

    // 换弹时间线机理与左右手状态机
    let rackBoltProgress = 0;
    if (debug.reloadT != null && !state.reload) {
      state.reload = {
        t: 0,
        T: debug.empty ? RELOAD_DURATION_EMPTY : RELOAD_DURATION_TACTICAL,
        empty: debug.empty,
        f: {},
      };
    }

    if (state.reload) {
      const reloadData = state.reload;
      if (debug.reloadT != null) {
        reloadData.t = debug.reloadT;
      } else {
        reloadData.t += dt;
      }
      const curT = reloadData.t;

      const triggerPhase = (phaseName, timestamp) => {
        if (curT >= timestamp && !reloadData.f[phaseName]) {
          reloadData.f[phaseName] = 1;
          ctx.events.emit("weapon:reload", { phase: phaseName, empty: reloadData.empty });
          return true;
        }
        return false;
      };

      // 阶段 1: 拔出旧弹匣
      if (triggerPhase("magout", T_MAG_OUT)) {
        state.bump.v -= 0.25;
      }
      if (curT > 0.86 && !reloadData.f.fresh) {
        reloadData.f.fresh = 1;
        topRoundMesh.visible = true;
      }

      // 阶段 2: 插入新弹匣
      if (triggerPhase("magin", T_MAG_IN)) {
        state.bump.v += 0.55;
        const addCount = Math.min(weapon.magSize - weapon.ammo, weapon.reserve);
        weapon.ammo += addCount;
        weapon.reserve -= addCount;
        if (!reloadData.empty) {
          state.boltLocked = false;
        }
      }

      // 阶段 3: 拍实弹匣底板
      if (curT >= 1.5 && !reloadData.f.tap) {
        reloadData.f.tap = 1;
        state.bump.v += 0.4;
      }

      // 阶段 4: 空仓换弹专属 —— 拉动拉机柄
      if (reloadData.empty) {
        if (curT >= T_RACK_START) {
          rackBoltProgress =
            curT < T_RACK_BACK
              ? smootherstep((curT - T_RACK_START) / (T_RACK_BACK - T_RACK_START))
              : curT < T_RACK_RELEASE
                ? 1
                : Math.max(0, 1 - (curT - T_RACK_RELEASE) / 0.035);
        }
        if (triggerPhase("bolt", T_RACK_RELEASE)) {
          state.boltLocked = false;
          state.bump.v += 0.3;
          state.kZ.v -= 0.5;
        }
      }

      // 关键帧插值驱动左手位姿
      sampleHandKeyframes(reloadData.empty ? kfEmptyReload : kfTacticalReload, curT);
      leftHandGroup.position.copy(tempVec);
      leftHandGroup.quaternion.copy(tempQuat1);

      // 弹匣跟随手部移动（拔出至插入区间）
      if (curT >= T_MAG_OUT && curT < T_MAG_IN) {
        tempQuat2.copy(tempQuat1).multiply(leftHandMagInvert);
        magGroup.quaternion.copy(tempQuat2);
        magGroup.position
          .copy(magDefaultPos)
          .sub(poseAtMagWell.p)
          .applyQuaternion(tempQuat2)
          .add(tempVec);
      } else {
        magGroup.quaternion.identity();
        magGroup.position.copy(magDefaultPos);
      }

      const enterBlend = smootherstep(curT / 0.3);
      const exitBlend = 1 - smootherstep((curT - (reloadData.T - 0.46)) / 0.4);
      state.reloadW = Math.min(enterBlend, exitBlend);
      state.rackW = reloadData.empty ? smootherstep((curT - 1.62) / 0.3) * exitBlend : 0;

      if (curT >= reloadData.T && debug.reloadT == null) {
        state.reload = null;
        state.reloadW = 0;
        state.rackW = 0;
        ctx.events.emit("weapon:reload", { phase: "done" });
        leftHandGroup.position.copy(poseGripHandguard.p);
        leftHandGroup.quaternion.copy(poseGripHandguard.q);
      }
    }

    // 冷却与射击执行
    state.cooldown -= dt;
    const canFire = !state.reload && state.sprintT < 0.45;
    if (wantsFire && canFire) {
      if (weapon.ammo > 0) {
        let maxShotsPerFrame = 0;
        while (state.cooldown <= 0 && weapon.ammo > 0 && maxShotsPerFrame < 3) {
          fireShot();
          state.cooldown += 60 / FIRE_RATE_RPM;
          maxShotsPerFrame++;
        }
      } else if (!state.dryDone) {
        state.dryDone = true;
        ctx.events.emit("weapon:dry", {});
        state.bump.v -= 0.08;
        if (weapon.reserve > 0) {
          state.autoReload = 0.32;
        }
      }
    }

    if (state.cooldown < 0) state.cooldown = Math.max(state.cooldown, -0.001);

    // 连发散布与枪管热量、轻微枪口冒烟
    if (state.t - state.lastShot > 0.24) {
      if (state.burst > 0) state.recPhase = random() * 6.28;
      state.burst = 0;
    }
    state.bloom = Math.max(0, state.bloom - dt * 1.5);

    if (
      state.t - state.lastShot > 0.11 &&
      state.t - state.lastShot < 0.11 + dt * 1.5 &&
      state.heat > 0.4
    ) {
      state.smoke = Math.min(1.6, state.heat * 1.3);
    }
    if (state.smoke > 0) {
      state.smoke -= dt;
      state.smokeTick -= dt;
      if (state.smokeTick <= 0 && ctx.fx && ctx.fx.smoke) {
        state.smokeTick = 0.085;
        getMuzzleWorldPos(vMuzzlePos);
        ctx.fx.smoke(vMuzzlePos, {
          size: 0.1 + state.smoke * 0.06,
          life: 1.3,
          rise: 0.5,
          count: 1,
          alpha: 0.22,
        });
      }
    }
    state.heat = Math.max(0, state.heat - dt * 0.2);

    // ADS (开镜瞄准) 进度平滑
    const wantsAds = !!input.ads && !state.reload && state.sprintT < 0.35;
    state.adsLin = Zn(state.adsLin + (wantsAds ? dt : -dt) / 0.18, 0, 1);
    state.adsE = smootherstep(state.adsLin);
    weapon.ads = state.adsE;

    // 动态散布锥形角计算
    const moveSpeed = player.speed || 0;
    const speedRatio = Fo(moveSpeed / 6);
    const targetSpread =
      bi(0.0125, 0.0012, state.adsE) +
      speedRatio * bi(0.013, 0.004, state.adsE) +
      state.bloom * bi(0.0065, 0.0022, state.adsE) +
      (player.onGround === false ? 0.022 : 0) -
      (player.crouching ? 0.002 * (1 - state.adsE) : 0);

    state.spreadS = kn(state.spreadS, targetSpread, 18, dt);
    weapon.spread = state.spreadS;

    // 闲置检视 (Weapon Inspect) 动画触发机制
    const isMovingOrLooking =
      wantsFire ||
      !!input.ads ||
      !!state.reload ||
      moveSpeed > 0.2 ||
      (input.look && Math.abs(input.look.dx) + Math.abs(input.look.dy) > 0.002) ||
      state.sprintT > 0.1;

    if (isMovingOrLooking) {
      state.idleT = 0;
      if (state.inspect >= 0) state.inspect = Math.max(state.inspect, 2.9);
    } else {
      state.idleT += dt;
    }
    if (state.inspect < 0 && state.idleT > 24) {
      state.inspect = 0;
    }

    let inspectPitch = 0;
    let inspectYaw = 0;
    let inspectRoll = 0;

    if (state.inspect >= 0) {
      const inspT = (state.inspect += dt);
      inspectPitch = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 1.4) / 0.5));
      inspectYaw = smootherstep((inspT - 1.5) / 0.5) * (1 - smootherstep((inspT - 2.8) / 0.5));
      inspectRoll = smootherstep(inspT / 0.5) * (1 - smootherstep((inspT - 2.9) / 0.5));
      if (inspT > 3.5) {
        state.inspect = -1;
        state.idleT = 0;
      }
    }

    // 枪械核心状态名更新
    weapon.state = state.reload
      ? "reloading"
      : state.inspect >= 0
        ? "inspect"
        : state.sprintT > 0.5
          ? "sprinting"
          : state.t - state.lastShot < 0.14
            ? "firing"
            : "idle";

    // 往复式枪机运动
    state.boltT += dt;
    const cycleDur = 0.072;
    let boltOffsetNorm = state.boltT < cycleDur ? Math.sin((Math.PI * state.boltT) / cycleDur) : 0;
    if (state.boltLocked && state.boltT > cycleDur * 0.5) {
      boltOffsetNorm = Math.max(boltOffsetNorm, 0.86);
    }
    boltMesh.position.z = mi.boltTravel * Math.max(boltOffsetNorm * 0.95, rackBoltProgress);

    // 扣动扳机手启动指关节变形
    state.finger = kn(state.finger, (wantsFire && canFire) || debug.flash ? 1 : 0, 30, dt);
    updateTriggerFinger(state.finger);

    // 枪口焰动态明暗
    const flashMatUniforms = muzzleFlashMesh.material.uniforms;
    if (debug.flash) {
      state.flashT = state.flashDur = 0.05;
      flashMatUniforms.uSeed.value = 3.7;
    }
    state.flashT -= dt;
    flashMatUniforms.uInt.value =
      state.flashT > 0 ? 9.5 * Math.sqrt(Math.max(0, state.flashT / state.flashDur)) : 0;
    flashMatUniforms.uHeat.value = Fo((state.heat - 0.45) / 0.8) * 2.2;
    muzzleFlashMesh.visible =
      flashMatUniforms.uInt.value > 0 || flashMatUniforms.uHeat.value > 0.02;

    if (debug.freeze) return;

    // 跑动步伐摆动 (Head & Weapon Bobbing)
    const isOnGround = player.onGround !== false;
    const velY = player.vel ? player.vel.y : 0;

    state.bobAmt = kn(state.bobAmt, isOnGround ? Fo(moveSpeed / 3.6) : 0, 8, dt);
    state.bobPhase += dt * (moveSpeed > 0.3 && isOnGround ? 5.2 + moveSpeed * 1.55 : 0);

    const curBobPhase = state.bobPhase;
    const bobIntensity = state.bobAmt * bi(1, 0.12, state.adsE) * (1 + state.sprintT * 1.4);
    const bobX = Math.sin(curBobPhase) * 0.006 * bobIntensity;
    const bobY =
      (Math.sin(2 * curBobPhase) * 0.0042 -
        Math.pow(0.5 + 0.5 * Math.cos(2 * curBobPhase + 0.6), 4) * 0.0048) *
      bobIntensity;

    const adsInvertRatio = bi(1, 0.3, state.adsE);
    const curTime = state.t;
    const swaySensitivity = bi(1, 0.4, state.adsE);

    // 瞄准随动摆动 (Look Sway)
    state.swY.v += Zn(input.look ? input.look.dx : 0, -0.2, 0.2) * 3.2 * swaySensitivity;
    state.swP.v += Zn(input.look ? input.look.dy : 0, -0.2, 0.2) * 2.6 * swaySensitivity;
    stepSpring(state.swY, 0, dt);
    stepSpring(state.swP, 0, dt);
    state.swY.x = Zn(state.swY.x, -0.09, 0.09);
    state.swP.x = Zn(state.swP.x, -0.07, 0.07);

    // 跳跃与着陆冲量反馈
    if (state.wasGround && !isOnGround && velY > 1) {
      state.jY.v -= 0.22;
      state.jP.v += 0.7;
    }
    if (!state.wasGround && isOnGround) {
      const landImpulse = Zn(-state.lastVy * 0.06, 0, 0.6);
      state.jY.v -= landImpulse;
      state.jP.v -= landImpulse * 3.2;
      state.kR.v += (random() - 0.5) * landImpulse * 2;
    }
    state.wasGround = isOnGround;
    if (!isOnGround) state.lastVy = velY;

    // 步进所有动力学物理弹簧
    stepSpring(state.jY, isOnGround ? 0 : Zn(-velY * 0.0045, -0.02, 0.024), dt);
    stepSpring(state.jP, isOnGround ? 0 : Zn(velY * 0.012, -0.06, 0.06), dt);
    stepSpring(state.kZ, 0, dt);
    stepSpring(state.kP, 0, dt);
    stepSpring(state.kY, 0, dt);
    stepSpring(state.kR, 0, dt);
    stepSpring(state.bump, 0, dt);

    // 最终位置与姿态融合
    const moveX = input.move ? input.move.x : 0;
    const moveY = input.move ? input.move.y : 0;
    const hipWeight = 1 - state.adsE;
    const adsWeight = state.adsE;
    const sprintWeight = state.sprintT;
    const reloadWeight = state.reloadW;
    const rackWeight = state.rackW;

    // 视模位置计算
    const finalPosX =
      bi(POSE_HIPFIRE.p[0], POSE_ADS.p[0], adsWeight) +
      POSE_SPRINT.p[0] * sprintWeight +
      POSE_RELOAD.p[0] * reloadWeight +
      bobX +
      Math.sin(curTime * 0.85 + 1) * 0.0012 * adsInvertRatio -
      state.swY.x * 0.06 -
      moveX * 0.004 * hipWeight -
      0.035 * inspectRoll;

    const finalPosY =
      bi(POSE_HIPFIRE.p[1], POSE_ADS.p[1], adsWeight) +
      POSE_SPRINT.p[1] * sprintWeight +
      POSE_RELOAD.p[1] * reloadWeight +
      bobY +
      Math.sin(curTime * 1.7) * 0.0016 * adsInvertRatio +
      state.swP.x * 0.05 +
      state.jY.x +
      state.bump.x * 0.6 +
      0.045 * inspectRoll;

    const finalPosZ =
      bi(POSE_HIPFIRE.p[2], POSE_ADS.p[2], adsWeight) +
      POSE_SPRINT.p[2] * sprintWeight +
      POSE_RELOAD.p[2] * reloadWeight +
      state.kZ.x * 0.55 +
      moveY * 0.004 * hipWeight * (1 - sprintWeight);

    // 视模旋转计算 (YXZ 欧拉角)
    const finalRotPitch =
      POSE_HIPFIRE.r[0] * hipWeight +
      POSE_SPRINT.r[0] * sprintWeight +
      POSE_RELOAD.r[0] * reloadWeight -
      0.16 * rackWeight +
      Math.sin(curTime * 1.7 + 0.8) * 0.0035 * adsInvertRatio +
      Math.sin(2 * curBobPhase + 0.5) * 0.008 * bobIntensity +
      state.swP.x +
      state.jP.x +
      state.kP.x +
      state.bump.x * 1.5 +
      0.3 * inspectRoll;

    const finalRotYaw =
      POSE_HIPFIRE.r[1] * hipWeight +
      POSE_SPRINT.r[1] * sprintWeight +
      POSE_RELOAD.r[1] * reloadWeight +
      Math.sin(curTime * 0.6) * 0.002 * adsInvertRatio +
      Math.sin(curBobPhase) * 0.01 * bobIntensity +
      state.swY.x +
      state.kY.x +
      0.18 * inspectRoll +
      0.25 * inspectYaw;

    const finalRotRoll =
      POSE_HIPFIRE.r[2] * hipWeight +
      POSE_SPRINT.r[2] * sprintWeight +
      POSE_RELOAD.r[2] * reloadWeight +
      0.62 * rackWeight +
      Math.sin(curBobPhase) * 0.014 * bobIntensity +
      state.swY.x * 0.7 -
      moveX * 0.035 * hipWeight +
      state.kR.x -
      0.75 * inspectPitch +
      0.55 * inspectYaw +
      Math.sin(curTime * 0.5) * 0.004 * adsInvertRatio;

    root.position.set(finalPosX, finalPosY, finalPosZ);
    root.rotation.set(finalRotPitch, finalRotYaw, finalRotRoll, "YXZ");
  }

  reset();
  return weapon;
}

/**
 * 展台/检视模式控制器 (Weapon Showcase Studio Mode)
 * 支持 ?show=weapon 独立参数调试枪模外观、各部细节与换弹动作
 * @param {object} ctx 全局上下文
 */
async function createShowcase(ctx) {
  const weaponInstance = await createWeapon(ctx);
  ctx.weapon = weaponInstance;
  const root = weaponInstance.root;

  const defaultCamPos = new Vector3_(0, 1.68, 4);
  const lookDirections = {
    south: [0.28, -0.01, 1],
    east: [1, 0, 0.25],
    north: [-0.2, -0.01, -1],
    west: [-1, 0, 0.1],
    nw: [-0.75, -0.01, -0.65],
  };

  const cameraPresets = {
    side: [Math.PI, [1.12, 1.3, 0.11], [0, 1.235, 0.11], 30],
    right: [0, [1.12, 1.3, -0.11], [0, 1.235, -0.11], 30],
    top: [Math.PI * 0.86, [0.62, 1.8, -0.42], [0, 1.24, 0.12], 32],
    hands: [Math.PI, [0.4, 1.4, 0.02], [0.02, 1.215, 0.25], 30],
    rhand: [0, [0.36, 1.22, 0.27], [0.03, 1.16, 0.09], 30],
    muzzle: [Math.PI, [0.26, 1.37, 0.98], [0, 1.262, 0.44], 30],
    optic: [Math.PI, [0.2, 1.4, -0.26], [0, 1.31, 0.02], 30],
    lower: [Math.PI, [0.34, 1.26, 0.04], [0, 1.2, 0.03], 30],
  };

  const setShotCallback = window.__setShot;
  let currentPoseName = null;

  function applyPreset(poseName, options = {}) {
    currentPoseName = poseName;
    const preset = cameraPresets[poseName];
    const input = ctx.input;
    const player = ctx.player;

    input.ads = false;
    input.fire = false;
    player.sprinting = false;
    player.speed = 0;
    weaponInstance.debug.reloadT = null;
    weaponInstance.debug.flash = false;
    weaponInstance.debug.empty = false;
    weaponInstance.debug.freeze = !!preset;
    weaponInstance.reset();

    let camPos, camTarget, fov;

    if (preset) {
      // 工作台展台视角
      ctx.scene.add(root);
      root.position.set(0, 1.25, 0);
      root.rotation.set(0, preset[0], 0, "YXZ");
      root.traverse((mesh) => mesh.layers.set(vf));
      camPos = preset[1];
      camTarget = preset[2];
      fov = preset[3];
      if (options.wt != null) {
        weaponInstance.debug.reloadT = +options.wt;
        weaponInstance.debug.empty = !!options.wempty;
      }
    } else {
      // 第一人称持枪视角
      ctx.camera.add(root);
      root.traverse((mesh) => mesh.layers.set(zc));
      const lookDir = lookDirections[options.wlook] || lookDirections.south;
      camPos = [defaultCamPos.x, defaultCamPos.y, defaultCamPos.z];
      camTarget = [
        defaultCamPos.x + lookDir[0] * 50,
        defaultCamPos.y + lookDir[1] * 50,
        defaultCamPos.z + lookDir[2] * 50,
      ];
      fov = 74;

      if (poseName === "ads") {
        input.ads = true;
        fov = 52;
      }
      if (poseName === "sprint") {
        player.sprinting = true;
        player.speed = 6;
      }
      if (poseName === "fire") {
        weaponInstance.debug.flash = true;
        if (options.wads) {
          input.ads = true;
          fov = 52;
        }
      }
      if (poseName === "reload" || poseName === "empty") {
        weaponInstance.debug.reloadT = options.wt != null ? +options.wt : 0.62;
        weaponInstance.debug.empty = poseName === "empty";
      }
      if (poseName === "empty") {
        weaponInstance.ammo = 0;
      }
    }

    weaponInstance.snap();
    weaponInstance.update(0.016);
    weaponInstance.snap();

    if (setShotCallback) {
      setShotCallback({
        cam: options.cam || [...camPos, ...camTarget].join(","),
        fov: options.fov || fov,
        exposure: options.exposure,
      });
    }

    return { cam: camPos, target: camTarget };
  }

  window.__setShot = (opts) => {
    if (opts && opts.wpose) {
      applyPreset(opts.wpose, opts);
    } else if (setShotCallback) {
      setShotCallback(opts);
    }
  };

  const initialShot = applyPreset(ctx.params.wpose || "hip", ctx.params);

  return {
    cam: initialShot.cam,
    target: initialShot.target,
    update(dt) {
      weaponInstance.update(dt);
      if (currentPoseName === "fire") {
        weaponInstance.debug.flash = true;
      }
    },
  };
}

const dm = createWeapon;
const PC = createShowcase;
export const create = createWeapon;
export const showcase = createShowcase;
export { dm, PC };
export { Xv };
