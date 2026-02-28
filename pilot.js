// ====================== 可根据需要修改的参数 ======================

// 集合大小与呈现时间（毫秒）
const SET_SIZES = [2, 6, 12, 18, 24, 30];
const DISPLAY_DURATIONS = [500, 800, 1200];

// 练习：每种条件重复次数
const PRACTICE_REPS_PER_COND = 2;    // 一半含目标，一半无目标
// 正式实验：每种条件重复次数
const MAIN_REPS_PER_COND = 10;       // 一半含目标，一半无目标
const BLOCK_TRIALS = 60;             // 每个 block 60 个试次
const FIXATION_MIN = 600;            // ms
const FIXATION_MAX = 800;            // ms
const DECISION_DEADLINE = 3000;      // ms
const END_SCREEN_DURATION = 3000;    // ms

// 目标与按键
const TARGET_COLOR = "red";
const TARGET_ORIENTATION = "vertical"; // 竖向
const KEY_TARGET_PRESENT = "f";  // F 键
const KEY_TARGET_ABSENT = "j";   // J 键

// 刺激矩形大小（像素）
const RECT_LONG = 80;   // 长边
const RECT_SHORT = 40;  // 短边
const GRID_ROWS = 5;
const GRID_COLS = 6;

// ====================== 指导语与文本（请自行替换） ======================

const practiceInstructionPages = [
  "【练习阶段指导语 - 第1页】\n\n在这里填写练习阶段的详细指导语。\n\n按空格键切换到下一页。",
  "【练习阶段指导语 - 第2页】\n\n例如：\n目标刺激是“竖向的红色长方形”，中间带有白色缺口边框。\n在刺激呈现后，请判断是否出现过目标刺激。\n出现过按 F 键，没有出现过按 J 键。\n\n按空格键开始练习。"
];

const mainReadyText =
  "【正式实验准备界面】\n\n在这里填写正式实验开始前的提示语。\n例如：接下来是正式实验，请尽量又快又准地作答。\n\n按空格键开始正式实验。";

const blockRestText =
  "【休息界面】\n\n本 block 已结束，请稍作休息。\n准备好后请按空格键开始下一 block。";

const endText =
  "【结束语】\n\n所有试次已完成，感谢您的参与！\n实验即将结束，请稍候……";

// ====================== 全局状态 ======================

const container = document.getElementById("exp-container");

let currentKeyHandler = null;

let practiceTrials = [];
let mainTrials = [];
let currentPhase = "practice_instructions"; // practice_instructions, practice, main_ready, main, rest, end
let instructionPageIndex = 0;
let practiceIndex = 0;
let mainIndex = 0;
let mainResults = [];  // 仅正式实验数据
let decisionTimer = null;
let decisionStartTime = null;

// ====================== 工具函数 ======================

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成 trials（给定每条件重复次数和 phase 名）
function generateTrials(repsPerCond, phase) {
  const trials = [];
  for (const setSize of SET_SIZES) {
    for (const dur of DISPLAY_DURATIONS) {
      const half = repsPerCond / 2;
      for (let i = 0; i < half; i++) {
        trials.push({
          phase,
          setSize,
          duration: dur,
          targetPresent: true
        });
      }
      for (let i = 0; i < half; i++) {
        trials.push({
          phase,
          setSize,
          duration: dur,
          targetPresent: false
        });
      }
    }
  }
  shuffle(trials);
  return trials;
}

// 为正式实验 trials 标记 block
function assignBlocksToMainTrials(trials) {
  for (let i = 0; i < trials.length; i++) {
    trials[i].block = Math.floor(i / BLOCK_TRIALS) + 1; // 1,2,3,...
    trials[i].index = i + 1; // 从1开始计数
  }
}

// 切换全局按键处理器
document.addEventListener("keydown", (e) => {
  if (typeof currentKeyHandler === "function") {
    currentKeyHandler(e);
  }
});

// 清理界面和按键
function clearScreen() {
  container.innerHTML = "";
  currentKeyHandler = null;
  if (decisionTimer) {
    clearTimeout(decisionTimer);
    decisionTimer = null;
  }
}

// ====================== 刺激生成 ======================

