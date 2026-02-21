# TOEFL Speaking Practice

**托福口语练习站** — 本地运行，严格按考试计时，录音回放，并用 **Claude / OpenAI 按 ETS 官方标准** 自动打 0–4 分。

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 功能概览

| 功能 | 说明 |
|------|------|
| **Task 1–4** | 独立题、校园、学术读听、讲座摘要，准备/作答时间与真实考试一致 |
| **录音与回放** | 浏览器内录音，作答结束可回放 |
| **AI 评分** | 上传录音 → 自动转录（Whisper）→ Claude/OpenAI 按 ETS 0–4 档打分 + 一句话理由 |
| **自评** | 可手动选 0–4，查看官方评分标准与换算表（原始分 → 口语 0–30） |

评分时只传**转录稿 + 时长 + WPM**，不传音频，省 token；流利度由 WPM 与文本内容辅助判断。

---

## 快速开始

### 1. 克隆并进入目录

```bash
git clone https://github.com/YOUR_USERNAME/toefl-speaking-practice.git
cd toefl-speaking-practice
```

### 2. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`，至少配置**评分**和**转录**其一：

- **评分（二选一）**  
  - `ANTHROPIC_API_KEY=sk-ant-xxx` — 用 Claude 评分（推荐）  
  - 或 `OPENAI_API_KEY=sk-xxx` — 用 GPT 评分  
- **转录**  
  - `OPENAI_API_KEY=sk-xxx` — 用 Whisper 转录（与 Claude 可同时填）

### 3. 安装依赖并启动

```bash
pip install -r requirements.txt
python server.py
```

### 4. 打开浏览器

访问 **http://localhost:5000**，选择题型 → 准备 → 作答 → 录音 → 点击「AI 评分」即可。

---

## 环境变量说明

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude 评分（优先） |
| `OPENAI_API_KEY` | Whisper 转录 + 可选 GPT 评分 |
| `CLAUDE_SCORING_MODEL` | 可选，Claude 模型 id，默认 `claude-sonnet-4-20250514` |
| `TOEFL_TRANSCRIPTION_URL` | 可选，自定义转录 API（POST 音频 → `{ "text": "..." }`） |
| `TOEFL_SCORING_URL` | 可选，自定义评分 API（POST JSON → `{ "score": 0-4, "reason": "..." }`） |
| `TOEFL_SCORING_API_KEY` | 可选，自定义 API 的 Bearer token |

---

## 项目结构

```
toefl-speaking-practice/
├── server.py          # 后端：转录、WPM、Claude/OpenAI 评分
├── index.html         # 前端入口
├── css/style.css      # 样式
├── js/
│   ├── app.js         # 计时、录音、AI 评分请求
│   ├── questions.js   # 题目库
│   └── rubric.js      # ETS 0–4 标准与换算表
├── docs/
│   └── ETS_AND_FLUENCY.md   # ETS 官方实现与流利度/口音模型说明
├── requirements.txt
├── .env.example
└── README.md
```

---

## ETS 评分与扩展

- **ETS 官方**：使用自研 SpeechRater（自动）+ 人工阅卷，无对外 API。本项目的评分提示词基于公开的 ETS 档位描述，让 Claude/GPT 按同一标准打分。  
- **流利度/口音**：当前用 WPM + 文本；若需更细评估，可自接 [fluency_scorer](https://github.com/tangYang7/fluency_scorer)、[GOPT](https://github.com/YuanGongND/gopt) 等，把指标传入自定义 `TOEFL_SCORING_URL`。  

详见 [docs/ETS_AND_FLUENCY.md](docs/ETS_AND_FLUENCY.md)。

---

## 浏览器与许可

- 建议使用 **Chrome / Edge / Firefox** 最新版；录音需允许麦克风权限。  
- 本项目采用 **MIT** 许可证。
