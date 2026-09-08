/*
 * Cursor 汉化工具（Node 24 可直接执行）
 * 用法：node cursor-cn.ts、node cursor-cn.ts --restore、--fix-checksum、--print-paths
 * 仅使用 Node 内置模块；类型注解由 Node 24 的可擦除 TypeScript 支持处理。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import * as zlib from "node:zlib";
import * as readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";

const SCRIPT_DIR = path.dirname(path.resolve(String(process.argv[1] || "")));
const LOCALIZATION_DIR = path.join(SCRIPT_DIR, "localization");
const RUNTIME_DIR = path.join(LOCALIZATION_DIR, "runtime");
const AD_POPUP_DICTIONARY_FILE = "ads.json";
const PLUGIN_MARKETPLACE_DICTIONARY_FILE = "marketplace.json";
const CORE_DICTIONARY_FILE = path.join(LOCALIZATION_DIR, "core.json");
const PATTERN_DICTIONARY_FILE = path.join(LOCALIZATION_DIR, "patterns.json");
const TRAY_DICTIONARY_FILE = path.join(LOCALIZATION_DIR, "tray.json");
const LANGUAGE_PACK_PUBLISHER = "MS-CEINTL";
const LANGUAGE_PACK_EXTENSION = "vscode-language-pack-zh-hans";
const LANGUAGE_PACK_MARKETPLACE_QUERY = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
const LANGUAGE_PACK_MARKETPLACE_DOWNLOAD = "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/MS-CEINTL/vsextensions/vscode-language-pack-zh-hans/{version}/vspackage";
const XUAN_SHI_YU_YAN = "zh-cn";
// Cursor 安装目录 / 用户数据目录在下方的路径检测模块中初始化。
const LOCALIZATION_JS_FILE = "Cursor_Localization.js";
const LEGACY_LOCALIZATION_JS_FILE = "cursor_hanhua.js";
const INJECTION_MARKER_HTML = "<!-- CURSOR_LOCALIZATION_INJECTION -->";
const LEGACY_INJECTION_MARKER_HTML = "<!-- CURSOR_HANHUA_INJECTION -->";
const BEI_FEN_HOU_ZHUI = ".bak";

const KUO_ZHAN_FAN_YI_QIAO_JIE: Record<string, Record<string, Record<string, string>>> = {
  "anysphere.cursor-always-local": { package: { displayName: "Cursor 始终本地", description: "为 Cursor 提供实验性本地功能。" } },
  "anysphere.cursor-retrieval": { package: { displayName: "Cursor 检索", description: "处理 Cursor 的索引与检索能力。" } },
  "anysphere.cursor-shadow-workspace": { package: { displayName: "Cursor 影子工作区", description: "管理一个供 AI 智能体在展示前整理代码的隐藏本地窗口。" } },
  "inspecta.inspecta-ide-integration": { package: { displayName: "Inspecta IDE 集成", description: "将 Inspecta CSS 更改与 Cursor IDE 和 VS Code AI 智能体集成。" } },
};

type JsonObject = Record<string, any>;
type Pair = [string, string];
type CursorPaths = { installDir: string; dataDir: string; valid: boolean };

let CURSOR_AN_ZHUANG_LU_JING = "";
let CURSOR_SHU_JU_LU_JING = "";
const PATH_CONFIG_FILE = path.join(SCRIPT_DIR, "cursor-cn.config.json");

function Shi_MacOS() { return process.platform === "darwin"; }
function Shi_Windows() { return process.platform === "win32"; }
function HuoQu_Workbench_MuLu_LuJing(root: string) {
  return Shi_MacOS() ? path.join(root, "Contents", "Resources", "app", "out", "vs", "code", "electron-sandbox", "workbench") : path.join(root, "resources", "app", "out", "vs", "code", "electron-sandbox", "workbench");
}
function HuoQu_App_GenMuLu_LuJing(root: string) { return Shi_MacOS() ? path.join(root, "Contents", "Resources", "app") : path.join(root, "resources", "app"); }
function ZhengLi_LuJing(root: string) {
  return path.resolve(String(root || "").trim().replace(/^["']|["']$/g, ""));
}
function AnZhuang_MuLu_YouXiao(root: string) {
  if (!root) return false;
  try {
    const resolved = ZhengLi_LuJing(root);
    if (!fs.existsSync(path.join(HuoQu_Workbench_MuLu_LuJing(resolved), "workbench.html"))) return false;
    return Shi_Windows() ? fs.existsSync(path.join(resolved, "Cursor.exe")) : Shi_MacOS() ? resolved.endsWith(".app") && fs.existsSync(path.join(resolved, "Contents", "MacOS")) : true;
  } catch { return false; }
}
function HuoQu_ShuJu_LuJing() {
  if (process.env.CURSOR_USER_DATA_DIR) return path.resolve(process.env.CURSOR_USER_DATA_DIR);
  if (Shi_MacOS()) return path.join(os.homedir(), "Library", "Application Support", "Cursor");
  return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Cursor");
}
function DuQu_LuJing_PeiZhi(): JsonObject {
  try { return fs.existsSync(PATH_CONFIG_FILE) ? readJson(PATH_CONFIG_FILE) : {}; } catch { return {}; }
}
function BaoCun_LuJing_PeiZhi(installDir: string, dataDir: string) {
  try { writeJson(PATH_CONFIG_FILE, { installDir, dataDir }); } catch { /* 配置文件不可写时仍继续执行 */ }
}
async function TiShi_ShouDong_AnZhuang_LuJing(): Promise<string> {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>(resolve => rl.question(q, (answer: string) => resolve(answer.trim())));
  console.log("[提示] 未检测到默认安装目录。请输入 Cursor 安装目录，例如：");
  console.log("       C:\\Users\\你的用户名\\AppData\\Local\\Programs\\cursor");
  console.log("       D:\\cursor");
  for (let i = 0; i < 3; i++) {
    const answer = await ask("> ");
    if (!answer) { rl.close(); return ""; }
    if (AnZhuang_MuLu_YouXiao(answer)) { rl.close(); return answer; }
    console.log(`[错误] 路径无效，未找到 Cursor.exe 或 workbench.html：${answer}`);
    console.log("[提示] 请重新输入，或直接回车取消。");
  }
  rl.close();
  return "";
}
async function JianCe_Cursor_LuJing(): Promise<CursorPaths> {
  const config = DuQu_LuJing_PeiZhi();
  const configured = typeof config.installDir === "string" ? config.installDir : "";
  const env = process.env.CURSOR_INSTALL_DIR || process.env.CURSOR_ROOT || "";
  const candidates = [configured, env];
  if (Shi_Windows()) candidates.push(path.join(process.env.LOCALAPPDATA || "", "Programs", "cursor"), path.join(process.env.PROGRAMFILES || "", "Cursor"), path.join(process.env["PROGRAMFILES(X86)"] || "", "Cursor"));
  else if (Shi_MacOS()) candidates.push("/Applications/Cursor.app", path.join(os.homedir(), "Applications", "Cursor.app"));
  for (const candidate of candidates) {
    if (candidate && AnZhuang_MuLu_YouXiao(candidate)) {
      const installDir = ZhengLi_LuJing(candidate);
      const dataDir = path.resolve(process.env.CURSOR_USER_DATA_DIR || config.dataDir || HuoQu_ShuJu_LuJing());
      if (installDir !== configured || dataDir !== config.dataDir) BaoCun_LuJing_PeiZhi(installDir, dataDir);
      return { installDir, dataDir, valid: true };
    }
  }
  const manual = await TiShi_ShouDong_AnZhuang_LuJing();
  if (manual && AnZhuang_MuLu_YouXiao(manual)) {
    const installDir = ZhengLi_LuJing(manual);
    const dataDir = path.resolve(process.env.CURSOR_USER_DATA_DIR || config.dataDir || HuoQu_ShuJu_LuJing());
    BaoCun_LuJing_PeiZhi(installDir, dataDir);
    return { installDir, dataDir, valid: true };
  }
  return { installDir: path.resolve(configured || env || ""), dataDir: HuoQu_ShuJu_LuJing(), valid: false };
}
function HuoQu_Cursor_KeZhiXing_LuJing(root = CURSOR_AN_ZHUANG_LU_JING) {
  if (Shi_MacOS()) { const p = path.join(root, "Contents", "MacOS", "Cursor"); return fs.existsSync(p) ? p : root; }
  return path.join(root, "Cursor.exe");
}
function HuoQu_Cursor_CLI_LuJing(root = CURSOR_AN_ZHUANG_LU_JING) {
  const p = Shi_MacOS() ? path.join(root, "Contents", "Resources", "app", "bin", "cursor") : path.join(root, "resources", "app", "bin", "cursor.cmd");
  return fs.existsSync(p) ? p : "";
}
function YunXing_Cursor_CLI(args: string[]) {
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_NO_WARNINGS: "1" };
  const opts = { encoding: "utf8" as const, timeout: 120000, windowsHide: true, env };
  const cliJs = path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "out", "cli.js");
  const exe = HuoQu_Cursor_KeZhiXing_LuJing();
  if (fs.existsSync(cliJs) && fs.existsSync(exe)) return spawnSync(exe, ["--no-warnings", cliJs, ...args], opts);
  const wrapper = HuoQu_Cursor_CLI_LuJing();
  return wrapper ? spawnSync(wrapper, args, opts) : null;
}
function GuanBi_Cursor() {
  console.log("[执行] 正在关闭 Cursor...");
  if (Shi_Windows()) spawnSync("taskkill", ["/IM", "Cursor.exe", "/F"], { stdio: "ignore", windowsHide: true });
  else if (Shi_MacOS()) spawnSync("osascript", ["-e", 'tell application "Cursor" to quit'], { stdio: "ignore" });
  else spawnSync("pkill", ["-x", "Cursor"], { stdio: "ignore" });
  Atomsleep(1500);
  console.log("[完成] Cursor 已关闭");
}
function Atomsleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function QiDong_Cursor() {
  const exe = HuoQu_Cursor_KeZhiXing_LuJing();
  console.log(`[执行] 正在启动 Cursor：${exe}`);
  if (!fs.existsSync(exe) && !Shi_MacOS()) {
    console.error("[错误] 未找到 Cursor 可执行文件，无法自动重启。");
    return;
  }
  const args = [`--user-data-dir=${CURSOR_SHU_JU_LU_JING}`];
  if (Shi_MacOS()) spawn("open", ["-na", CURSOR_AN_ZHUANG_LU_JING, "--args", ...args], { detached: true, stdio: "ignore" }).unref();
  else spawn(process.env.ComSpec || "cmd.exe", ["/c", "start", "", exe, ...args], { detached: true, stdio: "ignore", windowsHide: true, cwd: CURSOR_AN_ZHUANG_LU_JING }).unref();
  console.log("[完成] 已发出启动命令");
}
function readJson(file: string): JsonObject { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file: string, value: any) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8"); }
function HuoQu_CiDian_WenJian_LuJing(name: string) { return path.join(LOCALIZATION_DIR, name); }
function DuQu_Runtime_WenJian(name: string) { const file = path.join(RUNTIME_DIR, name); if (!fs.existsSync(file)) throw new Error(`未找到运行时脚本 ${file}`); return fs.readFileSync(file, "utf8"); }

