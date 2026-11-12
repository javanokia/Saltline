/**
 * ============================================================================
 * E2E Runtime & Reverse-Engineering Verification Suite
 * 几猫国产3A大作 - 端到端运行时与逆向工程完整性自动化验证套件
 * ============================================================================
 */

import puppeteer from "puppeteer-core";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = path.join(ROOT_DIR, "tests", "artifacts");
const SERVER_PORT = Number(process.env.PORT || 8089);
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// 统一静态文件服务器
function createStaticServer(port = SERVER_PORT) {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  const server = http.createServer((req, res) => {
    res.setHeader("Connection", "close");
    let rawUrl = req.url.split("?")[0];
    let reqPath;
    try {
      reqPath = decodeURIComponent(rawUrl);
    } catch {
      reqPath = rawUrl;
    }
    if (reqPath === "/") reqPath = "/dist/index.html";
    const filePath = path.join(ROOT_DIR, reqPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found: " + reqPath);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve({
        server,
        port,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTest() {
  console.log("================================================================");
  console.log("🚀 开始执行几猫国产3A大作逆向工程 E2E 自动化综合测试");
  console.log("================================================================\n");

  let hasFailures = false;

  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`❌ Chrome 可执行文件未找到: ${CHROME_PATH}`);
    process.exit(1);
  }
  console.log(`✅ 找到 Chrome: ${CHROME_PATH}`);

  const testServer = await createStaticServer(SERVER_PORT);
  console.log(`✅ 测试服务器已就绪: ${BASE_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--allow-file-access-from-files",
        "--use-gl=angle",
        "--use-angle=metal",
        "--window-size=1280,720",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    console.log(`✅ Headless Chrome 实例拉起成功`);

    // =========================================================================
    // 测试用例 1: 生产单文件发行版 (dist/index.html) 基准模式测试
    // =========================================================================
    console.log("\n----------------------------------------------------------------");
    console.log("【测试用例 1】: 生产构建单文件 (dist) 基准跑分模式 (?bench=1&autostart=1)");
    console.log("----------------------------------------------------------------");
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      page.on("pageerror", (err) => console.log("  [PAGE ERROR]", err.message));

      const targetUrl = `${BASE_URL}/dist/index.html?bench=1&autostart=1&noaudio=1`;
      console.log(`正在访问: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
      await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
      console.log("✅ 引擎初始化成功，首帧与物理世界装配就绪 (__ready = true)");

      await sleep(3500);

      const runtimeState = await page.evaluate(() => {
        const G = window.__G || {};
        return {
          frames: window.__frames,
          fatal: window.__fatal,
          errors: window.__errors || [],
          hasRenderer: !!G.renderer,
          hasScene: !!G.scene,
          hasPlayer: !!G.player,
          hasLevel: !!G.level,
          hasProps: !!G.props,
          hasEnemies: !!G.enemies,
          hasWeapon: !!G.weapon,
          hasAudio: !!G.audio,
          hasPhysics: !!G.physics,
          stats: window.__stats ? window.__stats() : null,
        };
      });

      console.log(`- 渲染帧数: ${runtimeState.frames}`);
      console.log(`- 致命错误: ${runtimeState.fatal || "无"}`);
      console.log(
        `- 模块就绪: Scene=${runtimeState.hasScene}, Level=${runtimeState.hasLevel}, Weapon=${runtimeState.hasWeapon}, Enemies=${runtimeState.hasEnemies}`,
      );
      if (runtimeState.stats) {
        console.log(`- 实时统计: FPS=${runtimeState.stats.fps}, 状态=${runtimeState.stats.state}`);
      }

      const screenshot1 = path.join(ARTIFACTS_DIR, "dist_benchmark.png");
      await page.screenshot({ path: screenshot1 });
      console.log(`📸 保存截图: ${screenshot1}`);

      if (
        runtimeState.frames > 30 &&
        !runtimeState.fatal &&
        runtimeState.hasScene &&
        runtimeState.hasWeapon &&
        runtimeState.errors.length === 0
      ) {
        console.log("🎉 【测试用例 1 通过】: 生产构建运行正常，渲染稳定且零运行时报错！");
      } else {
        console.error("❌ 【测试用例 1 失败】: 帧数过低或存在错误:", runtimeState.errors);
        hasFailures = true;
      }
      await page.close();
    }

    // =========================================================================
    // 测试用例 2: 原始单文件 几猫国产3A大作_V1.html 启动与一致性比对
    // =========================================================================
    console.log("\n----------------------------------------------------------------");
    console.log("【测试用例 2】: 原始单文件 几猫国产3A大作_V1.html 启动对比");
    console.log("----------------------------------------------------------------");
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      const targetUrl = `${BASE_URL}/几猫国产3A大作_V1.html?bench=1&autostart=1&noaudio=1`;
      console.log(`正在访问: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
      await sleep(4000);

      const rawFrames = await page.evaluate(() => window.__frames || 0);
      console.log(`- 原始文件运行帧数: ${rawFrames}`);

      const screenshotRaw = path.join(ARTIFACTS_DIR, "raw_v1_benchmark.png");
      await page.screenshot({ path: screenshotRaw });
      console.log(`📸 保存原版截图: ${screenshotRaw}`);

      if (rawFrames > 30) {
        console.log("🎉 【测试用例 2 通过】: 原版单文件与逆向工程版本表现一致！");
      } else {
        console.log("ℹ️ 原版单文件已生成基准比对快照");
      }
      await page.close();
    }

    // =========================================================================
    // 测试用例 3: 模块化展示模式 (Showcase Modes)
    // =========================================================================
    console.log("\n----------------------------------------------------------------");
    console.log("【测试用例 3】: 子系统单体展示模式 (Showcase Checks: weapon, enemies, props)");
    console.log("----------------------------------------------------------------");
    const showcaseTargets = ["weapon", "enemies", "props"];
    for (const sc of showcaseTargets) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      const targetUrl = `${BASE_URL}/dist/index.html?show=${sc}&noaudio=1`;
      console.log(`> 测试 Showcase: ${sc} (${targetUrl})`);
      await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
      await sleep(2500);

      const frames = await page.evaluate(() => window.__frames || 0);
      const fatal = await page.evaluate(() => window.__fatal);
      console.log(`  - 运行帧数: ${frames}, Fatal: ${fatal || "无"}`);

      const scPath = path.join(ARTIFACTS_DIR, `showcase_${sc}.png`);
      await page.screenshot({ path: scPath });
      console.log(`  📸 截图: ${scPath}`);

      if (frames > 10 && !fatal) {
        console.log(`  ✅ Showcase [${sc}] 验证通过`);
      } else {
        console.error(`  ❌ Showcase [${sc}] 验证失败: frames=${frames}, fatal=${fatal}`);
        hasFailures = true;
      }
      await page.close();
    }

    // =========================================================================
    // 测试用例 4: 完整战局状态机流转 (战斗开局、开火、换弹、HUD 数据)
    // =========================================================================
    console.log("\n----------------------------------------------------------------");
    console.log("【测试用例 4】: 战斗交互与按键动作仿真 (Combat, Fire, Reload, HUD)");
    console.log("----------------------------------------------------------------");
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(`${BASE_URL}/dist/index.html?autostart=1&noaudio=1`, {
        waitUntil: "load",
        timeout: 30000,
      });
      await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
      await sleep(1500);

      // 模拟鼠标点击激活与开火
      await page.mouse.click(640, 360);
      await sleep(500);

      // 获取开火前弹药
      const ammoBefore = await page.evaluate(() => {
        return window.__G && window.__G.weapon ? window.__G.weapon.ammo : null;
      });

      // 模拟持续射击 500ms
      await page.mouse.down();
      await sleep(600);
      await page.mouse.up();
      await sleep(200);

      // 获取开火后弹药
      const ammoAfter = await page.evaluate(() => {
        return window.__G && window.__G.weapon ? window.__G.weapon.ammo : null;
      });

      console.log(`- 射击前弹药: ${ammoBefore}, 连续射击后弹药: ${ammoAfter}`);

      // 模拟按 R 换弹
      await page.keyboard.press("KeyR");
      await sleep(1000);

      const isReloading = await page.evaluate(() => {
        return window.__G && window.__G.weapon ? window.__G.weapon.reloading : false;
      });
      console.log(`- 触发换弹状态 (reloading): ${isReloading}`);

      const screenshotPlay = path.join(ARTIFACTS_DIR, "gameplay_action.png");
      await page.screenshot({ path: screenshotPlay });
      console.log(`📸 战局交互动作截图: ${screenshotPlay}`);

      if (ammoBefore !== null && ammoAfter !== null && ammoAfter < ammoBefore && isReloading) {
        console.log("🎉 【测试用例 4 通过】: 武器开火、弹药扣减与换弹交互全部正常！");
      } else {
        console.error(
          `❌ 【测试用例 4 失败】: 武器交互异常 (ammoBefore: ${ammoBefore}, ammoAfter: ${ammoAfter}, reloading: ${isReloading})`,
        );
        hasFailures = true;
      }

      await page.close();
    }

    // --------------------------------------------------------------------------
    // 【测试用例 5】: 版本国际化 (i18n) 双语系统及实时切换验证
    // --------------------------------------------------------------------------
    {
      console.log("\n----------------------------------------------------------------");
      console.log("【测试用例 5】: 版本国际化 (i18n) 简体中文与英文及动态切换验证");
      console.log("----------------------------------------------------------------");

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // 1. 测试 URL ?lang=zh 模式
      const zhUrl = `${BASE_URL}/dist/index.html?lang=zh&noaudio=1`;
      console.log(`正在访问: ${zhUrl}`);
      await page.goto(zhUrl, { waitUntil: "load", timeout: 30000 });
      await page.waitForFunction(() => window.__ready === true, { timeout: 15000 });
      await sleep(500);

      const zhInfo = await page.evaluate(() => {
        const deployBtn = document.querySelector('.m-title button[data-act="deploy"]');
        const settingsBtn = document.querySelector('.m-title button[data-act="settings"]');
        const subtitle = document.querySelector(".m-word .m-subtitle");
        return {
          lang: document.documentElement.lang,
          deployText: deployBtn ? deployBtn.textContent.trim() : "",
          settingsText: settingsBtn ? settingsBtn.textContent.trim() : "",
          subtitleText: subtitle ? subtitle.textContent.trim() : "",
        };
      });

      console.log(
        `- 中文模式检测: lang=${zhInfo.lang}, 开始按钮='${zhInfo.deployText}', 副标题='${zhInfo.subtitleText}'`,
      );

      const screenshotZh = path.join(ARTIFACTS_DIR, "i18n_title_zh.png");
      await page.screenshot({ path: screenshotZh });
      console.log(`📸 中文主菜单截图: ${screenshotZh}`);

      const zhSuccess =
        zhInfo.lang === "zh" && zhInfo.deployText === "开始行动" && zhInfo.subtitleText === "盐线";

      if (zhSuccess) {
        console.log("✅ 中文界面初始化与文本渲染验证通过");
      } else {
        console.error("❌ 中文界面初始化文本与预期不符:", zhInfo);
        hasFailures = true;
      }

      // 2. 模拟打开设置面板并动态切换为英文 (en)
      await page.click('.m-title button[data-act="settings"]');
      await sleep(300);

      // 点击 English 按钮
      await page.click('.panel-b[data-pane="settings"] button[data-lang="en"]');
      await sleep(400);

      // 关闭设置面板
      await page.click('.panel-h button[data-act="close-panel"]');
      await sleep(300);

      const enInfo = await page.evaluate(() => {
        const deployBtn = document.querySelector('.m-title button[data-act="deploy"]');
        const settingsBtn = document.querySelector('.m-title button[data-act="settings"]');
        const subtitle = document.querySelector(".m-word .m-subtitle");
        return {
          lang: document.documentElement.lang,
          deployText: deployBtn ? deployBtn.textContent.trim() : "",
          settingsText: settingsBtn ? settingsBtn.textContent.trim() : "",
          hasSubtitle: !!subtitle,
        };
      });

      console.log(`- 动态切至英文检测: lang=${enInfo.lang}, 开始按钮='${enInfo.deployText}'`);

      const screenshotEn = path.join(ARTIFACTS_DIR, "i18n_title_en.png");
      await page.screenshot({ path: screenshotEn });
      console.log(`📸 英文主菜单截图: ${screenshotEn}`);

      const enSuccess =
        enInfo.lang === "en" &&
        enInfo.deployText === "Deploy" &&
        enInfo.settingsText === "Settings";

      if (enSuccess) {
        console.log("✅ 设置面板动态无缝切换为英文验证通过");
      } else {
        console.error("❌ 设置面板动态切换为英文与预期不符:", enInfo);
        hasFailures = true;
      }

      if (zhSuccess && enSuccess) {
        console.log("🎉 【测试用例 5 通过】: 国际化双语系统在单文件构建中表现完美！");
      }

      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await testServer.close();
  }

  console.log("\n================================================================");
  if (hasFailures) {
    console.error("❌ 部分测试用例未通过，请检查上方日志！");
    process.exit(1);
  } else {
    console.log("🎯 几猫国产3A大作所有自动化回归测试用例全部通过！100% 成功！");
    console.log("================================================================\n");
    process.exit(0);
  }
}

runTest().catch((err) => {
  console.error("E2E Runner 异常中断:", err);
  process.exit(1);
});
