/**
 * ============================================================================
 * 3A-GAME Physics & Navigation System (physics.js)
 * 物理碰撞检测与 A* 网格导航寻路系统
 * ============================================================================
 *
 * 核心功能：
 * 1. 轴对齐包围盒 (AABB Slab-Method Raycaster)：
 *    - 极速 Slab 算法，支持光线与海量静态集装箱/建筑物的相交测试与表面材质反射法线计算。
 *    - 支持水面、地面、码头边缘物理判定。
 *
 * 2. 扫掠胶囊体角色控制器 (Swept-Capsule Character Controller)：
 *    - 支持 0.42m 台阶自动跨越步进 (Stair Step-up)。
 *    - 连续子步迭代 (Sub-stepping) 与滑动摩擦解算，彻底杜绝高速穿墙。
 *    - 天花板碰撞阻挡与多层地面吸附 (Ground Snapping)。
 *
 * 3. 2D 栅格化导航网格与 A* 寻路 (A* NavGrid & String-Pulling)：
 *    - 0.5m 均匀栅格，带 0.5m 障碍物外扩膨胀 (Obstacle Dilation)。
 *    - 基于二叉最小堆 (Binary Min-Heap) 优化的 A* 最短路径搜索。
 *    - 视线可见性拉直平滑 (Raycast String-Pulling Shortcut)，消除锯齿折线走位。
 */

import * as THREE from "three";
import { SCENE_BOUNDS } from "./constants.js";

// ============================================================================
// 一、 物理常量与网格规格 (Constants & Grid Config)
// ============================================================================

export const STEP_UP_HEIGHT = 0.42; // 最大台阶跨越高度 (米)
export const NAV_CELL_SIZE = 0.5; // 导航网格单元尺寸 (米)
export const NAV_MIN_X = -40; // 导航范围 X 轴下界
export const NAV_MAX_X = 31; // 导航范围 X 轴上界
export const NAV_MIN_Z = -32; // 导航范围 Z 轴下界
export const NAV_MAX_Z = 30; // 导航范围 Z 轴上界
export const OBSTACLE_DILATION = 0.5; // 障碍物碰撞半径外扩膨胀

export const NAV_GRID_WIDTH = Math.round((NAV_MAX_X - NAV_MIN_X) / NAV_CELL_SIZE); // 142 列
export const NAV_GRID_HEIGHT = Math.round((NAV_MAX_Z - NAV_MIN_Z) / NAV_CELL_SIZE); // 124 行

/**
 * 转换坐标数组或向量为统一的 THREE.Vector3
 */
export function toVector3(input) {
  if (!input) return new THREE.Vector3();
  return input.isVector3 ? input.clone() : new THREE.Vector3(input[0], input[1], input[2]);
}

// ============================================================================
// 二、 物理引擎系统工厂 (createPhysicsSystem)
// ============================================================================

