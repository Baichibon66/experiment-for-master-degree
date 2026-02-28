// ====================== 可根据需要修改的参数 ======================

// 集合大小与呈现时间（毫秒）
const SET_SIZES = [2, 6, 12, 18, 24, 30];
// 原为 [500, 800, 1200]，按要求改为更难的 [200, 400, 600]
const DISPLAY_DURATIONS = [200, 400, 600];

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

// ====================== 指导语与文本（可按需要修改） ======================

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

// ====================== 工具函数（随机与 trial 生成） ======================

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

// 为正式实验 trials 标记 block 和在整个正式实验中的顺序 index
function assignBlocksToMainTrials(trials) {
  for (let i = 0; i < trials.length; i++) {
    trials[i].block = Math.floor(i / BLOCK_TRIALS) + 1; // 1,2,3,...
    trials[i].index = i + 1; // 从1开始计数
  }
}

// ====================== 刺激生成（与原逻辑保持一致） ======================

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
      stimuli.push({ color: TARGET_COLOR, orientation: "horizontal", isTarget: false });
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
    stimuli.push({ color: TARGET_COLOR, orientation: TARGET_ORIENTATION, isTarget: true });
    numRed -= 1; // 剩余红色为干扰，全为横向

    if (numRed < 0) {
      // 边界情况：setSize=1 不会发生，这里只是安全保护
      numRed = 0;
    }

    // 红色干扰（横向）
    for (let i = 0; i < numRed; i++) {
      stimuli.push({ color: TARGET_COLOR, orientation: "horizontal", isTarget: false });
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

// 生成随机不重叠位置：在可用区域内完全随机采样坐标，并保证矩形之间不重叠
function generatePositionsForStimuli(n) {
  const positions = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  const marginX = w * 0.1;
  const marginY = h * 0.1;
  const usableW = w * 0.8;
  const usableH = h * 0.8;

  // 为了简单起见，用“最大可能尺寸”的外接矩形来做碰撞检测，
  // 这样无论横放还是竖放都不会互相重叠
  const halfW = RECT_LONG / 2;
  const halfH = RECT_LONG / 2;
  const padding = 10; // 刺激之间再留一点安全距离，避免视觉上太挤

  const maxAttempts = 5000;
  let attempts = 0;

  while (positions.length < n && attempts < maxAttempts) {
    attempts++;

    // 保证整个外接矩形都在可用区域内
    const x = marginX + halfW + Math.random() * (usableW - 2 * halfW);
    const y = marginY + halfH + Math.random() * (usableH - 2 * halfH);

    let overlap = false;
    for (const p of positions) {
      const dx = Math.abs(p.x - x);
      const dy = Math.abs(p.y - y);
      if (dx < RECT_LONG + padding && dy < RECT_LONG + padding) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      positions.push({ x, y });
    }
  }

  // 理论上在当前参数下不会触发；若极端情况下采样不够，可退回已有位置数量
  return positions;
}

// ====================== jsPsych 初始化 ======================

const jsPsych = initJsPsych({
  display_element: "exp-container",
  on_finish: function () {
    saveMainDataAsCSV();
  }
});

// 生成练习与正式实验的 trial 条件
const practiceTrials = generateTrials(PRACTICE_REPS_PER_COND, "practice");
const mainTrials = generateTrials(MAIN_REPS_PER_COND, "main");
assignBlocksToMainTrials(mainTrials);

let timeline = [];

// ====================== 练习阶段指导语（instructions 插件） ======================

const practiceInstructionPagesHtml = practiceInstructionPages.map(text => {
  return `
    <div class="instruction-text">${text}</div>
    <div class="prompt-text">按空格键继续</div>
  `;
});

timeline.push({
  type: jsPsychInstructions,
  pages: practiceInstructionPagesHtml,
  key_forward: " ",
  key_backward: false,
  show_clickable_nav: false,
  allow_backward: false
});

// ====================== 基础 trial 模板（注视点 / 刺激 / 判断） ======================

const fixation_trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<div class="fixation">+</div>',
  choices: "NO_KEYS",
  trial_duration: function () {
    return randInt(FIXATION_MIN, FIXATION_MAX);
  },
  data: {
    task: "fixation",
    phase: jsPsych.timelineVariable("phase")
  }
};

