# 程序化几何体算子、网格装配与深度同态合批

## 核心设计思想

在程序化建模中，没有人工在 Blender / 3ds Max 导出的 OBJ/FBX 文件。所有复杂的工业级 3D 资产（如集装箱、3.5 吨叉车、高杆灯塔、柴油发电机组等）均由基础参数化几何体算子在代码中组合、变换、染色并执行最终的同态合批（Deep Homogeneous Merging）。

---

## 1. 核心程序化几何体算子

### 1.1 倒角圆角盒算子 (`createBoxBevelGeometry`)

工业建模的精髓在于**杜绝锋利无限细的 90° 尖角**。真实硬表面资产在倒角处具有高光反射线。

- **算法设计**：在标准立方体的 12 条边缘及 8 个顶点处，根据倒角半径（Bevel Radius，如 $0.008\sim 0.02\,\text{m}$）切割出斜面多边形。
- **优点**：使普通低模在光照下自动具备高光线（Highlight Creases），质感飞跃提升。

### 1.2 Catmull-Rom 三维样条挤出管线 (`createTubeFromPoints`)

用于生成液压管线、高压电缆、防撞弯管、消音器排气管道：

- 传入控制点三维数组（如 `[[x0, y0, z0], [x1, y1, z1], ...]`）。
- 沿三维样条曲线放样（Loft）生成截面为圆形的管状多边形网格。

### 1.3 同轴车削回转体 (`THREE.LatheGeometry`)

以二维轮廓折线数组为截面，绕中心轴做 $360^\circ$ 回转放样：

- 适用于子弹黄铜弹壳、螺栓铆钉、灭火器罐体、圆柱形储气罐、液压千斤顶活塞。

---

## 2. 复合网格构造器模式 (`PropCompoundBuilder`)

为了清晰管理数以百计的小零件及其空间拓扑关系，采用构造器设计模式：

```javascript
export class PropCompoundBuilder {
  constructor(defaultMaterial = "metal") {
    this.parts = [];
    this.defaultMat = defaultMaterial;
  }

  addPart(geometry, materialKey, transform = {}) {
    const { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], tint = [1, 1, 1] } = transform;
    const clonedGeo = geometry.clone();

    // 空间变换
    transformGeometry(clonedGeo, { p, r, s });

    // 顶点着色烘焙 (伪环境遮蔽 AO / 微光漫反射)
    applyVertexColorLuminance(clonedGeo, tint);

    this.parts.push({
      geo: clonedGeo,
      material: materialKey || this.defaultMat,
    });
    return this;
  }

  build(materialsRegistry) {
    // 按材质槽位将几何体分组打散
    const groupedByMaterial = new Map();
    for (const part of this.parts) {
      if (!groupedByMaterial.has(part.material)) {
        groupedByMaterial.set(part.material, []);
      }
      groupedByMaterial.get(part.material).push(part.geo);
    }

    // 针对同材质几何体执行无缝合并 (合并 Draw Calls)
    const mergedGeometries = [];
    const materialList = [];

    for (const [matKey, geos] of groupedByMaterial.entries()) {
      const merged = mergeGeometriesClean(geos, false);
      mergedGeometries.push(merged);
      materialList.push(materialsRegistry[matKey]);
    }

    // 构建多材质组单一 Mesh
    const finalGeometry = mergeGeometriesClean(mergedGeometries, true);
    return new THREE.Mesh(finalGeometry, materialList);
  }
}
```

---

## 3. 性能优化与深度同态合批 (Deep Homogeneous Merging)

### 3.1 为什么必须深度合批？

Web 引擎性能的第一杀手是 **Draw Call 数量**。若场景内 200 个集装箱、40 座灯塔各独立作为一个 Mesh，每帧将产生数千次 Draw Call，导致 CPU 与 WebGL 驱动瞬间卡死。

### 3.2 合批最佳实践

1. **统一顶点属性结构**：所有待合并的 `BufferGeometry` 必须具备完全相同的顶点属性（`position`, `normal`, `uv`, `color`），缺失属性必须预先补齐平坦默认值（如 `uv` 补 0，`color` 补 1）。
2. **多材质多边形分组 (BufferGeometry.groups)**：
   - 相同材质的部件合并为单段连续顶点索引。
   - 场景内同一静态分区（如露天堆场、大型仓库）全部道具合并为 1~2 个大型多材质网格。
   - Draw Call 从数千次骤降至个位数（< 20 次）。
