# GPU 实例化粒子池、程序化图集与动力学特效参考

## 核心设计思想

零外部资源的视觉特效引擎必须解决三大核心痛点：

1. **贴图依赖**：通过程序化 Canvas 2D / 算法生成高频图集，拒绝外部粒子图片。
2. **GC 垃圾回收卡顿**：使用 Structure of Arrays (SoA) 扁平内存数组管理数千粒子，彻底消除运行时对象实例化（Zero Object Allocation）。
3. **软粒子深度融合**：通过反向线性深度缓冲消解粒子与地面/掩体穿插时的生硬接缝。

---

## 1. 结构体数组 (SoA) 粒子对象池 (`ParticlePool`)

传统每个粒子一个 JavaScript 对象的模式会在短时间内产生海量短生命周期对象，频繁触发 V8 GC 导致瞬间掉帧。
SoA 模式将全部属性以紧凑 TypedArray 存储：

```javascript
export class ParticlePool {
  constructor(capacity) {
    this.cap = capacity;
    this.n = 0;

    // SoA 紧凑数组分配
    const makeFloat = () => new Float32Array(capacity);
    this.px = makeFloat();
    this.py = makeFloat();
    this.pz = makeFloat(); // 位置
    this.vx = makeFloat();
    this.vy = makeFloat();
    this.vz = makeFloat(); // 速度
    this.age = makeFloat();
    this.life = makeFloat(); // 寿命
    this.s0 = makeFloat();
    this.s1 = makeFloat(); // 尺寸插值
    this.r = makeFloat();
    this.g = makeFloat();
    this.b = makeFloat(); // 色彩
    this.a = makeFloat(); // 透明度
    this.flags = new Uint8Array(capacity); // 碰撞物理标志
  }
}
```

---

## 2. 深度感知软粒子 (Depth-Aware Soft Particles)

在 GLSL 片元着色器中，采样场景深度纹理，计算当前粒子片元与场景不透明物体的视空间深度距离，进行非线性羽化：

```glsl
uniform sampler2D uDepth;
uniform vec2 uRes;
uniform vec2 uNearFar;
varying vec3 vInfo; // x: view-space Z
varying float vSoftD;

float softFade() {
  float d = texture2D(uDepth, gl_FragCoord.xy / uRes).x;
  float zs = (uNearFar.x * uNearFar.y) / ((uNearFar.y - uNearFar.x) * d - uNearFar.y);
  return clamp((vInfo.x - zs) / vSoftD, 0.0, 1.0);
}
```

---

## 3. 切空间法线投影贴花 (`ImpactDecalManager`)

当子弹命中掩体表面时，基于碰撞命中点 $\mathbf{P}$ 与法线 $\mathbf{N}$ 动态构造正交切空间基底 $(\mathbf{T}, \mathbf{B})$：

1. 选取非共线向量构造切线：
   $$\mathbf{T}_{\text{raw}} = \begin{cases} (1, 0, 0) & \text{if } |N_y| > 0.9 \\ (-N_z, 0, N_x) & \text{otherwise} \end{cases}$$
2. Gram-Schmidt 正交化并归一化：
   $$\mathbf{T} = \text{normalize}(\mathbf{T}_{\text{raw}} - \mathbf{N}(\mathbf{T}_{\text{raw}} \cdot \mathbf{N}))$$
   $$\mathbf{B} = \mathbf{N} \times \mathbf{T}$$
3. 随机施加平面旋转角 $\theta$，并在法线方向抬升 $4\,\text{mm}$，配置 WebGL 硬件多边形偏移（`polygonOffsetFactor = -4`），彻底杜绝 Z-Fighting 撕裂。
