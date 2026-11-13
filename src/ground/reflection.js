// @ts-check
/**
 * @file src/ground/reflection.js
 * @description 地面水洼/积水平面反射探针 (Oblique Near-Plane Planar Reflection Pass)
 */

import * as THREE from "three";

const {
  PerspectiveCamera,
  WebGLRenderTarget,
  HalfFloatType,
  RGBAFormat,
  LinearSRGBColorSpace,
  LinearMipmapLinearFilter,
  LinearFilter,
  Vector3,
  Vector2,
  Vector4,
  Matrix4,
  Plane,
} = THREE;

/**
 * 创建地面水洼与水面的平面反射探针
 * @param {import('../types').EngineContext} engineCtx
 * @param {Record<string, { value: any }>} uniforms
 * @param {THREE.Object3D[]} groundMeshes
 * @returns {{ target: THREE.WebGLRenderTarget, camera: THREE.PerspectiveCamera, enabled: boolean, active: boolean, pass: (renderer: any, scene: any, mainCamera: THREE.Camera) => void }}
 */
export function createPlanarReflector(engineCtx, uniforms, groundMeshes) {
  let reflCamera = new PerspectiveCamera();
  reflCamera.layers.set(0);
  reflCamera.matrixAutoUpdate = true;

  let renderTarget = new WebGLRenderTarget(16, 16, {
    type: HalfFloatType,
    format: RGBAFormat,
    colorSpace: LinearSRGBColorSpace,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: true,
    depthBuffer: true,
    stencilBuffer: false,
    samples: 0,
  });
  renderTarget.texture.name = "planarReflection";

  let camWorldPos = new Vector3(),
    camTargetPos = new Vector3(),
    camRotMatrix = new Matrix4(),
    bufferSize = new Vector2(),
    clipPlane = new Plane(),
    clipVector = new Vector4(),
    qVector = new Vector4(),
    biasMatrix = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1),
    visibilityStack = /** @type {boolean[]} */ ([]),
    reflectorState = {
      target: renderTarget,
      camera: reflCamera,
      enabled: true,
      active: false,
      pass: /** @type {any} */ (null),
    };

  function executePlanarReflectionPass(renderer, scene, mainCamera) {
    let planarQuality = engineCtx.quality.planar || 0;
    if (!reflectorState.enabled || planarQuality <= 0) {
      uniforms.uReflOn.value = 0;
      reflectorState.active = false;
      return;
    }

    camWorldPos.setFromMatrixPosition(mainCamera.matrixWorld);
    if (camWorldPos.y < 0.03) {
      uniforms.uReflOn.value = 0;
      reflectorState.active = false;
      return;
    }

    let renderRes = engineCtx.render && engineCtx.render.resolution;
    if (renderRes && renderRes.x > 8) {
      bufferSize.copy(renderRes);
    } else {
      renderer.getDrawingBufferSize(bufferSize);
    }

    let targetWidth = Math.max(64, Math.round((bufferSize.x * planarQuality) / 16) * 16),
      targetHeight = Math.max(32, Math.round((bufferSize.y * planarQuality) / 8) * 8);

    if (renderTarget.width !== targetWidth || renderTarget.height !== targetHeight) {
      renderTarget.setSize(targetWidth, targetHeight);
    }

    camRotMatrix.extractRotation(mainCamera.matrixWorld);
    camTargetPos.set(0, 0, -1).applyMatrix4(camRotMatrix).add(camWorldPos);

    // 翻转 Y 轴镜像相机
    reflCamera.position.set(camWorldPos.x, -camWorldPos.y, camWorldPos.z);
    reflCamera.up.set(0, 1, 0).applyMatrix4(camRotMatrix);
    reflCamera.up.y = -reflCamera.up.y;
    camTargetPos.y = -camTargetPos.y;
    reflCamera.lookAt(camTargetPos);

    let perspCamera = /** @type {THREE.PerspectiveCamera} */ (mainCamera);
    reflCamera.near = perspCamera.near;
    reflCamera.far = perspCamera.far;
    reflCamera.updateMatrixWorld(true);
    reflCamera.matrixWorldInverse.copy(reflCamera.matrixWorld).invert();
    reflCamera.projectionMatrix.copy(perspCamera.projectionMatrix);

    // 计算反射矩阵
    uniforms.uReflMatrix.value
      .copy(biasMatrix)
      .multiply(reflCamera.projectionMatrix)
      .multiply(reflCamera.matrixWorldInverse);

    // Oblique Near-Plane 斜剪裁矩阵计算 (避免反射水面下方的不可见物体)
    clipPlane.normal.set(0, 1, 0);
    clipPlane.constant = 0.01;
    clipPlane.applyMatrix4(reflCamera.matrixWorldInverse);
    clipVector.set(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);

    let proj = reflCamera.projectionMatrix.elements;
    qVector.x = (Math.sign(clipVector.x) + proj[8]) / proj[0];
    qVector.y = (Math.sign(clipVector.y) + proj[9]) / proj[5];
    qVector.z = -1;
    qVector.w = (1 + proj[10]) / proj[14];

    clipVector.multiplyScalar(2 / clipVector.dot(qVector));
    proj[2] = clipVector.x;
    proj[6] = clipVector.y;
    proj[10] = clipVector.z + 1;
    proj[14] = clipVector.w;
    reflCamera.projectionMatrixInverse.copy(reflCamera.projectionMatrix).invert();

    let mainProj = perspCamera.projectionMatrix.elements;
    uniforms.uReflScale.value.set(mainProj[0] * 0.5, mainProj[5] * 0.5);
    uniforms.uReflLod.value = Math.log2(Math.max(targetHeight, 1) / 270);

    // 渲染时隐藏地面主体本身
    for (let i = 0; i < groundMeshes.length; i++) {
      visibilityStack[i] = groundMeshes[i].visible;
      groundMeshes[i].visible = false;
    }

    try {
      if (engineCtx.render && engineCtx.render.renderWorld) {
        engineCtx.render.renderWorld(reflCamera, renderTarget);
      }
    } finally {
      for (let i = 0; i < groundMeshes.length; i++) {
        groundMeshes[i].visible = visibilityStack[i];
      }
    }

    uniforms.uRefl.value = renderTarget.texture;
    uniforms.uReflOn.value = 1;
    reflectorState.active = true;
  }

  reflectorState.pass = executePlanarReflectionPass;
  return reflectorState;
}