function DuQu_GuangGao_TanChuang_CiDian(): Record<string, string> {
  const file = HuoQu_CiDian_WenJian_LuJing(AD_POPUP_DICTIONARY_FILE); if (!fs.existsSync(file)) return {};
  try {
    const entries = readJson(file).entries; const out: Record<string, string> = {};
    if (Array.isArray(entries)) for (const x of entries) if (Array.isArray(x) && x.length >= 2 && x[0] && x[1]) out[String(x[0])] = String(x[1]);
    return out;
  } catch (e) { console.log(`[广告弹窗] 读取 ${file} 失败: ${e}`); return {}; }
}
function ShengCheng_GuangGao_TanChuang_HeBing_JS() {
  const entries = DuQu_GuangGao_TanChuang_CiDian(); if (!Object.keys(entries).length) return "";
  return `\n    // 来自 localization/${AD_POPUP_DICTIONARY_FILE}（左下角推广/通知弹窗）\n    (function() {\n        var guanggao = ${JSON.stringify(Object.entries(entries), null, 0)};\n        for (var gi = 0; gi < guanggao.length; gi++) FanYi_CiDian.set(guanggao[gi][0], guanggao[gi][1]);\n    })();`;
}
function DuQu_Chajian_ShiChang_CiDian(): JsonObject | null { const file = HuoQu_CiDian_WenJian_LuJing(PLUGIN_MARKETPLACE_DICTIONARY_FILE); if (!fs.existsSync(file)) return null; try { return readJson(file); } catch (e) { console.log(`[插件市场] 读取 ${file} 失败: ${e}`); return null; } }
function jsString(v: any) { return JSON.stringify(String(v)); }
function ShengCheng_JS_DuiXiang(obj: JsonObject) { const lines = Object.entries(obj || {}).filter(([k, v]) => k != null && v != null).map(([k, v]) => `        ${jsString(k)}: ${jsString(v)}`); return lines.length ? `{\n${lines.join(",\n")}\n    }` : "{}"; }
function ShengCheng_JS_Pairs_Array(pairs: any[]) { const lines = (pairs || []).filter(x => Array.isArray(x) && x.length >= 2).map(x => `        [${jsString(x[0])}, ${jsString(x[1])}]`); return lines.length ? `[\n${lines.join(",\n")}\n    ]` : "[]"; }
function ShengCheng_JS_MoShi_FanYi(patterns: any[]) { const lines: string[] = []; for (const x of patterns || []) { const r = Array.isArray(x) ? x[0] : x?.regex; const flags = Array.isArray(x) ? (x[2] ?? "i") : (x?.flags ?? "i"); const replacement = Array.isArray(x) ? x[1] : x?.replace ?? ""; if (r) lines.push(`        [new RegExp(${jsString(r)}, ${jsString(flags)}), ${jsString(replacement)}]`); } return lines.length ? `[\n${lines.join(",\n")}\n    ]` : "[]"; }
function ShengCheng_Chajian_ShiChang_JS_Kuai(data = DuQu_Chajian_ShiChang_CiDian()) {
  if (!data) return null;
  return `    // 来自 localization/${PLUGIN_MARKETPLACE_DICTIONARY_FILE}（插件市场/市场页，首次进入市场页时加载）\n    function __ShiChang_CiDian_Ke() {\n        return {\n            pluginNames: ${ShengCheng_JS_DuiXiang(data.pluginNames)},\n            uiLabels: ${ShengCheng_JS_DuiXiang(data.uiLabels)},\n            uiFragments: ${ShengCheng_JS_Pairs_Array(data.uiFragments)},\n            patterns: ${ShengCheng_JS_MoShi_FanYi(data.patterns)},\n            skillNames: ${ShengCheng_JS_DuiXiang(data.skillNames)},\n            nameStems: ${ShengCheng_JS_DuiXiang(data.nameStems)},\n            descriptionFragments: ${ShengCheng_JS_Pairs_Array(data.descriptionFragments)}\n        };\n    }`;
}
function DuQu_Zhu_CiDian(): Pair[] { const data = readJson(CORE_DICTIONARY_FILE); const rows: Pair[] = []; for (const section of Array.isArray(data.sections) ? data.sections : [{ entries: data.entries }]) for (const x of section.entries || []) if (Array.isArray(x) && x.length >= 2) rows.push([String(x[0]), String(x[1])]); const map = new Map(rows.filter(x => x[0] && x[1])); return [...map].map(([a, b]) => [a, b]); }
function ZhengLi_ZhengZe_MoShi(value: string) { let out = value; while (out.includes("\\\\")) { const next = out.replaceAll("\\\\", "\\"); try { new RegExp(next); } catch { break; } if (next === out) break; out = next; } return out; }
function DuQu_MoShi_CiDian() { const data = readJson(PATTERN_DICTIONARY_FILE); return (data.patterns || []).filter((x: any) => x && typeof x === "object" && x.regex && x.replacement != null).map((x: any) => ({ regex: ZhengLi_ZhengZe_MoShi(String(x.regex)), flags: String(x.flags || ""), replacement: String(x.replacement) })); }
function ShengCheng_FanYi_CiDian_JS(items = DuQu_Zhu_CiDian()) { return `    var FanYi_CiDian = new Map(${JSON.stringify(items)});`; }
function ShengCheng_MoShi_FanYi_JS(items = DuQu_MoShi_CiDian()) { const lines = items.map((x: any) => `        [new RegExp(${jsString(x.regex)}, ${jsString(x.flags)}), ${jsString(x.replacement)}]`); return lines.length ? `    var MoShi_FanYi = [\n${lines.join(",\n")}\n    ];` : "    var MoShi_FanYi = [];"; }
function DuQu_Fragment_Entries(name: string, key = "entries"): Pair[] { const file = HuoQu_CiDian_WenJian_LuJing(name); if (!fs.existsSync(file)) return []; return (readJson(file)[key] || []).filter((x: any) => Array.isArray(x) && x.length >= 2 && x[0] && x[1]).map((x: any) => [String(x[0]), String(x[1])]); }
function ShengCheng_Fragment_Array_JS(name: string, pairs: Pair[]) { return pairs.length ? `    var ${name} = [\n${pairs.map(x => `        [${jsString(x[0])}, ${jsString(x[1])}],`).join("\n")}\n    ];` : `    var ${name} = [];`; }
function ShengCheng_Cursor_SheZhi_Fragments_JS() { const d = readJson(HuoQu_CiDian_WenJian_LuJing("settings.json")); const s = d.symlink || {}; return [`    var Cursor_SheZhi_Symlink_Zh = ${jsString(s.zh || "")};`, `    var Cursor_SheZhi_Symlink_ZhAdmin = ${jsString(s.zhAdmin || "")};`, `    var Cursor_SheZhi_Symlink_Tail = ${jsString(s.tail || "")};`, ShengCheng_Fragment_Array_JS("Cursor_SheZhi_MCP_SuiPian", DuQu_Fragment_Entries("settings.json", "mcpEntries")), ShengCheng_Fragment_Array_JS("Cursor_SheZhi_Domain_SuiPian", DuQu_Fragment_Entries("settings.json", "domainEntries"))].join("\n"); }
function ChaRu_Runtime_Keywords(text: string) { const marker = "    function HuoQu_QuanJu_WenBen()"; if (!text.includes(marker) || text.includes("var QuanJu_GuanJianCi_Biao")) return text; return text.replace(marker, DuQu_Runtime_WenJian("keywords.js").trimEnd() + "\n\n" + marker); }
function ChaRu_Runtime_Helpers(text: string) { const marker = "    function XiuZheng_DaiMaKu_ShuoMing()"; const helper = DuQu_Runtime_WenJian("helpers.js").trimEnd() + "\n\n"; return text.includes(marker) ? text.replace(marker, helper + marker) : text.trimEnd() + "\n\n" + helper; }
function ShengCheng_JS_DaiMa() {
  let bootstrap = DuQu_Runtime_WenJian("bootstrap.js").replace("__BUILD_TIMESTAMP__", new Date().toISOString().replace("T", " ").slice(0, 19));
  let engine = DuQu_Runtime_WenJian("engine.js");
  engine = engine.replace("    // __PARTIAL_FRAGMENTS_BLOCK__", ShengCheng_Fragment_Array_JS("DingXiang_SuiPian", DuQu_Fragment_Entries("fragments.json")));
  engine = engine.replace("    // __DROPDOWN_FRAGMENTS_BLOCK__", ShengCheng_Fragment_Array_JS("XiaLa_MianBan_SuiPian", DuQu_Fragment_Entries("dropdown.json")));
  engine = engine.replace("    // __CURSOR_SETTINGS_FRAGMENTS_BLOCK__", ShengCheng_Cursor_SheZhi_Fragments_JS());
  engine = ChaRu_Runtime_Keywords(engine); engine = ChaRu_Runtime_Helpers(engine);
  let market = DuQu_Runtime_WenJian("market.js"); const block = ShengCheng_Chajian_ShiChang_JS_Kuai(); if (block) market = market.replace("    // __PLUGIN_MARKETPLACE_BLOCK__", block);
  return [bootstrap.trimEnd(), ShengCheng_FanYi_CiDian_JS().trimEnd(), ShengCheng_GuangGao_TanChuang_HeBing_JS().trimEnd(), ShengCheng_MoShi_FanYi_JS().trimEnd(), engine.trimEnd(), market.trimEnd(), DuQu_Runtime_WenJian("init.js").trimEnd()].filter(Boolean).join("\n\n") + "\n";
}

