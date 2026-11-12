# 纯代码骨骼装配 `SkeletonRig` 与 3-DOF 逆运动学 IK 算法

## 核心设计思想

传统 3D 游戏开发需要骨骼绑定师（Rigger）在 DCC 软件中制作骨架并导出蒙皮权重。在纯程序化引擎中，我们通过 `SkeletonRig` 在代码中动态装配多级骨骼拓扑、自动赋权刚性机械权重，并借助高精解析逆运动学（Analytic Inverse Kinematics）与阻尼弹簧解算肢体运动。

---

## 1. 纯代码骨架装配器 (`SkeletonRig`)

### 1.1 骨骼树形拓扑构建

通过扁平字典与数组记录骨骼父子拓扑及局部静止姿态（Bind Pose）：

```javascript
export class SkeletonRig {
  constructor() {
    this.bones = [];
    this.index = {};
    this.slots = {};
  }

  addBone(name, parentName = null, localPosition = [0, 0, 0]) {
    const parentIdx = parentName ? this.index[parentName] : -1;
    const idx = this.bones.length;
    this.index[name] = idx;

    // 计算世界空间原点坐标
    const worldPos = [...localPosition];
    if (parentIdx >= 0) {
      const parentWorld = this.bones[parentIdx].world;
      worldPos[0] += parentWorld[0];
      worldPos[1] += parentWorld[1];
      worldPos[2] += parentWorld[2];
    }

    this.bones.push({
      i: idx,
      name,
      parent: parentIdx,
      local: localPosition,
      world: worldPos,
    });
    return this;
  }
}
```

### 1.2 刚性机械装甲自动权重分配 (Rigid Skinning)

机械外骨骼与工业机器人不同于有机生物软组织，其零件无弹性形变，各部件顶点完全 $100\%$ 刚性绑定到所属单一骨骼：

- 遍历部件几何体顶点，注入 `skinIndex` = `bone.i`，`skinWeight` = `1.0`。
- 几何体预先施加向该骨骼世界起点的逆向平移，保证后续 `SkinnedMesh` 绑定姿态严格对齐。

---

## 2. 3-DOF 腿部解析逆运动学 (3-DOF Analytic Leg IK)

机械四足单位（如猎犬）每条腿具有 3 个旋转自由度：

1. **外展/内收角 ($\theta\_{\text{abd}}$)**：髋部横向开合。
2. **大腿俯仰角 ($\theta\_{\text{hip}}$)**：大腿根部纵向俯仰。
3. **小腿屈伸角 ($\theta\_{\text{knee}}$)**：膝关节折叠。

### 2.1 极简高效解算方程 (`solveLegIK`)

```javascript
export function solveLegIK(targetPos, l0, l1, l2, isRightLeg = false) {
  const x = targetPos.x;
  const y = targetPos.y;
  const z = targetPos.z;
  const side = isRightLeg ? 1 : -1;

  // 1. 横向平面投影求解外展角 (Abduction Angle)
  const lateralDistSq = x * x + y * y;
  const planarY = Math.sqrt(Math.max(lateralDistSq - l0 * l0, 1e-6));
  const thetaAbd = Math.atan2(y, x) - Math.atan2(-planarY, side * l0);

  // 2. 纵向伸展距离截断 (Reach Distance Clamping)
  let reachDist = Math.hypot(planarY, z);
  const minReach = Math.abs(l1 - l2) + 0.03;
  const maxReach = (l1 + l2) * 0.995; // 预留 0.5% 冗余避免共线奇异点
  reachDist = Math.max(minReach, Math.min(maxReach, reachDist));

  // 3. 余弦定理求解大腿与膝角 (Law of Cosines)
  const cosHipRel = (l1 * l1 + reachDist * reachDist - l2 * l2) / (2 * l1 * reachDist);
  const cosKneeRel = (l1 * l1 + l2 * l2 - reachDist * reachDist) / (2 * l1 * l2);

  const thetaHipRel = Math.acos(Math.max(-1, Math.min(1, cosHipRel)));
  const thetaKneeRel = Math.acos(Math.max(-1, Math.min(1, cosKneeRel)));

  const thetaHip = thetaHipRel - Math.atan2(z, planarY);
  const thetaKnee = -(Math.PI - thetaKneeRel);

  return { thetaAbd, thetaHip, thetaKnee };
}
```

---

## 3. 四足对角小跑步态 (Trotting Gait Locomotion)

- **对角两相轮替**：对角肢体配对（左前+右后为一组，右前+左后为一组），两组相位差为 $\pi$。
- **三次 Hermite 抬腿曲线**：
  $$\text{smoothPhase} = t^2 \times (3 - 2t)$$
  $$\text{footLiftY} = \sin(\pi \times \text{smoothPhase}) \times \text{maxLift}$$
- **悬挂减震系统**：底盘采用阻尼简谐振子方程：
  $$\frac{d^2 x}{dt^2} + 2\zeta\omega_n \frac{dx}{dt} + \omega_n^2 (x - x_{\text{target}}) = 0$$
  实时模拟底盘随地形颠簸起伏、急停前冲惯性以及天线鞭状晃动。
