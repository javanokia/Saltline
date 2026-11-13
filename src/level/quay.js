/**
 * @file src/level/quay.js
 * @description 深水码头岸壁、起重机钢轨、系泊柱与撤离快艇作业区生成器
 */

import * as THREE from "three";
import { QUAY_SPECS, HALF_PI } from "./constants.js";

export function buildDeepwaterQuay(levelBuilder) {
  const { M, box, slab, cyl, rod, col, place } = levelBuilder;
  const { X: quayX, LADDER_Z: ladderZ, RAILS, Z0, Z1 } = QUAY_SPECS;

  const matConc = M("concrete");
  const matDirty = M("concrete_dirty");
  const matSteel = M("steel_worn");
  const matDark = M("steel_dark");
  const matGalv = M("steel_galv");
  const matYellow = M("paint_yellow");

  const seaY = -1.6;

  // 1. 码头前沿高程混凝土岸壁 (Heavy Concrete Quay Wall, X=30m)
  // 岸壁分为上部路面与直插海水的沉箱前沿挡浪墙
  const ladderGapMin = ladderZ - 0.42;
  const ladderGapMax = ladderZ + 0.42;

  for (const [zA, zB] of [
    [Z0 - 1, ladderGapMin],
    [ladderGapMax, Z1 + 1],
  ]) {
    // 码头路面水泥顶层
    slab(matConc, quayX - 0.65, -0.7, zA, quayX, 0.028, zB, { bevel: 0.03 });
    // 前沿防撞耐磨钢护边 (Steel Armored Coping Edge)
    slab(matSteel, quayX - 0.07, -0.16, zA, quayX + 0.022, 0.036, zB, { bevel: 0.012 });
    // 黄色安全作业防踏空警示边线 (Yellow Safety Line)
    slab(matYellow, quayX - 0.66, 0, zA, quayX - 0.5, 0.032, zB);
    // 直插海水的深水沉箱护岸立壁 (Vertical Underwater Retaining Wall)
    slab(matDirty, quayX - 0.55, -4.2, zA, quayX - 0.02, -0.7, zB);
  }

  // 登艇梯缺口处内凹护台 (Recessed Ladder Well)
  slab(matConc, quayX - 0.65, -0.7, ladderGapMin, quayX - 0.38, 0.028, ladderGapMax);
  slab(matDirty, quayX - 0.55, -4.2, ladderGapMin, quayX - 0.38, -0.7, ladderGapMax);

  // 2. 岸桥轨道 (Gantry Crane Heavy Rails)
  for (const rx of RAILS) {
    // 钢轨底座与重型 QU120 轨道钢
    slab(matDark, rx - 0.08, -0.01, Z0, rx + 0.08, 0.025, Z1);
    slab(matSteel, rx - 0.03, 0.025, Z0, rx + 0.03, 0.065, Z1);
  }

  // 3. 码头重型系缆桩与防撞橡胶护舷 (Mooring Bollards & Rubber Fenders)
  for (let z = Z0 + 4; z < Z1; z += 8) {
    if (Math.abs(z - ladderZ) < 1.5) continue;
    // 码头重型铸钢系缆桩
    place("bollard_mooring", quayX - 0.45, z, -HALF_PI, { seed: Math.abs(z | 0) });
    // 舷外垂直圆筒形橡胶护舷 (Cylindrical Arch Rubber Fenders)
    cyl("rubber", 0.22, 0.22, 1.8, quayX + 0.12, -0.9, z, { seg: 14 });
    rod(matDark, [quayX - 0.02, -0.1, z], [quayX + 0.12, -0.1, z], 0.03);
  }

  // 4. 直通海面的镀锌登艇逃生钢梯 (Steel Water Access Ladder to Sea Boat)
  for (const sz of [-0.25, 0.25]) {
    rod(
      matGalv,
      [quayX - 0.35, 0.02, ladderZ + sz],
      [quayX - 0.35, seaY - 0.4, ladderZ + sz],
      0.02,
    );
  }
  for (let y = 0.0; y >= seaY - 0.35; y -= 0.3) {
    rod(matGalv, [quayX - 0.35, y, ladderZ - 0.25], [quayX - 0.35, y, ladderZ + 0.25], 0.015);
  }

  // 5. 撤离快艇 (Extraction Tactical Speedboat Moored at Ladder)
  const boatPos = new THREE.Vector3(quayX + 1.8, seaY + 0.2, ladderZ);
  // 快艇深 V 船体 (Deep-V Hull)
  box(M("paint_grey"), 3.8, 0.9, 1.6, boatPos.x, boatPos.y, boatPos.z, { bevel: 0.1 });
  box(M("paint_orange"), 1.8, 0.4, 1.4, boatPos.x - 0.6, boatPos.y + 0.45, boatPos.z, {
    bevel: 0.05,
  });
  // 双大马力舷外挂机 (Twin Outboard Motors)
  for (const bz of [-0.4, 0.4]) {
    box(matDark, 0.4, 0.8, 0.25, boatPos.x - 2.0, boatPos.y + 0.2, boatPos.z + bz, { bevel: 0.02 });
  }

  // 6. 码头岸线物理边界碰撞体 (Quay Physics Colliders)
  col(quayX - 0.65, -0.7, Z0 - 1, quayX + 0.02, 0.04, Z1 + 1, "concrete");
  // 落水防掉出空气墙 (阻挡玩家直接向右冲入海中，必须走舷梯)
  col(quayX + 0.02, seaY - 1, Z0, quayX + 0.2, 5.0, ladderGapMin, "concrete");
  col(quayX + 0.02, seaY - 1, ladderGapMax, quayX + 0.2, 5.0, Z1, "concrete");

  return {
    extraction: boatPos,
    relayPos: { x: 26.5, z: 4.5 },
  };
}

// ============================================================================
// 七、 动态 Canvas 贴花图集化合并优化 (Label Texture Atlas Consolidation: rb)
// ============================================================================

const ATLAS_PADDING = 2;

/**
 * 将所有静态网格中的独立文字标签 Canvas 纹理合并为单张大图集 (Consolidate Labels into Texture Atlas)
 */
