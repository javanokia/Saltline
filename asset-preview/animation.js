/* Fixed-step playback of the game's original skeletal and weapon controllers. */
window.createAssetAnimator = function createAssetAnimator(api) {
  "use strict";
  const $ = (selector) => document.querySelector(selector),
    T = api.THREE;
  const clips = {
    hound: [
      { id: "idle", name: "待机", duration: 4 },
      { id: "walk", name: "原地行走", duration: 4 },
      { id: "run", name: "原地奔跑", duration: 3 },
      { id: "aim", name: "瞄准扫描", duration: 5 },
    ],
    gull: [
      { id: "hover", name: "悬停", duration: 4 },
      { id: "scan", name: "巡查（原地展示）", duration: 6 },
    ],
    pac9: [
      { id: "idle", name: "持枪待机", duration: 4 },
      { id: "fire", name: "连发射击", duration: 1.5 },
      { id: "reload", name: "空仓换弹", duration: 2.8 },
      { id: "ads", name: "瞄准举枪", duration: 2 },
    ],
  };
  const holder = new T.Group();
  holder.name = "animated-asset-preview";
  api.scene.add(holder);
  const fixedStep = 1 / 120;
  let active = null,
    job = 0,
    seeking = false;
  const supports = (state) => state.tab === "models" && !!clips[state.selected];
  function updateControls() {
    if (!active) return;
    $("#animation-time").value = active.time;
    $("#animation-clock").textContent =
      active.time.toFixed(2) + " / " + active.clip.duration.toFixed(2) + " s";
    $("#animation-play").textContent = active.playing
      ? "暂停"
      : active.time >= active.clip.duration
        ? "重新播放"
        : "播放";
    $("#animation-play").setAttribute("aria-pressed", active.playing);
  }
  function applyWire() {
    if (!active) return;
    active.controller.root.traverse((object) => {
      if (object.isMesh)
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          material.wireframe = $("#wire").checked;
    });
  }
  function restoreStudio() {
    if (!active) return;
    const { state, controller, helper, oldVisible, bonesDisabled } = active;
    state.object.visible = oldVisible;
    if (active.originalHelper)
      active.originalHelper.visible = $("#bones").checked;
    helper?.dispose();
    controller.dispose();
    holder.clear();
    $("#bones").disabled = bonesDisabled;
    $("#compare").disabled = false;
    $("#compare").hidden = api.getState().tab === "sounds";
    $("#replay").disabled = false;
    $("#replay").hidden = api.getState().tab === "sounds";
    const partTab = document.querySelector('[data-inspector="parts"]');
    partTab.hidden = api.getState().tab !== "models";
    $("#animation-controls").hidden = true;
    $("#animation").textContent = "播放动画";
    active = null;
  }
  function stop() {
    job++;
    restoreStudio();
  }
  function resetController() {
    active.controller.reset(active.clip.id);
    active.time = 0;
    active.accumulator = 0;
    active.controller.setWetness(api.getState().config.wet);
  }
  function setClip(id) {
    if (!active) return;
    active.clip =
      clips[active.state.selected].find((clip) => clip.id === id) ||
      clips[active.state.selected][0];
    $("#animation-clip").value = active.clip.id;
    $("#animation-time").max = active.clip.duration;
    resetController();
    updateControls();
  }
  function seek(seconds) {
    if (!active) return;
    seeking = true;
    try {
      const target = Math.max(0, Math.min(active.clip.duration, +seconds));
      resetController();
      let time = 0;
      while (time + fixedStep < target - 1e-9) {
        active.controller.step(fixedStep);
        time += fixedStep;
      }
      if (target - time > 1e-9) active.controller.step(target - time);
      active.time = target;
      active.accumulator = 0;
      updateControls();
    } finally {
      seeking = false;
    }
  }
  async function begin() {
    if (active) {
      stop();
      return;
    }
    const state = api.getState();
    if (!supports(state)) return;
    const token = ++job;
    api.labs.beforeChange();
    if (api.analysis.comparing) $("#compare").click();
    $("#animation").disabled = true;
    $("#compare").disabled = true;
    $("#replay").disabled = true;
    $("#status").textContent = "正在准备原始动画驱动…";
    let controller = null;
    try {
      controller = await api.Saltline.createAnimation(state.selected, api.game);
      if (token !== job) {
        controller?.dispose();
        return;
      }
      const originalHelper = api.scene.children.find(
        (object) => object.isSkeletonHelper,
      );
      active = {
        state,
        controller,
        clip: clips[state.selected].find(
          (clip) =>
            clip.id ===
            { hound: "walk", gull: "hover", pac9: "reload" }[state.selected],
        ),
        time: 0,
        playing: true,
        accumulator: 0,
        oldVisible: state.object.visible,
        originalHelper,
        bonesDisabled: $("#bones").disabled,
        helper: null,
      };
      holder.add(controller.root);
      state.object.visible = false;
      if (originalHelper) originalHelper.visible = false;
      if (controller.skeleton) {
        active.helper = new T.SkeletonHelper(controller.mesh);
        holder.add(active.helper);
        active.helper.visible = $("#bones").checked;
        $("#bones").disabled = false;
      }
      $("#animation-clip").replaceChildren(
        ...clips[state.selected].map((clip) => new Option(clip.name, clip.id)),
      );
      setClip(active.clip.id);
      applyWire();
      $("#animation-controls").hidden = false;
      $("#animation").textContent = "退出动画";
      $("#compare").hidden = true;
      $("#replay").hidden = true;
      document.querySelector('[data-inspector="info"]').click();
      document.querySelector('[data-inspector="parts"]').hidden = true;
      $("#animation-note").textContent =
        state.selected === "hound"
          ? "复用原游戏步态调度、弹簧姿态和三关节 IK；使用固定预览轨迹，机身位置保持在原地，不运行战斗 AI。"
          : state.selected === "gull"
            ? "复用原游戏旋翼、悬停、机身倾斜和云台驱动；保持在视野中心，不运行战斗 AI。"
            : "复用原游戏持枪、后坐力、枪机、弹匣与手部动作；动画模式包含原始手臂，静态模型分析保持原样。";
      $("#status").textContent = "动画驱动就绪";
      updateControls();
    } catch (error) {
      controller?.dispose();
      if (token === job) {
        active = null;
        holder.clear();
        state.object.visible = true;
        $("#compare").disabled = false;
        $("#replay").disabled = false;
        $("#status").textContent = "动画加载失败：" + error.message;
      }
      console.error(error);
    } finally {
      $("#animation").disabled = false;
    }
  }
  $("#animation").onclick = begin;
  $("#animation-close").onclick = stop;
  $("#animation-play").onclick = () => {
    if (!active) return;
    if (active.time >= active.clip.duration) seek(0);
    active.playing = !active.playing;
    updateControls();
  };
  $("#animation-clip").onchange = () => setClip($("#animation-clip").value);
  $("#animation-time").oninput = () => {
    if (!active) return;
    active.playing = false;
    seek($("#animation-time").value);
  };
  $("#animation-reset").onclick = () => {
    if (!active) return;
    active.playing = false;
    seek(0);
  };
  $("#animation-source").onclick = () => {
    if (active)
      api.openSource([
        ...active.controller.sources,
        ["预览轨迹与动作输入", active.controller.step.toString()],
      ]);
  };
  $("#wire").addEventListener("change", applyWire);
  $("#wet").addEventListener("input", () =>
    active?.controller.setWetness(+$("#wet").value),
  );
  $("#bones").addEventListener("change", () => {
    if (!active) return;
    if (active.originalHelper) active.originalHelper.visible = false;
    if (active.helper) active.helper.visible = $("#bones").checked;
  });
  return {
    beforeChange: stop,
    onSelection() {
      const state = api.getState();
      $("#animation").hidden = !supports(state);
    },
    frame(dt) {
      if (!active || !active.playing || seeking) return;
      active.accumulator += Math.min(dt, 0.1) * +$("#animation-speed").value;
      while (active && active.playing && active.accumulator >= fixedStep) {
        const remaining = active.clip.duration - active.time;
        if (remaining <= 1e-9) {
          if ($("#animation-loop").checked) {
            const carry = active.accumulator;
            resetController();
            active.accumulator = carry;
          } else active.playing = false;
          continue;
        }
        const step = Math.min(fixedStep, remaining);
        active.accumulator -= step;
        active.controller.step(step);
        active.time = Math.min(active.clip.duration, active.time + step);
        if (
          active.time >= active.clip.duration - 1e-9 &&
          !$("#animation-loop").checked
        )
          active.playing = false;
      }
      updateControls();
    },
    seek,
    stop,
    get active() {
      return active;
    },
    get supported() {
      return supports(api.getState());
    },
    dispose() {
      stop();
      api.scene.remove(holder);
    },
  };
};