export function createPhysicsSystem(engineCtx) {
  const boxes = [];
  let navGridDirty = true;
  let blockedGrid = new Uint8Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);

  const vTempLos = new THREE.Vector3();

  // --------------------------------------------------------------------------
  // 1. 包围盒增删与查询 (AABB Management)
  // --------------------------------------------------------------------------

  function addBox(minPoint, maxPoint, options = {}) {
    const minV = toVector3(minPoint);
    const maxV = toVector3(maxPoint);

    const box = {
      min: new THREE.Vector3(
        Math.min(minV.x, maxV.x),
        Math.min(minV.y, maxV.y),
        Math.min(minV.z, maxV.z),
      ),
      max: new THREE.Vector3(
        Math.max(minV.x, maxV.x),
        Math.max(minV.y, maxV.y),
        Math.max(minV.z, maxV.z),
      ),
      surface: options.surface || "concrete",
      tag: options.tag || "",
      noNav: Boolean(options.noNav),
      bulletOnly: Boolean(options.bulletOnly),
      playerOnly: Boolean(options.playerOnly),
    };

    boxes.push(box);
    navGridDirty = true;
    return box;
  }

  function removeBox(box) {
    const idx = boxes.indexOf(box);
    if (idx >= 0) {
      boxes.splice(idx, 1);
      navGridDirty = true;
    }
  }

  // --------------------------------------------------------------------------
  // 2. 光线投射检测 (Slab-Method Raycast)
  // --------------------------------------------------------------------------

  function intersectRayAABB(ox, oy, oz, dx, dy, dz, invDx, invDy, invDz, box, maxDist) {
    let tMin = 0;
    let tMax = maxDist;
    let nearAxis = -1;
    let nearSign = 0;
    let t1, t2;

    // X 轴平面测试
    if (dx !== 0) {
      t1 = (box.min.x - ox) * invDx;
      t2 = (box.max.x - ox) * invDx;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sign = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nearAxis = 0;
        nearSign = sign;
      }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) return null;
    } else if (ox < box.min.x || ox > box.max.x) {
      return null;
    }

    // Y 轴平面测试
    if (dy !== 0) {
      t1 = (box.min.y - oy) * invDy;
      t2 = (box.max.y - oy) * invDy;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sign = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nearAxis = 1;
        nearSign = sign;
      }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) return null;
    } else if (oy < box.min.y || oy > box.max.y) {
      return null;
    }

    // Z 轴平面测试
    if (dz !== 0) {
      t1 = (box.min.z - oz) * invDz;
      t2 = (box.max.z - oz) * invDz;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
        sign = 1;
      }
      if (t1 > tMin) {
        tMin = t1;
        nearAxis = 2;
        nearSign = sign;
      }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) return null;
    } else if (oz < box.min.z || oz > box.max.z) {
      return null;
    }

    if (nearAxis < 0) return null;
    return { dist: tMin, axis: nearAxis, sign: nearSign };
  }

  function raycast(origin, dir, maxDistance = 500) {
    let closestDist = maxDistance;
    let hitBox = null;
    let hitAxis = -1;
    let hitSign = 0;
    let groundType = 0; // 0: None/Box, 1: Ground/Quay, 2: Sea

    const ox = origin.x,
      oy = origin.y,
      oz = origin.z;
    const dx = dir.x,
      dy = dir.y,
      dz = dir.z;

    // 检查是否射向地面或海面
    if (dy < -1e-6) {
      const tGround = (SCENE_BOUNDS.groundY - oy) / dy;
      if (tGround > 0 && tGround < closestDist) {
        const hitX = ox + dx * tGround;
        if (hitX <= SCENE_BOUNDS.quayX) {
          closestDist = tGround;
          groundType = 1;
        } else {
          const tSea = (SCENE_BOUNDS.seaY - oy) / dy;
          if (tSea > 0 && tSea < closestDist) {
            closestDist = tSea;
            groundType = 2;
          }
        }
      }
    }

    const invDx = dx === 0 ? Infinity : 1 / dx;
    const invDy = dy === 0 ? Infinity : 1 / dy;
    const invDz = dz === 0 ? Infinity : 1 / dz;

    // Slab 算法遍历所有静态 AABB
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.playerOnly) continue;

      const hit = intersectRayAABB(ox, oy, oz, dx, dy, dz, invDx, invDy, invDz, box, closestDist);
      if (hit) {
        closestDist = hit.dist;
        hitBox = box;
        hitAxis = hit.axis;
        hitSign = hit.sign;
        groundType = 0;
      }
    }

    if (!hitBox && !groundType) return null;

    const hitPoint = new THREE.Vector3(
      ox + dx * closestDist,
      oy + dy * closestDist,
      oz + dz * closestDist,
    );

    if (groundType) {
      let surf = "concrete";
      if (groundType === 2) {
        surf = "water";
      } else if (engineCtx.level && engineCtx.level.groundSurfaceAt) {
        surf = engineCtx.level.groundSurfaceAt(hitPoint.x, hitPoint.z);
      }
      return {
        dist: closestDist,
        point: hitPoint,
        normal: new THREE.Vector3(0, 1, 0),
        surface: surf,
        box: null,
      };
    }

    const hitNormal = new THREE.Vector3();
    hitNormal.setComponent(hitAxis, hitSign);

    return {
      dist: closestDist,
      point: hitPoint,
      normal: hitNormal,
      surface: hitBox.surface,
      box: hitBox,
    };
  }

  function lineOfSight(fromPos, toPos) {
    vTempLos.subVectors(toPos, fromPos);
    const dist = vTempLos.length();
    if (dist < 1e-4) return true;
    vTempLos.multiplyScalar(1 / dist);
    return !raycast(fromPos, vTempLos, dist - 0.05);
  }

  function groundHeight(x, z, maxScanY = 50) {
    let highestY = x <= SCENE_BOUNDS.quayX ? SCENE_BOUNDS.groundY : SCENE_BOUNDS.seaY;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!b.bulletOnly && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
        if (b.max.y <= maxScanY && b.max.y > highestY) {
          highestY = b.max.y;
        }
      }
    }
    return highestY;
  }

  // --------------------------------------------------------------------------
  // 3. 扫掠胶囊体角色控制器 (Swept-Capsule Controller)
  // --------------------------------------------------------------------------

  function resolveCapsuleHorizontal(pos, vel, radius, height, stepUp, dt, result) {
    const deltaX = vel.x * dt;
    const deltaZ = vel.z * dt;
    const horizDist = Math.hypot(deltaX, deltaZ);
    const subSteps = Math.max(1, Math.ceil(horizDist / (radius * 0.6)));

    for (let step = 0; step < subSteps; step++) {
      pos.x += deltaX / subSteps;
      pos.z += deltaZ / subSteps;

      for (let iter = 0; iter < 3; iter++) {
        let collided = false;
        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i];
          if (box.bulletOnly) continue;
          if (
            box.max.y <= pos.y + (stepUp ? STEP_UP_HEIGHT : 0.08) ||
            box.min.y >= pos.y + height
          ) {
            continue;
          }

          const clampX = Math.max(box.min.x, Math.min(box.max.x, pos.x));
          const clampZ = Math.max(box.min.z, Math.min(box.max.z, pos.z));
          const diffX = pos.x - clampX;
          const diffZ = pos.z - clampZ;
          const distSq = diffX * diffX + diffZ * diffZ;

          if (distSq < radius * radius) {
            if (distSq > 1e-10) {
              const d = Math.sqrt(distSq);
              const pushDist = radius - d;
              const normX = diffX / d;
              const normZ = diffZ / d;
              pos.x += normX * pushDist;
              pos.z += normZ * pushDist;

              const dotVel = vel.x * normX + vel.z * normZ;
              if (dotVel < 0) {
                vel.x -= normX * dotVel;
                vel.z -= normZ * dotVel;
              }
            } else {
              // 陷入包围盒内部，沿最小距离面弹出
              const dLeft = pos.x - box.min.x;
              const dRight = box.max.x - pos.x;
              const dNear = pos.z - box.min.z;
              const dFar = box.max.z - pos.z;
              const minPen = Math.min(dLeft, dRight, dNear, dFar);

              if (minPen === dLeft) {
                pos.x = box.min.x - radius;
                if (vel.x > 0) vel.x = 0;
              } else if (minPen === dRight) {
                pos.x = box.max.x + radius;
                if (vel.x < 0) vel.x = 0;
              } else if (minPen === dNear) {
                pos.z = box.min.z - radius;
                if (vel.z > 0) vel.z = 0;
              } else {
                pos.z = box.max.z + radius;
                if (vel.z < 0) vel.z = 0;
              }
            }
            collided = true;
            result.hitWall = true;
          }
        }
        if (!collided) break;
      }
    }
  }

  function resolveCapsuleVertical(pos, vel, radius, height, stepUp, dt, startY, result) {
    const targetY = pos.y + vel.y * dt;
    const probeRadius = radius * 0.7;
    let floorY = pos.x <= SCENE_BOUNDS.quayX + probeRadius ? SCENE_BOUNDS.groundY : -50;
    let floorSurface = null;
    let ceilY = Infinity;
    const stepThreshold = startY + (stepUp ? STEP_UP_HEIGHT : 0.08) + 1e-4;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.bulletOnly) continue;
      if (
        pos.x + probeRadius < box.min.x ||
        pos.x - probeRadius > box.max.x ||
        pos.z + probeRadius < box.min.z ||
        pos.z - probeRadius > box.max.z
      ) {
        continue;
      }

      if (box.max.y <= stepThreshold && box.max.y > floorY) {
        floorY = box.max.y;
        floorSurface = box.surface;
      }
      if (box.min.y >= startY + height - 0.05 && box.min.y < ceilY) {
        ceilY = box.min.y;
      }
    }

    if (vel.y > 0 && targetY + height > ceilY) {
      pos.y = ceilY - height;
      vel.y = 0;
      result.hitCeil = true;
    } else if (targetY <= floorY) {
      pos.y = floorY;
      if (vel.y < 0) vel.y = 0;
      result.onGround = true;
    } else if (stepUp && vel.y <= 0 && targetY - floorY < STEP_UP_HEIGHT) {
      pos.y = floorY;
      vel.y = 0;
      result.onGround = true;
    } else {
      pos.y = targetY;
    }

    if (result.onGround) {
      result.surface =
        floorSurface ||
        (engineCtx.level && engineCtx.level.groundSurfaceAt
          ? engineCtx.level.groundSurfaceAt(pos.x, pos.z)
          : "concrete");
    }
  }

  function moveCapsule(pos, vel, dt, radius = 0.32, height = 1.8, stepUp = true) {
    const result = {
      onGround: false,
      hitWall: false,
      hitCeil: false,
      surface: "concrete",
    };

    const startY = pos.y;
    resolveCapsuleHorizontal(pos, vel, radius, height, stepUp, dt, result);
    resolveCapsuleVertical(pos, vel, radius, height, stepUp, dt, startY, result);
    return result;
  }

  // --------------------------------------------------------------------------
  // 4. 2D 栅格化导航网格与寻路 (NavGrid & A* Pathfinder)
  // --------------------------------------------------------------------------

  function ensureNavBuilt() {
    if (navGridDirty) buildNavGrid();
  }

  function buildNavGrid() {
    blockedGrid = new Uint8Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);
    navGridDirty = false;

    for (const box of boxes) {
      if (box.noNav || box.bulletOnly || box.max.y < STEP_UP_HEIGHT + 0.05 || box.min.y > 1.5) {
        continue;
      }

      const colMin = Math.max(
        0,
        Math.floor((box.min.x - OBSTACLE_DILATION - NAV_MIN_X) / NAV_CELL_SIZE),
      );
      const colMax = Math.min(
        NAV_GRID_WIDTH - 1,
        Math.floor((box.max.x + OBSTACLE_DILATION - NAV_MIN_X) / NAV_CELL_SIZE),
      );
      const rowMin = Math.max(
        0,
        Math.floor((box.min.z - OBSTACLE_DILATION - NAV_MIN_Z) / NAV_CELL_SIZE),
      );
      const rowMax = Math.min(
        NAV_GRID_HEIGHT - 1,
        Math.floor((box.max.z + OBSTACLE_DILATION - NAV_MIN_Z) / NAV_CELL_SIZE),
      );

      for (let r = rowMin; r <= rowMax; r++) {
        for (let c = colMin; c <= colMax; c++) {
          blockedGrid[r * NAV_GRID_WIDTH + c] = 1;
        }
      }
    }

    // 封闭码头边缘与外围边界
    for (let r = 0; r < NAV_GRID_HEIGHT; r++) {
      for (let c = 0; c < NAV_GRID_WIDTH; c++) {
        const worldX = NAV_MIN_X + (c + 0.5) * NAV_CELL_SIZE;
        if (
          worldX > SCENE_BOUNDS.quayX - OBSTACLE_DILATION ||
          c === 0 ||
          r === 0 ||
          c === NAV_GRID_WIDTH - 1 ||
          r === NAV_GRID_HEIGHT - 1
        ) {
          blockedGrid[r * NAV_GRID_WIDTH + c] = 1;
        }
      }
    }
  }

  function worldToCellIndex(x, z) {
    const col = Math.floor((x - NAV_MIN_X) / NAV_CELL_SIZE);
    const row = Math.floor((z - NAV_MIN_Z) / NAV_CELL_SIZE);
    if (col < 0 || row < 0 || col >= NAV_GRID_WIDTH || row >= NAV_GRID_HEIGHT) return -1;
    return row * NAV_GRID_WIDTH + col;
  }

  function cellIndexToWorld(cellIdx) {
    const col = cellIdx % NAV_GRID_WIDTH;
    const row = Math.floor(cellIdx / NAV_GRID_WIDTH);
    return new THREE.Vector3(
      NAV_MIN_X + (col + 0.5) * NAV_CELL_SIZE,
      0,
      NAV_MIN_Z + (row + 0.5) * NAV_CELL_SIZE,
    );
  }

  function findNearestWalkableCell(x, z) {
    let col = Math.floor((x - NAV_MIN_X) / NAV_CELL_SIZE);
    let row = Math.floor((z - NAV_MIN_Z) / NAV_CELL_SIZE);
    col = Math.max(0, Math.min(NAV_GRID_WIDTH - 1, col));
    row = Math.max(0, Math.min(NAV_GRID_HEIGHT - 1, row));

    const directIdx = row * NAV_GRID_WIDTH + col;
    if (!blockedGrid[directIdx]) return directIdx;

    for (let radius = 1; radius <= 12; radius++) {
      let bestIdx = -1;
      let minSq = Infinity;
      for (let ro = -radius; ro <= radius; ro++) {
        for (let co = -radius; co <= radius; co++) {
          if (Math.max(Math.abs(co), Math.abs(ro)) !== radius) continue;
          const cc = col + co;
          const rr = row + ro;
          if (cc >= 0 && rr >= 0 && cc < NAV_GRID_WIDTH && rr < NAV_GRID_HEIGHT) {
            const idx = rr * NAV_GRID_WIDTH + cc;
            if (!blockedGrid[idx]) {
              const sq = co * co + ro * ro;
              if (sq < minSq) {
                minSq = sq;
                bestIdx = idx;
              }
            }
          }
        }
      }
      if (bestIdx >= 0) return bestIdx;
    }
    return -1;
  }

  // 栅格化 Bresenham 视线穿越测试 (Line of sight on grid)
  function isGridLineClear(idx1, idx2) {
    let c1 = idx1 % NAV_GRID_WIDTH;
    let r1 = Math.floor(idx1 / NAV_GRID_WIDTH);
    const c2 = idx2 % NAV_GRID_WIDTH;
    const r2 = Math.floor(idx2 / NAV_GRID_WIDTH);

    const dc = Math.abs(c2 - c1);
    const dr = Math.abs(r2 - r1);
    const stepC = c1 < c2 ? 1 : -1;
    const stepR = r1 < r2 ? 1 : -1;
    let err = dc - dr;

    for (let i = 0; i < 600; i++) {
      if (blockedGrid[r1 * NAV_GRID_WIDTH + c1]) return false;
      if (c1 === c2 && r1 === r2) return true;

      const e2 = 2 * err;
      if (e2 > -dr && e2 < dc) {
        if (
          blockedGrid[r1 * NAV_GRID_WIDTH + c1 + stepC] ||
          blockedGrid[(r1 + stepR) * NAV_GRID_WIDTH + c1]
        ) {
          return false;
        }
        err += dc - dr;
        c1 += stepC;
        r1 += stepR;
      } else if (e2 > -dr) {
        err -= dr;
        c1 += stepC;
      } else {
        err += dc;
        r1 += stepR;
      }
    }
    return false;
  }

  // A* 算法内部缓冲与二叉最小堆
  const gCostBuf = new Float32Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);
  const parentBuf = new Int32Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);
  const openTag = new Uint32Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);
  const closedTag = new Uint32Array(NAV_GRID_WIDTH * NAV_GRID_HEIGHT);
  let searchEpoch = 0;
  const heapIdx = [];
  const heapScore = [];

  function heapPush(cell, score) {
    let i = heapIdx.length;
    heapIdx.push(cell);
    heapScore.push(score);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapScore[p] <= score) break;
      heapIdx[i] = heapIdx[p];
      heapScore[i] = heapScore[p];
      i = p;
    }
    heapIdx[i] = cell;
    heapScore[i] = score;
  }

  function heapPop() {
    const top = heapIdx[0];
    const lastCell = heapIdx.pop();
    const lastScore = heapScore.pop();
    const len = heapIdx.length;
    if (len > 0) {
      let i = 0;
      while (true) {
        let child = 2 * i + 1;
        if (child >= len) break;
        if (child + 1 < len && heapScore[child + 1] < heapScore[child]) child++;
        if (heapScore[child] >= lastScore) break;
        heapIdx[i] = heapIdx[child];
        heapScore[i] = heapScore[child];
        i = child;
      }
      heapIdx[i] = lastCell;
      heapScore[i] = lastScore;
    }
    return top;
  }

  function aStarSearch(startCell, targetCell) {
    searchEpoch++;
    heapIdx.length = 0;
    heapScore.length = 0;

    const targetC = targetCell % NAV_GRID_WIDTH;
    const targetR = Math.floor(targetCell / NAV_GRID_WIDTH);

    // 对角距离启发函数 (Octile heuristic)
    const heuristic = (cell) => {
      const dc = Math.abs((cell % NAV_GRID_WIDTH) - targetC);
      const dr = Math.abs(Math.floor(cell / NAV_GRID_WIDTH) - targetR);
      return dc + dr + (1.4142 - 2) * Math.min(dc, dr);
    };

    gCostBuf[startCell] = 0;
    openTag[startCell] = searchEpoch;
    parentBuf[startCell] = -1;
    heapPush(startCell, heuristic(startCell));

    let iter = 0;
    while (heapIdx.length > 0) {
      const curr = heapPop();
      if (curr === targetCell) break;
      if (closedTag[curr] === searchEpoch) continue;
      closedTag[curr] = searchEpoch;

      if (++iter > 9000) return null; // 超出最大搜索深度

      const cc = curr % NAV_GRID_WIDTH;
      const rr = Math.floor(curr / NAV_GRID_WIDTH);

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = cc + dc;
          const nr = rr + dr;
          if (nc < 0 || nr < 0 || nc >= NAV_GRID_WIDTH || nr >= NAV_GRID_HEIGHT) continue;

          const neighbor = nr * NAV_GRID_WIDTH + nc;
          if (blockedGrid[neighbor] || closedTag[neighbor] === searchEpoch) continue;
          // 防止斜穿墙角
          if (
            dc &&
            dr &&
            (blockedGrid[rr * NAV_GRID_WIDTH + nc] || blockedGrid[nr * NAV_GRID_WIDTH + cc])
          ) {
            continue;
          }

          const moveCost = dc && dr ? 1.4142 : 1.0;
          const tentativeG = gCostBuf[curr] + moveCost;

          if (openTag[neighbor] !== searchEpoch || tentativeG < gCostBuf[neighbor]) {
            gCostBuf[neighbor] = tentativeG;
            openTag[neighbor] = searchEpoch;
            parentBuf[neighbor] = curr;
            heapPush(neighbor, tentativeG + heuristic(neighbor));
          }
        }
      }
    }

    if (openTag[targetCell] !== searchEpoch) return null;

    const path = [];
    for (let c = targetCell; c !== -1; c = parentBuf[c]) {
      path.push(c);
    }
    path.reverse();
    return path;
  }

  const navAPI = {
    cell: NAV_CELL_SIZE,

    isWalkable(x, z) {
      ensureNavBuilt();
      const idx = worldToCellIndex(x, z);
      return idx >= 0 && !blockedGrid[idx];
    },

    findPath(fromPos, toPos) {
      ensureNavBuilt();
      const startCell = findNearestWalkableCell(fromPos.x, fromPos.z);
      const targetCell = findNearestWalkableCell(toPos.x, toPos.z);
      if (startCell < 0 || targetCell < 0) return null;
      if (startCell === targetCell) {
        return [new THREE.Vector3(toPos.x, 0, toPos.z)];
      }

      const cellPath = aStarSearch(startCell, targetCell);
      if (!cellPath) return null;

      // 视线拉直简化 (String-pulling shortcutting)
      const smoothedWaypoints = [];
      let anchor = 0;
      while (anchor < cellPath.length - 1) {
        let bestTarget = anchor + 1;
        for (let testIdx = cellPath.length - 1; testIdx > anchor + 1; testIdx--) {
          if (isGridLineClear(cellPath[anchor], cellPath[testIdx])) {
            bestTarget = testIdx;
            break;
          }
        }
        smoothedWaypoints.push(cellIndexToWorld(cellPath[bestTarget]));
        anchor = bestTarget;
      }

      if (worldToCellIndex(toPos.x, toPos.z) === targetCell && smoothedWaypoints.length > 0) {
        smoothedWaypoints[smoothedWaypoints.length - 1].set(toPos.x, 0, toPos.z);
      }
      return smoothedWaypoints;
    },

    randomPoint(centerPos, radius) {
      ensureNavBuilt();
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * 6.2832;
        const dist = Math.sqrt(Math.random()) * radius;
        const px = centerPos.x + Math.cos(ang) * dist;
        const pz = centerPos.z + Math.sin(ang) * dist;
        const cell = worldToCellIndex(px, pz);
        if (cell >= 0 && !blockedGrid[cell]) {
          return new THREE.Vector3(px, 0, pz);
        }
      }
      const fallback = findNearestWalkableCell(centerPos.x, centerPos.z);
      return fallback >= 0
        ? cellIndexToWorld(fallback)
        : new THREE.Vector3(centerPos.x, 0, centerPos.z);
    },

    clearLine(posA, posB) {
      ensureNavBuilt();
      const cellA = worldToCellIndex(posA.x, posA.z);
      const cellB = worldToCellIndex(posB.x, posB.z);
      return cellA >= 0 && cellB >= 0 && isGridLineClear(cellA, cellB);
    },

    _grid() {
      ensureNavBuilt();
      return {
        blocked: blockedGrid,
        w: NAV_GRID_WIDTH,
        h: NAV_GRID_HEIGHT,
        minX: NAV_MIN_X,
        minZ: NAV_MIN_Z,
        cell: NAV_CELL_SIZE,
      };
    },
  };

  const physicsSystem = {
    boxes,
    bounds: {
      min: SCENE_BOUNDS.min.clone(),
      max: SCENE_BOUNDS.max.clone(),
    },
    addBox,
    removeBox,
    build() {
      buildNavGrid();
    },
    raycast,
    lineOfSight,
    groundHeight,
    moveCapsule,
    nav: navAPI,
  };

  return physicsSystem;
}

export const create = createPhysicsSystem;
export { toVector3 as f3 };