function HuoQu_GongZuoTai_LuJing() { return HuoQu_Workbench_MuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING); }
function HuoQu_HTML_LuJing() { return path.join(HuoQu_GongZuoTai_LuJing(), "workbench.html"); }
function HuoQu_JS_LuJing() { return path.join(HuoQu_GongZuoTai_LuJing(), LOCALIZATION_JS_FILE); }
function HuoQu_BeiFen_LuJing() { return HuoQu_HTML_LuJing() + BEI_FEN_HOU_ZHUI; }
function HuoQu_Main_JS_LuJing() { return path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "out", "main.js"); }
function DuQu_TuoPan_TiHuan(): Pair[] { const file = TRAY_DICTIONARY_FILE; if (!fs.existsSync(file)) return []; return (readJson(file).replacements || []).filter((x: any) => Array.isArray(x) && x.length >= 2 && x[0] && x[1]).map((x: any) => [String(x[0]), String(x[1])]); }
function DuQu_WenBen_BaoLiu_HuanHang(file: string): [string, string] { const buf = fs.readFileSync(file); return [buf.toString("utf8"), buf.includes(Buffer.from("\r\n")) ? "\r\n" : "\n"]; }
function XieRu_WenBen_BaoLiu_HuanHang(file: string, text: string, newline?: string) { const nl = newline || (fs.existsSync(file) ? DuQu_WenBen_BaoLiu_HuanHang(file)[1] : (Shi_Windows() ? "\r\n" : "\n")); let out = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n"); if (nl === "\r\n") out = out.replaceAll("\n", "\r\n"); fs.writeFileSync(file, out, "utf8"); }
function YingYong_TuoPan_TiHuan(text: string, reverse = false): [string, number] { let count = 0; for (const [en, zh] of DuQu_TuoPan_TiHuan()) { const a = reverse ? zh : en, b = reverse ? en : zh; if (text.includes(a)) { text = text.replaceAll(a, b); count++; } } return [text, count]; }
function ZhuRu_TuoPan_HanHua() { const file = HuoQu_Main_JS_LuJing(); if (!fs.existsSync(file)) return false; try { const [text, nl] = DuQu_WenBen_BaoLiu_HuanHang(file); const [out, n] = YingYong_TuoPan_TiHuan(text); if (!n) return text.includes("最近智能体") || text.includes("清除所有通知"); XieRu_WenBen_BaoLiu_HuanHang(file, out, nl); console.log(`[托盘] 已替换 ${n} 处系统托盘菜单文案`); return true; } catch (e) { console.log(`[托盘] 无法处理 main.js: ${e}`); return false; } }
function HuiFu_TuoPan_HanHua() { const file = HuoQu_Main_JS_LuJing(); if (!fs.existsSync(file)) return false; try { const [text, nl] = DuQu_WenBen_BaoLiu_HuanHang(file); const [out, n] = YingYong_TuoPan_TiHuan(text, true); if (!n) return false; XieRu_WenBen_BaoLiu_HuanHang(file, out, nl); return true; } catch { return false; } }
function JianCha_YiZhuRu() {
  if (!fs.existsSync(HuoQu_HTML_LuJing())) return false;
  const text = fs.readFileSync(HuoQu_HTML_LuJing(), "utf8");
  return text.includes(INJECTION_MARKER_HTML) || text.includes(LEGACY_INJECTION_MARKER_HTML);
}
function ShanChu_YiLiu_ZhuRu_JS() {
  const file = path.join(HuoQu_GongZuoTai_LuJing(), LEGACY_LOCALIZATION_JS_FILE);
  if (fs.existsSync(file)) fs.rmSync(file);
}
function ShanChu_SuoYou_ZhuRu_JS() {
  for (const name of [LOCALIZATION_JS_FILE, LEGACY_LOCALIZATION_JS_FILE]) {
    const file = path.join(HuoQu_GongZuoTai_LuJing(), name);
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}
function JiSuan_WenJian_JiaoYan_HaXi(file: string) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("base64").replace(/=+$/, ""); }
function HuoQu_JiaoYan_WenJian_LuJing(app: string, key: string) { const rel = key.replaceAll("\\", "/").replace(/^\/+/, ""); const candidates = [path.join(app, "out", ...rel.split("/")), path.join(app, ...rel.split("/"))]; return candidates.find(fs.existsSync) || candidates[0]; }
function GengXin_JiaoYan_Zhi() {
  const app = HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), productFile = path.join(app, "product.json"), html = HuoQu_HTML_LuJing(); if (!fs.existsSync(productFile) || !fs.existsSync(html)) return false;
  const backup = productFile + ".bak"; if (!fs.existsSync(backup)) try { fs.copyFileSync(productFile, backup); } catch {}
  let original: string, product: JsonObject; try { original = fs.readFileSync(productFile, "utf8"); product = JSON.parse(original); } catch { return false; }
  const checksums = product.checksums; if (!checksums || typeof checksums !== "object") return false; const updates: Record<string, string> = {};
  for (const key of Object.keys(checksums)) { const file = HuoQu_JiaoYan_WenJian_LuJing(app, key); if (fs.existsSync(file)) updates[key] = JiSuan_WenJian_JiaoYan_HaXi(file); }
  if (!Object.keys(updates).length) return false; for (const [k, v] of Object.entries(updates)) product.checksums[k] = v;
  let out = original; for (const [k, v] of Object.entries(updates)) { const re = new RegExp(`("${k.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"\\s*:\\s*")([^"]*)(")`); if (re.test(out)) out = out.replace(re, (_match, start, _old, end) => start + v + end); else { out = JSON.stringify(product, null, 2) + "\n"; break; } }
  try { fs.writeFileSync(productFile, out, "utf8"); } catch { return false; }
  return Object.entries(updates).every(([k, v]) => product.checksums[k] === v && JiSuan_WenJian_JiaoYan_HaXi(HuoQu_JiaoYan_WenJian_LuJing(app, k)) === v);
}
function ShengJi_HTML_ZhuRu_If_Needed() {
  const file = HuoQu_HTML_LuJing();
  const [text, nl] = DuQu_WenBen_BaoLiu_HuanHang(file);
  const out = text.replaceAll(LEGACY_INJECTION_MARKER_HTML, INJECTION_MARKER_HTML).replaceAll(`./${LEGACY_LOCALIZATION_JS_FILE}`, `./${LOCALIZATION_JS_FILE}`);
  if (out !== text) XieRu_WenBen_BaoLiu_HuanHang(file, out, nl);
}
function ChuangJian_BeiFen() { const file = HuoQu_HTML_LuJing(), backup = HuoQu_BeiFen_LuJing(); if (!fs.existsSync(backup)) fs.copyFileSync(file, backup); }
function JiaoYan_JS_YuFa(file: string) { const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" }); if (r.error && "code" in r.error && r.error.code === "ENOENT") return; if (r.status !== 0) throw new Error(`生成的 JS 语法无效: ${(r.stderr || r.stdout || "未知语法错误").trim()}`); }
function XieRu_FanYi_JS() { const file = HuoQu_JS_LuJing(); const content = ShengCheng_JS_DaiMa(); fs.writeFileSync(file, content, "utf8"); JiaoYan_JS_YuFa(file); }
function ZhuRu_HTML() { const file = HuoQu_HTML_LuJing(); const [text, nl] = DuQu_WenBen_BaoLiu_HuanHang(file); const injection = `\n\t${INJECTION_MARKER_HTML}\n\t<script src="./${LOCALIZATION_JS_FILE}"></script>\n`; const out = text.includes("</body>") ? text.replace("</body>", `</body>${injection}`) : text.replace("</html>", `${injection}\n</html>`); XieRu_WenBen_BaoLiu_HuanHang(file, out, nl); }
function HuiFu_JiaoYan_Zhi() { const p = path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "product.json"), b = p + ".bak"; if (fs.existsSync(b)) { fs.copyFileSync(b, p); fs.rmSync(b); } }
function HuiFu_YuanShi() { const html = HuoQu_HTML_LuJing(), backup = HuoQu_BeiFen_LuJing(); if (fs.existsSync(backup)) { fs.copyFileSync(backup, html); fs.rmSync(backup); } else { const [text, nl] = DuQu_WenBen_BaoLiu_HuanHang(html); const lines = text.split(/(?<=\n)/); let skip = false; const kept: string[] = []; for (const line of lines) { if (line.includes(INJECTION_MARKER_HTML) || line.includes(LEGACY_INJECTION_MARKER_HTML)) { skip = true; continue; } if (skip && (line.includes(`./${LOCALIZATION_JS_FILE}`) || line.includes(`./${LEGACY_LOCALIZATION_JS_FILE}`))) { skip = false; continue; } if (!skip) kept.push(line); } XieRu_WenBen_BaoLiu_HuanHang(html, kept.join(""), nl); } HuiFu_TuoPan_HanHua(); HuiFu_JiaoYan_Zhi(); ShanChu_SuoYou_ZhuRu_JS(); YiChu_KuoZhan_FanYi_QiaoJie(); console.log("[完成] 已恢复原始状态"); }