// 根据 setSize 和 targetPresent 生成该 trial 的刺激列表
// 每个刺激对象：{color: 'red'|'green', orientation: 'vertical'|'horizontal'}
function generateStimuliForTrial(setSize, targetPresent) {
  const stimuli = [];

  // 目标 + 干扰
  // 颜色总数尽量红绿相当；绿的横/竖尽量相等；红色竖向只有目标，其余红全为横向
  let numRed = Math.round(setSize / 2);
  let numGreen = setSize - numRed;

  if (!targetPresent) {
    // 无目标时所有红色均为横向
    for (let i = 0; i < numRed; i++) {
      stimuli.push({ color: "red", orientation: "horizontal", isTarget: false });
    }
    // 绿色中横/竖尽量均等
    let greenVert = Math.floor(numGreen / 2);
    let greenHoriz = numGreen - greenVert;
    for (let i = 0; i < greenVert; i++) {
      stimuli.push({ color: "green", orientation: "vertical", isTarget: false });
    }
    for (let i = 0; i < greenHoriz; i++) {
      stimuli.push({ color: "green", orientation: "horizontal", isTarget: false });
    }
  } else {
    // 有目标：先放一个竖向红色目标
    stimuli.push({ color: "red", orientation: "vertical", isTarget: true });
    numRed -= 1; // 剩余红色为干扰，全为横向

    if (numRed < 0) {
      // 边界情况：setSize=1 不会发生，这里只是安全保护
      numRed = 0;
    }

    // 红色干扰（横向）
    for (let i = 0; i < numRed; i++) {
      stimuli.push({ color: "red", orientation: "horizontal", isTarget: false });
    }

    // 剩余为绿色
    const used = 1 + numRed;
    const remain = setSize - used;
    let greenVert = Math.floor(remain / 2);
    let greenHoriz = remain - greenVert;
    for (let i = 0; i < greenVert; i++) {
      stimuli.push({ color: "green", orientation: "vertical", isTarget: false });
    }
    for (let i = 0; i < greenHoriz; i++) {
      stimuli.push({ color: "green", orientation: "horizontal", isTarget: false });
    }
  }

  // 打乱刺激顺序（位置随机）
  shuffle(stimuli);
  return stimuli;
}

// 根据 GRID_ROWS x GRID_COLS 生成随机不重叠位置
function generatePositionsForStimuli(n) {
  const positions = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  const marginX = w * 0.1;
  const marginY = h * 0.1;
  const usableW = w * 0.8;
  const usableH = h * 0.8;

  const cellW = usableW / GRID_COLS;
  const cellH = usableH / GRID_ROWS;

  const cells = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({ r, c });
    }
  }
  shuffle(cells);

  const selected = cells.slice(0, n);
  for (const cell of selected) {
    const cx = marginX + (cell.c + 0.5) * cellW;
    const cy = marginY + (cell.r + 0.5) * cellH;
    positions.push({ x: cx, y: cy });
  }
  return positions;
}

// ====================== 各阶段界面与流程 ======================

function showPracticeInstructions() {
  clearScreen();
  currentPhase = "practice_instructions";

  const pageText = practiceInstructionPages[instructionPageIndex];
  const div = document.createElement("div");
  div.className = "instruction-text";
  div.textContent = pageText;
  container.appendChild(div);

  const prompt = document.createElement("div");
  prompt.className = "prompt-text";
  prompt.textContent = "按空格键继续";
  container.appendChild(prompt);

  currentKeyHandler = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      instructionPageIndex++;
      if (instructionPageIndex < practiceInstructionPages.length) {
        showPracticeInstructions();
      } else {
        startPractice();
      }
    }
  };
}

function startPractice() {
  clearScreen();
  currentPhase = "practice";
  practiceIndex = 0;
  if (practiceTrials.length === 0) {
    practiceTrials = generateTrials(PRACTICE_REPS_PER_COND, "practice");
  }
  runNextPracticeTrial();
}

function runNextPracticeTrial() {
  if (practiceIndex >= practiceTrials.length) {
    // 练习结束 -> 正式实验准备界面
    showMainReadyScreen();
    return;
  }
  const trial = practiceTrials[practiceIndex];
  runTrial(trial, () => {
    practiceIndex++;
    runNextPracticeTrial();
  });
}

function showMainReadyScreen() {
  clearScreen();
  currentPhase = "main_ready";

  const div = document.createElement("div");
  div.className = "ready-text";
  div.textContent = mainReadyText;
  container.appendChild(div);

  const prompt = document.createElement("div");
  prompt.className = "prompt-text";
  prompt.textContent = "按空格键开始正式实验";
  container.appendChild(prompt);

  currentKeyHandler = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      startMainExperiment();
    }
  };
}

function startMainExperiment() {
  clearScreen();
  currentPhase = "main";
  mainIndex = 0;
  mainResults = [];

  if (mainTrials.length === 0) {
    mainTrials = generateTrials(MAIN_REPS_PER_COND, "main");
    assignBlocksToMainTrials(mainTrials);
  }
  runNextMainTrial();
}

function runNextMainTrial() {
  if (mainIndex >= mainTrials.length) {
    showEndScreen();
    return;
  }

  const trial = mainTrials[mainIndex];
  const isBlockStart = (mainIndex % BLOCK_TRIALS === 0) && mainIndex !== 0;
  if (isBlockStart) {
    showRestScreen(trial.block);
  } else {
    runTrial(trial, () => {
      mainIndex++;
      runNextMainTrial();
    });
  }
}

function showRestScreen(blockNumber) {
  clearScreen();
  currentPhase = "rest";

  const div = document.createElement("div");
  div.className = "rest-text";
  div.textContent = blockRestText + "\n\n当前即将开始第 " + blockNumber + " 个 block。";
  container.appendChild(div);

  const prompt = document.createElement("div");
  prompt.className = "prompt-text";
  prompt.textContent = "按空格键继续";
  container.appendChild(prompt);

  currentKeyHandler = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      runTrial(mainTrials[mainIndex], () => {
        mainIndex++;
        runNextMainTrial();
      });
    }
  };
}

