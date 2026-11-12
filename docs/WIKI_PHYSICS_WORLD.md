# 3A-GAME 物理系统、港区世界与远景海洋环境技术白皮书 (Physics, Ground & Marine Backdrop)

> 本文档详细记录《3A-GAME》四号泊位前线行动的物理碰撞与 A* 导航寻路引擎（`src/physics.js`）、码头地面与风暴洋面系统（`src/ground.js`）、以及远景海洋工程与工业天际线环境（`src/backdrop.js`）的架构设计、数学模型与技术规范。

---

## 目录
1. [物理碰撞引擎 (Physics System Architecture)](#1-物理碰撞引擎)
   - [1.1 极速 Slab 算法 AABB 光线投射检测](#11-极速-slab-算法-aabb-光线投射检测)
   - [1.2 扫掠胶囊体角色控制器与台阶跨越](#12-扫掠胶囊体角色控制器与台阶跨越)
   - [1.3 表面材质与高程查询](#13-表面材质与高程查询)
2. [2D 栅格化导航网格与 A* 寻路 (NavGrid & A* Pathfinder)](#2-2d-栅格化导航网格与-a-寻路)
   - [2.1 障碍物膨胀与网格栅格化](#21-障碍物膨胀与网格栅格化)
   - [2.2 二叉最小堆 A* 寻路算法](#22-二叉最小堆-a-寻路算法)
   - [2.3 视线拉直平滑算法 (String-Pulling Shortcut)](#23-视线拉直平滑算法)
3. [码头地面与洋面流体系统 (Ground & Ocean Engine)](#3-码头地面与洋面流体系统)
   - [3.1 程序化水洼深度掩模与微观沥青纹理](#31-程序化水洼深度掩模与微观沥青纹理)
   - [3.2 码头道路交通标线与箱位光栅化](#32-码头道路交通标线与箱位光栅化)
   - [3.3 实时平面镜面反射管线 (Planar Reflections)](#33-实时平面镜面反射管线)
   - [3.4 Gerstner 风暴洋面波浪物理模拟](#34-gerstner-风暴洋面波浪物理模拟)
   - [3.5 GPU 粒子级暴雨与溅射水花 (Volumetric Rain & Splashes)](#35-gpu-粒子级暴雨与溅射水花)
4. [远景海洋工程与港区环境 (Marine Backdrop Environment)](#4-远景海洋工程与港区环境)
   - [4.1 几猫 04 号岸桥集装箱起重机 (Quayside Gantry Crane)](#41-几猫-04-号岸桥集装箱起重机)
   - [4.2 远洋万吨级集装箱轮 (Oceanic Cargo Ship)](#42-远洋万吨级集装箱轮)
   - [4.3 几猫撤离巡逻艇与浮力动力学 (Extraction Patrol Boat)](#43-几猫撤离巡逻艇与浮力动力学)
   - [4.4 工业港口天际线与航标障碍灯 (Port Skyline & Hazard Beacons)](#44-工业港口天际线与航标障碍灯)
   - [4.5 GPU 顶点动画程序化海鸥群 (Procedural Flocking Seagulls)](#45-gpu-顶点动画程序化海鸥群)

---

## 1. 物理碰撞引擎 (Physics System Architecture)

### 1.1 极速 Slab 算法 AABB 光线投射检测
物理引擎采用经典的 Kay-Kajiya **Slab Method**（平板相交法），在无外部物理引擎依赖的前提下，实现微秒级的光线与海量静态工业几何体求交：
- **射线方程**：$\mathbf{P}(t) = \mathbf{O} + t \cdot \mathbf{D}$
- **平板裁剪**：对每个 AABB 的三个坐标轴 $i \in \{x, y, z\}$ 计算进出时间：
  $$t_{1, i} = \frac{\text{box.min}_i - O_i}{D_i}, \quad t_{2, i} = \frac{\text{box.max}_i - O_i}{D_i}$$
  $$t_{\text{near}, i} = \min(t_{1, i}, t_{2, i}), \quad t_{\text{far}, i} = \max(t_{1, i}, t_{2, i})$$
  $$t_{\text{min}} = \max_i(t_{\text{near}, i}), \quad t_{\text{max}} = \min_i(t_{\text{far}, i})$$
  当 $t_{\text{min}} \le t_{\text{max}}$ 且 $t_{\text{min}} > 0$ 时判定命中，同时由最大进入轴直接导出精确的表面碰撞法线（如 $(0, 1, 0)$ 或 $(-1, 0, 0)$）。
- **海平面与岸壁特殊判定**：
  若光线斜向射向地面（$D_y < 0$），优先测试地平面 $Y = 0$；若撞击点跨越码头岸线 $X > \text{quayX} = 30\,\text{m}$，则自动延伸穿透至海平面 $Y = -1.6\,\text{m}$ 并返回 `water` 表面材质。

### 1.2 扫掠胶囊体角色控制器与台阶跨越
角色控制器（`moveCapsule`）采用**扫掠圆球/胶囊体（Swept-Sphere Capsule）**与多重子步迭代（Sub-stepping）：
1. **防穿墙子步切分**：
   依据单帧水平位移大小自适应切分迭代步数：
   $$N_{\text{steps}} = \max\left(1, \left\lceil \frac{\sqrt{\Delta x^2 + \Delta z^2}}{0.6 \cdot R_{\text{capsule}}} \right\rceil\right)$$
2. **三维滑动摩擦解算（Slide & Friction）**：
   当胶囊体与包围盒水平重叠时，计算穿透深度并沿碰撞法线将角色弹出；同时沿法线消除速度分量：
   $$\mathbf{v}' = \mathbf{v} - (\mathbf{v} \cdot \mathbf{n}) \cdot \mathbf{n}$$
3. **0.42m 台阶自动跨越步进（Stair Step-Up）**：
   对于高度差小于 $0.42\,\text{m}$ 的矮掩体、路缘石、货架托盘台阶，碰撞检测自动忽略水平阻挡，并在垂直方向平滑抬升角色，实现如丝般顺滑的跑酷与战术跨越。
4. **天花板碰撞阻挡与垂直重力**：
   当角色跳跃触碰天花板时将垂直速度强制归零并钳制位置；下落时精准贴合最高支撑地面。

### 1.3 表面材质与高程查询
物理包围盒携带材质元数据（`concrete`、`metal`、`wood`、`water`、`dirt` 等），为武器射击火花、破片弹跳、脚步音效及弹孔贴花提供实时查询支持。

---

## 2. 2D 栅格化导航网格与 A* 寻路 (NavGrid & A* Pathfinder)

### 2.1 障碍物膨胀与网格栅格化
- **空间规格**：覆盖 $X \in [-40, 31]\,\text{m}$，$Z \in [-32, 30]\,\text{m}$，单元格尺寸 $\Delta = 0.5\,\text{m}$，总网格分辨率为 $142 \times 124 = 17,608$ 单元格。
- **Minkowski 和障碍物膨胀（Obstacle Dilation）**：
  在将集装箱等包围盒光栅化到网格时，各边缘向外扩展 $0.5\,\text{m}$（相当于机械猎犬的体型半径），确保 AI 沿寻路走位时绝不发生卡模穿模。
- **岸壁隔离**：在码头前沿（$X > 29.5\,\text{m}$）自动注入阻挡标志，严禁地面机械体失足坠海。

### 2.2 二叉最小堆 A* 寻路算法
- 采用紧凑型一维数组（`gCostBuf`、`parentBuf`、`openTag`、`closedTag`）与自增轮次号（`searchEpoch`），彻底避免在每次寻路时重复分配内存或清空海量数组。
- **二叉最小堆（Binary Min-Heap）**维护开放列表（Open Set），将优先节点弹出的时间复杂度降至 $O(\log N)$。
- **八向对角移动启发函数（Octile Distance Heuristic）**：
  $$h(\Delta x, \Delta z) = \Delta x + \Delta z + (\sqrt{2} - 2) \cdot \min(\Delta x, \Delta z)$$
  严格杜绝穿透斜向障碍物死角。

### 2.3 视线拉直平滑算法 (String-Pulling Shortcut)
A* 算法生成的原生路径往往包含锯齿折线。寻路器在输出前执行反向贪心视线投射（Bresenham Grid Raycast）：
- 从起点开始，向后扫描最远可见的路径节点；
- 若两点间无障碍物遮挡，直接剔除中间所有折线拐点，拉出一条平滑笔直的战术行进线段。

---

## 3. 码头地面与洋面流体系统 (Ground & Ocean Engine)

### 3.1 程序化水洼深度掩模与微观沥青纹理
- **水洼深度图（Puddle Mask - $1024 \times 1024$）**：
  采用多尺度分形布朗运动（FBM）噪声生成，R 通道记录凹凸积水深度，G 通道记录磨损泥泞程度，B 通道记录表面粗糙度扰动。
- **微观沥青高光与法线（Detail Normal）**：
  程序化合成碎石骨料与沥青混合物微观凹凸，在掠射角下呈现高度逼真的湿滑各向异性反光。

### 3.2 码头道路交通标线与箱位光栅化
在离线 $2048 \times 2048$ 贴图画布上程序化绘制工业港口标准地面交通标线：
- **黄色双实线通道与减速带斑马线**；
- **重型集装箱堆场车位标号**（如 `A-12`、`C-04`、`01`、`02` 等）；
- **岸桥龙门吊运行轨道高反光钢轨与警示斜条纹**；
- **限速标示**（`15`、`SLW`）与雨水排水井盖格栅。

### 3.3 实时平面镜面反射管线 (Planar Reflections)
- 构造对称虚拟镜像相机，以水平面 $Y = 0$ 镜像反转视锥。
- 动态剪裁平面（Oblique Near-Plane Clipping）剔除地表上方倒影重叠。
- 渲染半分辨率反射缓冲，与地表积水深度进行菲涅尔混合，完美映照出集装箱货柜、吊车与天空晨曦。

### 3.4 Gerstner 风暴洋面波浪物理模拟
远海海面网格采用非均匀几何分布（离码头近处密集、远处逐渐放大），片元着色器实时计算 4 组 Gerstner 波合成：
$$\mathbf{P}(x, z, t) = \mathbf{P}_0 + \sum_{i=1}^4 \begin{pmatrix} Q_i A_i D_{i, x} \cos(\mathbf{D}_i \cdot \mathbf{P}_0 \omega_i + \phi_i t) \\ A_i \sin(\mathbf{D}_i \cdot \mathbf{P}_0 \omega_i + \phi_i t) \\ Q_i A_i D_{i, z} \cos(\mathbf{D}_i \cdot \mathbf{P}_0 \omega_i + \phi_i t) \end{pmatrix}$$
波浪在岸壁处产生白色碎浪浮沫（Whitecaps Foam）。

### 3.5 GPU 粒子级暴雨与溅射水花 (Volumetric Rain & Splashes)
- **9,000 条高速雨丝（Instanced Rain Streaks）**：
  沿风向倾斜下坠，带有运动矢量拉伸；着色器动态比对室内包围盒（`interiorBoxes`），彻底杜绝仓库内部漏雨。
- **900 个地面撞击水花冠状环（Splash Crowns）**：
  在积水深度超过阈值处瞬态绽开，伴随同心圆微水波与悬浮细微水雾。
- **周期性环境雷电闪光（Thunder Flash）**：
  随机触发全局天空泛白与场景瞬态曝光增强。

---

## 4. 远景海洋工程与港区环境 (Marine Backdrop Environment)

### 4.1 几猫 04 号岸桥集装箱起重机 (Quayside Gantry Crane)
- **结构组成**：
  - A 型双肢门架钢桁架立柱与高位横梁；
  - 伸向海洋上方的悬臂大梁（Boom Truss）；
  - 沿轨道移动的小车（Trolley）与悬吊钢丝绳；
  - **动态晃动吊具（Container Spreader）**：实时计算风力驱动的微幅双轴摆动物理：
    $$\theta_x(t) = 0.012 \sin(0.52 t) + 0.004 \sin(1.31 t + 1)$$
    $$\theta_z(t) = 0.009 \sin(0.41 t + 1.1)$$
  - 检修爬梯、高空防坠护栏与司机操作舱。

### 4.2 远洋万吨级集装箱轮 (Oceanic Cargo Ship)
- **深水泊位靠泊形态**：
  - 球鼻艏（Bulbous Bow）减阻结构与大倾角船首舷弧；
  - 舰桥上层建筑（Bridge Superstructure）、通航雷达与烟囱；
  - 甲板装载 5 层高密度各色海运集装箱堆垛；
  - **旋转海事雷达**：以 $1.9\,\text{rad/s}$ 匀速水平旋转扫描。

### 4.3 几猫撤离巡逻艇与浮力动力学 (Extraction Patrol Boat)
- **终点撤离目标（Extraction Zone）**：
  - 玻璃钢深 V 快艇船体，配备橡胶防撞护舷与系泊缆绳；
  - **三自由度流体浮力颠簸模拟**：
    $$y(t) = y_0 + 0.05 \sin(1.15 t) + 0.025 \sin(2.3 t + 1.3)$$
    $$\text{pitch}(t) = 0.05 \sin(0.9 t + 0.4) + 0.016 \sin(2.1 t)$$
    $$\text{roll}(t) = 0.02 \sin(1.3 t + 2)$$
    呈现随港口涌浪起伏的真实水动响应。

### 4.4 工业港口天际线与航标障碍灯 (Port Skyline & Hazard Beacons)
- **对岸远景轮廓**：
  - 远洋油轮停泊码头、球形液化天然气储罐群（Spherical Gas Tanks）；
  - 化工精馏塔与高耸的钢架工业排烟囱；
  - **航空障碍警示红光（Aviation Warning Strobes）**：在顶点着色器中按双频正弦闪烁，强化夜色下的工业冷峻氛围。

### 4.5 GPU 顶点动画程序化海鸥群 (Procedural Flocking Seagulls)
- **12 只海鸥粒子群**：
  - 围绕岸桥起重机与海面以椭圆轨道盘旋（Orbit Trajectories）；
  - GPU 顶点着色器实时计算翅膀扑击与滑翔切换（Flapping & Gliding）：
    $$\Delta y_{\text{wing}} = W_{\text{wing}} \cdot \left(\sin(\omega_{\text{flap}} t + \phi) \cdot \text{glide} + 0.18\right) \cdot |z|$$
    赋予港口上空灵动真实的自然生机。

---
*本文档由 3A-GAME 架构团队自动化逆向与技术规格沉淀生成。*