// 最小 ZIP 读取器：Node 内置模块没有 ZIP API，因此直接解析 VSIX 的 central directory。
function ZipEntries(data: any) { const eocd = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); if (eocd < 0) throw new Error("不是有效的 ZIP 文件"); const count = data.readUInt16LE(eocd + 10), central = data.readUInt32LE(eocd + 16); const entries: any[] = []; let p = central; for (let i = 0; i < count; i++) { if (data.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP central directory 损坏"); const method = data.readUInt16LE(p + 10), compressed = data.readUInt32LE(p + 20), uncompressed = data.readUInt32LE(p + 24), nameLen = data.readUInt16LE(p + 28), extraLen = data.readUInt16LE(p + 30), commentLen = data.readUInt16LE(p + 32), offset = data.readUInt32LE(p + 42); const name = data.subarray(p + 46, p + 46 + nameLen).toString(); entries.push({ name, method, compressed, uncompressed, offset }); p += 46 + nameLen + extraLen + commentLen; } return entries; }
function ZipRead(data: any, name: string) { const entry = ZipEntries(data).find((x: any) => x.name === name); if (!entry) throw new Error(`VSIX 缺少 ${name}`); const p = entry.offset; if (data.readUInt32LE(p) !== 0x04034b50) throw new Error("ZIP local header 损坏"); const nameLen = data.readUInt16LE(p + 26), extraLen = data.readUInt16LE(p + 28), body = data.subarray(p + 30 + nameLen + extraLen, p + 30 + nameLen + extraLen + entry.compressed); const output = entry.method === 0 ? body : entry.method === 8 ? zlib.inflateRawSync(body) : (() => { throw new Error("VSIX 使用了不支持的压缩方式"); })(); if (output.length !== entry.uncompressed) throw new Error("VSIX 条目长度校验失败"); return output; }
function YanZheng_VSIX(file: string) { try { ZipRead(fs.readFileSync(file), "extension/package.json"); return true; } catch { return false; } }
function DuQu_VSIX_BanBen(file: string) { try { return JSON.parse(ZipRead(fs.readFileSync(file), "extension/package.json").toString("utf8")).version; } catch { return null; } }
function JieXi_ZhuCiYao_BanBen(v: any) { const m = String(v || "").trim().match(/^(\d+)\.(\d+)/); return m ? `${m[1]}.${m[2]}` : null; }
function YuYan_Bao_BanBen_PiPei(lang: any, cursor: any) { const prefix = JieXi_ZhuCiYao_BanBen(cursor); return !!prefix && String(lang || "").startsWith(prefix + "."); }
async function ChaXun_ShiChang_BanBenLieBiao() { const response = await fetch(LANGUAGE_PACK_MARKETPLACE_QUERY, { method: "POST", headers: { Accept: "application/json;api-version=7.2-preview.1", "Content-Type": "application/json", "User-Agent": "Cursor-Localization-Tool" }, body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: `${LANGUAGE_PACK_PUBLISHER}.${LANGUAGE_PACK_EXTENSION}` }] }], flags: 1 }) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data: any = await response.json(); return data.results?.[0]?.extensions?.[0]?.versions?.map((x: any) => x.version).filter(Boolean) || []; }
function XuanZe_PiPei_ShiChang_BanBen(cursor: any, versions: any[]) { const p = JieXi_ZhuCiYao_BanBen(cursor); return p ? versions.find(x => String(x).startsWith(p + ".")) || null : null; }
async function XiaZai_ShiChang_VSIX(version: string, target: string) { const r = await fetch(LANGUAGE_PACK_MARKETPLACE_DOWNLOAD.replace("{version}", encodeURIComponent(version)), { headers: { "User-Agent": "Cursor-Localization-Tool", Accept: "application/octet-stream" } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); let data = Buffer.from(await r.arrayBuffer()); if (data[0] === 0x1f && data[1] === 0x8b) data = zlib.gunzipSync(data); ZipRead(data, "extension/package.json"); fs.writeFileSync(target, data); }
function HuoQu_Cursor_VSCode_BanBen() { try { return readJson(path.join(HuoQu_App_GenMuLu_LuJing(CURSOR_AN_ZHUANG_LU_JING), "product.json")).vscodeVersion; } catch (e) { console.log(`[语言包] 读取 vscodeVersion 失败: ${e}`); return null; } }
async function QueBao_PiPei_YuYan_Bao_VSIX(): Promise<{ file: string; temporary: boolean } | null> {
  const cursor = HuoQu_Cursor_VSCode_BanBen();
  const local = process.env.CURSOR_LANGUAGE_PACK_VSIX;
  if (local && fs.existsSync(local) && YanZheng_VSIX(local) && (!cursor || YuYan_Bao_BanBen_PiPei(DuQu_VSIX_BanBen(local), cursor))) return { file: local, temporary: false };
  if (!cursor) return null; try { const version = XuanZe_PiPei_ShiChang_BanBen(cursor, await ChaXun_ShiChang_BanBenLieBiao()); if (!version) return null; const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-cn-")), file = path.join(dir, "VSCode-language-pack-zh-hans.vsix"); await XiaZai_ShiChang_VSIX(version, file); return { file, temporary: true }; } catch (e) { console.log(`[语言包] 自动下载失败: ${e}`); return null; }
}
function SheZhi_XianShi_YuYan() { const file = path.join(CURSOR_SHU_JU_LU_JING, "User", "locale.json"); fs.mkdirSync(path.dirname(file), { recursive: true }); if (fs.existsSync(file)) try { if (readJson(file).locale === XUAN_SHI_YU_YAN) return; } catch {} writeJson(file, { locale: XUAN_SHI_YU_YAN }); }
function Shi_YuYanBao_ZaYin(line: string) {
  return /DeprecationWarning|DEP0\d+|url\.parse|WHATWG URL|shell option true|trace-deprecation|security implications|CVEs are not issued|^\(Use `/.test(line);
}
async function AnZhuang_GuanFang_YuYan_Bao() {
  const packageInfo = await QueBao_PiPei_YuYan_Bao_VSIX();
  if (!packageInfo) { console.log("[语言包] 未找到可用 VSIX，跳过官方语言包安装。"); return false; }
  try {
    console.log("[语言包] 正在安装官方简体中文语言包...");
    const r = YunXing_Cursor_CLI(["--install-extension", packageInfo.file, "--force", `--user-data-dir=${CURSOR_SHU_JU_LU_JING}`]);
    if (!r) { console.log("[语言包] 未找到 Cursor CLI，跳过官方语言包安装。"); return false; }
    const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
    if (output) for (const line of output.split(/\r?\n/)) if (line.trim() && !Shi_YuYanBao_ZaYin(line)) console.log(`[语言包] ${line.trim()}`);
    if (r.status !== 0) { console.log("[语言包] 安装未完成，界面汉化不受影响。"); return false; }
    SheZhi_XianShi_YuYan();
    return true;
  } finally {
    if (packageInfo.temporary) { try { fs.rmSync(path.dirname(packageInfo.file), { recursive: true, force: true }); } catch {} }
  }
}
function DuQu_YuYan_Bao_PeiZhi(): [JsonObject | null, string] { const file = path.join(CURSOR_SHU_JU_LU_JING, "languagepacks.json"); if (!fs.existsSync(file)) return [null, file]; try { return [readJson(file), file]; } catch { return [null, file]; } }
function XieRu_KuoZhan_FanYi_QiaoJie() { const [info, file] = DuQu_YuYan_Bao_PeiZhi(); const config = info?.["zh-cn"] || info?.["zh-CN"]; if (!info || !config) return; const vscode = config.translations?.vscode; if (!vscode) return; const dir = path.dirname(vscode); fs.mkdirSync(dir, { recursive: true }); let changed = false; config.translations ||= {}; for (const [id, contents] of Object.entries(KUO_ZHAN_FAN_YI_QIAO_JIE)) { const translation = path.join(dir, id.replaceAll(/[\\/]/g, ".") + ".i18n.json"); const value = { "": ["Generated by cursor-cn.ts for Cursor private extensions."], version: "1.0.0", contents }; if (!fs.existsSync(translation) || JSON.stringify(readJson(translation)) !== JSON.stringify(value)) { writeJson(translation, value); changed = true; } if (config.translations[id] !== translation) { config.translations[id] = translation; changed = true; } } if (changed) writeJson(file, info); }
function YiChu_KuoZhan_FanYi_QiaoJie() { const [info, file] = DuQu_YuYan_Bao_PeiZhi(); const config = info?.["zh-cn"] || info?.["zh-CN"]; if (!info || !config) return; let changed = false; for (const id of Object.keys(KUO_ZHAN_FAN_YI_QIAO_JIE)) { const translation = config.translations?.[id]; if (translation && fs.existsSync(translation)) fs.rmSync(translation); if (config.translations?.[id]) { delete config.translations[id]; changed = true; } } if (changed) writeJson(file, info); }

async function ZhuChengXu() {
  const arg = process.argv[2];
  if (arg === "--help" || arg === "-h") {
    console.log("用法: node cursor-cn.ts [--restore | --fix-checksum | --print-paths | --no-restart]");
    return;
  }

  const paths = await JianCe_Cursor_LuJing();
  CURSOR_AN_ZHUANG_LU_JING = paths.installDir;
  CURSOR_SHU_JU_LU_JING = paths.dataDir;
  console.log(`[信息] 安装目录: ${CURSOR_AN_ZHUANG_LU_JING}`);
  console.log(`[信息] 用户数据: ${CURSOR_SHU_JU_LU_JING}`);
  if (arg === "--print-paths") {
    console.log(HuoQu_HTML_LuJing());
    console.log(CURSOR_AN_ZHUANG_LU_JING);
    console.log(HuoQu_Cursor_KeZhiXing_LuJing());
    if (!paths.valid) process.exitCode = 1;
    return;
  }
  if (!paths.valid) {
    console.error(`[错误] 未找到有效的 Cursor 安装目录：${paths.installDir}`);
    console.error("[提示] 请设置 CURSOR_INSTALL_DIR，或重新运行并输入安装路径。");
    process.exitCode = 1;
    return;
  }

  if (arg === "--fix-checksum") {
    if (!GengXin_JiaoYan_Zhi()) process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(HuoQu_HTML_LuJing())) {
    console.error(`[错误] 未找到 workbench.html：${HuoQu_HTML_LuJing()}`);
    process.exitCode = 1;
    return;
  }

  // 修改或恢复前统一关闭 Cursor，避免文件被占用。
  GuanBi_Cursor();
  try {
    if (arg === "--restore") {
      HuiFu_YuanShi();
      console.log("[完成] 恢复结束");
      return;
    }
    console.log("[执行] 开始安装/更新汉化...");
    XieRu_KuoZhan_FanYi_QiaoJie();
    if (JianCha_YiZhuRu()) ShengJi_HTML_ZhuRu_If_Needed();
    else ChuangJian_BeiFen();
    XieRu_FanYi_JS();
    ShanChu_YiLiu_ZhuRu_JS();
    if (!JianCha_YiZhuRu()) ZhuRu_HTML();
    ZhuRu_TuoPan_HanHua();
    GengXin_JiaoYan_Zhi();
    console.log("[完成] 汉化已写入，准备重启 Cursor");
    if (!process.argv.includes("--no-restart")) QiDong_Cursor();
    await AnZhuang_GuanFang_YuYan_Bao();
  } catch (e) {
    console.error(`[错误] ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
}

ZhuChengXu().catch(e => {
  console.error(`[错误] ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
});