function showEndScreen() {
  clearScreen();
  currentPhase = "end";

  const div = document.createElement("div");
  div.className = "end-text";
  div.textContent = endText;
  container.appendChild(div);

  // 结束时生成并下载 CSV
  generateAndDownloadCSV();

  setTimeout(() => {
    // 实验结束后可选择关闭窗口或保持静止
    // window.close(); // 浏览器通常会拦截
  }, END_SCREEN_DURATION);
}

// ====================== 单个试次流程 ======================

function runTrial(trial, onFinish) {
  // 1. 注视点
  showFixation(() => {
    // 2. 刺激呈现
    showStimuli(trial, () => {
      // 3. 判断界面
      showDecisionScreen(trial, onFinish);
    });
  });
}

function showFixation(callback) {
  clearScreen();
  const div = document.createElement("div");
  div.className = "fixation";
  div.textContent = "+";
  container.appendChild(div);

  const dur = randInt(FIXATION_MIN, FIXATION_MAX);
  setTimeout(() => {
    callback();
  }, dur);
}

function showStimuli(trial, callback) {
  clearScreen();

  const stimuli = generateStimuliForTrial(trial.setSize, trial.targetPresent);
  const positions = generatePositionsForStimuli(trial.setSize);

  for (let i = 0; i < trial.setSize; i++) {
    const stim = stimuli[i];
    const pos = positions[i];

    const div = document.createElement("div");
    div.className = "stimulus-rect";
    div.style.backgroundColor = stim.color;
    div.style.left = pos.x + "px";
    div.style.top = pos.y + "px";
    div.style.transform = "translate(-50%, -50%)";

    if (stim.orientation === "vertical") {
      div.style.width = RECT_SHORT + "px";
      div.style.height = RECT_LONG + "px";
    } else {
      div.style.width = RECT_LONG + "px";
      div.style.height = RECT_SHORT + "px";
    }

    container.appendChild(div);
  }

  // 到时自动进入判断界面
  setTimeout(() => {
    callback();
  }, trial.duration);
}

function showDecisionScreen(trial, onFinish) {
  clearScreen();

  const div = document.createElement("div");
  div.className = "instruction-text";
  div.textContent =
    "请判断刚才是否出现过目标刺激（竖向红色长方形）。\n\n" +
    "出现过：按 F 键\n" +
    "未出现：按 J 键\n\n" +
    "请在 3000 毫秒内作答。";
  container.appendChild(div);

  decisionStartTime = performance.now();
  let responded = false;

  const handleDecision = (e) => {
    const key = e.key.toLowerCase();
    if (key !== KEY_TARGET_PRESENT && key !== KEY_TARGET_ABSENT) {
      return;
    }
    e.preventDefault();
    if (responded) return;
    responded = true;

    const rt = performance.now() - decisionStartTime;
    const targetPresent = trial.targetPresent;
    const correctKey = targetPresent ? KEY_TARGET_PRESENT : KEY_TARGET_ABSENT;
    const correct = key === correctKey;

    if (trial.phase === "main") {
      mainResults.push({
        trial_index: trial.index,
        block: trial.block,
        set_size: trial.setSize,
        display_duration: trial.duration,
        target_present: targetPresent ? 1 : 0,
        response_key: key,
        correct: correct ? 1 : 0,
        rt_ms: Math.round(rt)
      });
    }

    // 清理并进入下一个 trial
    currentKeyHandler = null;
    if (decisionTimer) {
      clearTimeout(decisionTimer);
      decisionTimer = null;
    }
    onFinish();
  };

  currentKeyHandler = handleDecision;

  // 超时处理（记为无反应）
  decisionTimer = setTimeout(() => {
    if (responded) return;
    responded = true;

    if (trial.phase === "main") {
      mainResults.push({
        trial_index: trial.index,
        block: trial.block,
        set_size: trial.setSize,
        display_duration: trial.duration,
        target_present: trial.targetPresent ? 1 : 0,
        response_key: "",
        correct: 0,
        rt_ms: DECISION_DEADLINE
      });
    }

    currentKeyHandler = null;
    onFinish();
  }, DECISION_DEADLINE);
}

// ====================== CSV 导出 ======================

function generateAndDownloadCSV() {
  if (mainResults.length === 0) return;

  const header = [
    "trial_index",
    "block",
    "set_size",
    "display_duration",
    "target_present",
    "response_key",
    "correct",
    "rt_ms"
  ];

  const rows = [header.join(",")];

  mainResults.forEach(r => {
    const row = [
      r.trial_index,
      r.block,
      r.set_size,
      r.display_duration,
      r.target_present,
      r.response_key,
      r.correct,
      r.rt_ms
    ].join(",");
    rows.push(row);
  });

  const csvContent = rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "visual_search_data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ====================== 启动实验 ======================

window.onload = () => {
  practiceTrials = generateTrials(PRACTICE_REPS_PER_COND, "practice");
  mainTrials = generateTrials(MAIN_REPS_PER_COND, "main");
  assignBlocksToMainTrials(mainTrials);
  showPracticeInstructions();
};

