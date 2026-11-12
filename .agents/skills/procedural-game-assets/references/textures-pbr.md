# 程序化 PBR 物理材质与 Canvas 离屏多通道烘焙技术参考

## 核心设计思想

在零外部资产（Zero-Asset）架构中，材质系统不通过网络请求静态贴图文件，而是在客户端启动初始化阶段（数十毫秒内）纯内存通过数学公式与离屏帧缓冲并行烘焙出完整的 PBR 纹理通道：

- **Albedo (漫反射/基础色)**：sRGB 编码，表达物体固有色与磨损灰尘。
- **Normal Map (切空间法线)**：线性 NoColorSpace，由高度场/密度场 Sobel 梯度重构。
- **Roughness / Metalness / AO (ORM 通道整合)**：
  - R 通道：微表面粗糙度 (Roughness)
  - G 通道：环境光遮蔽 (Ambient Occlusion)
  - B 通道：金属度 (Metalness)

---

## 1. 快速无偏 32-bit 哈希与连续噪声算子

### 1.1 PCG3 确定性哈希

在着色器与 CPU 端统一随机数分布，避免网格坐标产生规律性伪影：

```javascript
export function createSeededRandom(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 1.2 分形布朗运动 (FBM - Fractional Brownian Motion)

通过叠加不同频率与振幅的倍频，模拟自然界粗糙度与斑驳锈斑：

```javascript
function fbm(noiseGen, x, y, octaves = 4, lacunarity = 2.03, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noiseGen.noise(x, y) * amp;
    maxAmp += amp;
    x = x * lacunarity + 17.1;
    y = y * lacunarity + 9.7;
    amp *= gain;
  }
  return sum / maxAmp;
}
```

---

## 2. 离屏 Canvas 2D 工业标贴与多通道图集烘焙

### 2.1 矢量标贴光栅化 (Stencils & Stamped Graphics)

工业场景中集装箱箱号、安全警示（如 HAZMAT、高压危险、毒害腐蚀）、指引车道标线等，使用 HTML5 离线 Canvas 2D 进行矢量排版绘制：

```javascript
export function generateDecalCanvas(width, height, drawCallback) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.save();
  drawCallback(ctx, width, height);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
```

### 2.2 Sobel 算子法线重构 (Height to Normal Gradient)

从灰度高度图/密度图计算切空间法线向量，并映射至 $[0, 255]$：

$$\Delta X = \frac{H(x+1, y) - H(x-1, y)}{2}, \quad \Delta Y = \frac{H(x, y+1) - H(x, y-1)}{2}$$
$$\mathbf{N} = \text{normalize}\begin{pmatrix} -\Delta X \cdot \text{scale} \\ -\Delta Y \cdot \text{scale} \\ 1.0 \end{pmatrix}$$
$$R = (N_x \times 0.5 + 0.5) \times 255, \quad G = (N_y \times 0.5 + 0.5) \times 255, \quad B = (N_z \times 0.5 + 0.5) \times 255$$

---

## 3. WebGL 多渲染目标 (MRT) GPU 离屏材质生成

对于需要高质量 Perlin/Worley 噪声计算的复杂材质（如沥青路面、生锈铁板、防滑纹板），采用 GPU MRT 管线：

1. 创建尺寸为 $512 \times 512$ 的 `THREE.WebGLRenderTarget`，配置 3 个颜色附件（Color Attachments）。
2. 在自定义片元着色器中，单个 Pass 同时输出 `gl_FragData[0]` (Albedo)、`gl_FragData[1]` (Normal)、`gl_FragData[2]` (Roughness/Metalness)。
3. 渲染完成后直接转换为 `MeshStandardMaterial` 的 `map`、`normalMap`、`roughnessMap`，无 CPU-GPU 往返传输开销。