const stimulus_trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    const setSize = jsPsych.timelineVariable("setSize");
    const targetPresent = jsPsych.timelineVariable("targetPresent");
    const stimuli = generateStimuliForTrial(setSize, targetPresent);
    const positions = generatePositionsForStimuli(setSize);

    let html = "";
    for (let i = 0; i < setSize; i++) {
      const stim = stimuli[i];
      const pos = positions[i];

      const isVertical = stim.orientation === "vertical";
      const width = isVertical ? RECT_SHORT : RECT_LONG;
      const height = isVertical ? RECT_LONG : RECT_SHORT;

      html += `<div class="stimulus-rect" style="
        background-color:${stim.color};
        left:${pos.x}px;
        top:${pos.y}px;
        width:${width}px;
        height:${height}px;
        transform:translate(-50%, -50%);
      "></div>`;
    }
    return html;
  },
  choices: "NO_KEYS",
  trial_duration: function () {
    return jsPsych.timelineVariable("duration");
  },
  data: {
    task: "display",
    phase: jsPsych.timelineVariable("phase"),
    set_size: jsPsych.timelineVariable("setSize"),
    display_duration: jsPsych.timelineVariable("duration"),
    target_present: jsPsych.timelineVariable("targetPresent"),
    block: jsPsych.timelineVariable("block"),
    trial_index: jsPsych.timelineVariable("index")
  }
};

const decision_trial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus:
    '<div class="instruction-text">' +
    "请判断刚才是否出现过目标刺激（竖向红色长方形）。\n\n" +
    "出现过：按 F 键\n" +
    "未出现：按 J 键\n\n" +
    "请在 3000 毫秒内作答。" +
    "</div>",
  choices: [KEY_TARGET_PRESENT, KEY_TARGET_ABSENT],
  trial_duration: DECISION_DEADLINE,
  data: {
    task: "decision",
    phase: jsPsych.timelineVariable("phase"),
    set_size: jsPsych.timelineVariable("setSize"),
    display_duration: jsPsych.timelineVariable("duration"),
    target_present: jsPsych.timelineVariable("targetPresent"),
    block: jsPsych.timelineVariable("block"),
    trial_index: jsPsych.timelineVariable("index")
  },
  on_finish: function (data) {
    // 把 jsPsych 记录的按键与 RT 转为所需格式
    let key = "";
    if (data.response !== null) {
      key = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.response).toLowerCase();
    }
    data.response_key = key;

    const targetPresentBool = !!data.target_present;
    const correctKey = targetPresentBool ? KEY_TARGET_PRESENT : KEY_TARGET_ABSENT;
    data.correct = key === correctKey ? 1 : 0;

    if (data.rt === null) {
      data.rt_ms = DECISION_DEADLINE;
    } else {
      data.rt_ms = Math.round(data.rt);
    }
  }
};

// ====================== 练习阶段（结构与原逻辑一致） ======================

timeline.push({
  timeline: [fixation_trial, stimulus_trial, decision_trial],
  timeline_variables: practiceTrials,
  randomize_order: false
});

// ====================== 正式实验准备界面 ======================

const mainReadyTrial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus:
    `<div class="ready-text">${mainReadyText}</div>` +
    `<div class="prompt-text">按空格键开始正式实验</div>`,
  choices: [" "]
};

timeline.push(mainReadyTrial);

// ====================== 正式实验（按 block 分段，中间休息） ======================

function createRestTrial(blockNumber) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus:
      `<div class="rest-text">${blockRestText}\n\n当前即将开始第 ${blockNumber} 个 block。</div>` +
      `<div class="prompt-text">按空格键继续</div>`,
    choices: [" "]
  };
}

const totalBlocks = mainTrials.length > 0
  ? Math.max(...mainTrials.map(t => t.block))
  : 0;

for (let b = 1; b <= totalBlocks; b++) {
  const blockTrials = mainTrials.filter(t => t.block === b);
  if (blockTrials.length === 0) continue;

  if (b > 1) {
    timeline.push(createRestTrial(b));
  }

  timeline.push({
    timeline: [fixation_trial, stimulus_trial, decision_trial],
    timeline_variables: blockTrials,
    randomize_order: false
  });
}

// ====================== 结束界面 ======================

const endScreenTrial = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `<div class="end-text">${endText}</div>`,
  choices: "NO_KEYS",
  trial_duration: END_SCREEN_DURATION
};

timeline.push(endScreenTrial);

// ====================== CSV 导出（仅正式实验 decision 试次） ======================

function saveMainDataAsCSV() {
  const mainDecisionData = jsPsych.data.get().filter({
    task: "decision",
    phase: "main"
  });

  if (mainDecisionData.count() === 0) return;

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

  mainDecisionData.values().forEach(trial => {
    const targetPresentNum = trial.target_present ? 1 : 0;
    const responseKey = trial.response_key || "";
    const correctNum = typeof trial.correct === "number"
      ? trial.correct
      : (trial.correct ? 1 : 0);
    const rtMs = typeof trial.rt_ms === "number"
      ? trial.rt_ms
      : (trial.rt == null ? DECISION_DEADLINE : Math.round(trial.rt));

    const row = [
      trial.trial_index,
      trial.block,
      trial.set_size,
      trial.display_duration,
      targetPresentNum,
      responseKey,
      correctNum,
      rtMs
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

// ====================== 运行 jsPsych 时间线 ======================

jsPsych.run(timeline);

