(function () {
  'use strict';

  const introPanel = document.getElementById('introPanel');
  const practicePanel = document.getElementById('practicePanel');
  const backBtn = document.getElementById('backBtn');
  const taskBadge = document.getElementById('taskBadge');
  const phasePrep = document.getElementById('phasePrep');
  const phaseResponse = document.getElementById('phaseResponse');
  const phaseDone = document.getElementById('phaseDone');
  const prepTimerEl = document.getElementById('prepTimer');
  const responseTimerEl = document.getElementById('responseTimer');
  const prepPrompt = document.getElementById('prepPrompt');
  const responsePrompt = document.getElementById('responsePrompt');
  const recordBtn = document.getElementById('recordBtn');
  const recordingStatus = document.getElementById('recordingStatus');
  const playbackArea = document.getElementById('playbackArea');
  const playbackAudio = document.getElementById('playbackAudio');
  const donePlaybackArea = document.querySelector('#phaseDone .playback-area');
  const donePlaybackAudio = document.getElementById('donePlaybackAudio');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const scoreSelector = document.getElementById('scoreSelector');
  const scoreResult = document.getElementById('scoreResult');
  const rubricList = document.getElementById('rubricList');

  let state = {
    task: 1,
    questionIndex: 0,
    prepSecondsLeft: 0,
    responseSecondsLeft: 0,
    prepInterval: null,
    responseInterval: null,
    mediaRecorder: null,
    recordedChunks: [],
    stream: null,
    /** 当前本题得分 0–4，未选为 null */
    currentScore: null,
    /** 本次会话各题得分 { task1: 0-4, task2: 0-4, ... }，未做题为 undefined */
    sessionScores: {},
    /** 当前题录音 blob，用于 AI 评分上传 */
    lastRecordedBlob: null
  };

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getCurrentQuestion() {
    const list = TOEFL_QUESTIONS[state.task];
    if (!list || !list.length) return null;
    const index = state.questionIndex % list.length;
    return list[index];
  }

  function showIntro() {
    introPanel.classList.remove('hidden');
    practicePanel.classList.add('hidden');
  }

  function showPractice() {
    introPanel.classList.add('hidden');
    practicePanel.classList.remove('hidden');
  }

  function switchPhase(name) {
    phasePrep.classList.add('hidden');
    phaseResponse.classList.add('hidden');
    phaseDone.classList.add('hidden');
    if (name === 'prep') phasePrep.classList.remove('hidden');
    if (name === 'response') phaseResponse.classList.remove('hidden');
    if (name === 'done') phaseDone.classList.remove('hidden');
  }

  function clearIntervals() {
    if (state.prepInterval) {
      clearInterval(state.prepInterval);
      state.prepInterval = null;
    }
    if (state.responseInterval) {
      clearInterval(state.responseInterval);
      state.responseInterval = null;
    }
  }

  function renderPrepPrompt(q) {
    let html = q.prep || '';
    if (q.reading) html = '[Reading]\n' + q.reading + '\n\n[Listening]\n' + (q.listening || '') + '\n\n[Question]\n' + (q.prep || '');
    prepPrompt.textContent = html;
    responsePrompt.textContent = 'Now you have ' + q.responseSeconds + ' seconds to give your response. Click "开始录音" and speak.';
  }

  function startPrepTimer(q) {
    state.prepSecondsLeft = q.prepSeconds;
    prepTimerEl.textContent = formatTime(state.prepSecondsLeft);
    prepTimerEl.classList.remove('warning');
    clearIntervals();
    state.prepInterval = setInterval(function () {
      state.prepSecondsLeft--;
      prepTimerEl.textContent = formatTime(state.prepSecondsLeft);
      if (state.prepSecondsLeft <= 5) prepTimerEl.classList.add('warning');
      if (state.prepSecondsLeft <= 0) {
        clearInterval(state.prepInterval);
        state.prepInterval = null;
        startResponsePhase(q);
      }
    }, 1000);
  }

  function startResponsePhase(q) {
    switchPhase('response');
    state.responseSecondsLeft = q.responseSeconds;
    responseTimerEl.textContent = formatTime(state.responseSecondsLeft);
    responseTimerEl.classList.remove('warning');
    playbackArea.classList.add('hidden');
    playbackAudio.src = '';
    recordBtn.classList.remove('recording');
    recordBtn.querySelector('.record-label').textContent = '开始录音';
    recordingStatus.classList.add('hidden');

    state.responseInterval = setInterval(function () {
      state.responseSecondsLeft--;
      responseTimerEl.textContent = formatTime(state.responseSecondsLeft);
      if (state.responseSecondsLeft <= 10) responseTimerEl.classList.add('warning');
      if (state.responseSecondsLeft <= 0) {
        clearInterval(state.responseInterval);
        state.responseInterval = null;
        stopRecordingAndGoToDone();
      }
    }, 1000);
  }

  function stopRecordingAndGoToDone() {
    clearIntervals();
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = function () {
        finishDonePhase();
      };
      state.mediaRecorder.stop();
    } else {
      finishDonePhase();
    }
  }

  function showDonePhase(blob) {
    clearIntervals();
    switchPhase('done');
    recordBtn.classList.remove('recording');
    recordBtn.querySelector('.record-label').textContent = '开始录音';
    recordingStatus.classList.add('hidden');
    state.currentScore = null;
    state.lastRecordedBlob = blob || null;
    if (blob) {
      donePlaybackAudio.src = URL.createObjectURL(blob);
      donePlaybackArea.classList.remove('hidden');
    }
    var aiBtn = document.getElementById('aiScoreBtn');
    var aiStatus = document.getElementById('aiScoreStatus');
    var aiResult = document.getElementById('aiScoreResult');
    if (aiBtn) aiBtn.disabled = !blob;
    if (aiStatus) aiStatus.textContent = '';
    if (aiResult) aiResult.classList.add('hidden');
    renderScoreUI();
    renderRubricList();
  }

  /** 渲染分数选择与结果（ETS 0–4 + 换算说明） */
  function renderScoreUI() {
    if (!scoreSelector || !scoreResult) return;
    document.querySelectorAll('.score-btn').forEach(function (btn) {
      var s = parseInt(btn.dataset.score, 10);
      btn.classList.toggle('selected', s === state.currentScore);
    });
    if (state.currentScore === null) {
      scoreResult.textContent = '请选择本题得分（0–4）。';
      scoreResult.classList.remove('score-set');
      return;
    }
    state.sessionScores['task' + state.task] = state.currentScore;
    var rawTotal = 0;
    var count = 0;
    for (var k in state.sessionScores) {
      if (state.sessionScores[k] != null) { rawTotal += state.sessionScores[k]; count++; }
    }
    var scaled = typeof TOEFL_SPEAKING_RUBRIC !== 'undefined' && TOEFL_SPEAKING_RUBRIC.rawToScaled
      ? TOEFL_SPEAKING_RUBRIC.rawToScaled(rawTotal)
      : Math.round((rawTotal / 16) * 30);
    var text = '本题得分：' + state.currentScore + ' / 4（原始分）。';
    if (count === 4) {
      text += ' 四题总分：' + rawTotal + ' / 16，口语 section 换算分约 ' + scaled + ' / 30。';
    } else {
      text += ' 若四题均为此题得分，口语 section 约 ' + (TOEFL_SPEAKING_RUBRIC && TOEFL_SPEAKING_RUBRIC.rawToScaled(state.currentScore * 4) || Math.round((state.currentScore * 4 / 16) * 30)) + ' / 30。';
    }
    scoreResult.textContent = text;
    scoreResult.classList.add('score-set');
  }

  /** 渲染 0–4 各档评分标准说明 */
  function renderRubricList() {
    if (!rubricList || typeof TOEFL_SPEAKING_RUBRIC === 'undefined' || !TOEFL_SPEAKING_RUBRIC.levels) return;
    rubricList.innerHTML = '';
    TOEFL_SPEAKING_RUBRIC.levels.forEach(function (level) {
      var item = document.createElement('div');
      item.className = 'rubric-item';
      item.dataset.score = level.score;
      item.innerHTML = '<span class="rubric-score">' + level.score + ' 分</span> ' +
        '<span class="rubric-short">' + level.short + '</span>' +
        '<p class="rubric-desc">' + level.description + '</p>';
      item.addEventListener('click', function () {
        state.currentScore = level.score;
        renderScoreUI();
        rubricList.querySelectorAll('.rubric-item').forEach(function (r) { r.classList.remove('open'); });
        item.classList.add('open');
      });
      if (state.currentScore === level.score) item.classList.add('open');
      rubricList.appendChild(item);
    });
  }

  function finishDonePhase() {
    if (state.stream) {
      state.stream.getTracks().forEach(function (t) { t.stop(); });
      state.stream = null;
    }
    const blob = state.recordedChunks.length
      ? new Blob(state.recordedChunks, { type: 'audio/webm' })
      : null;
    showDonePhase(blob);
  }

  function startQuestion() {
    const q = getCurrentQuestion();
    if (!q) return;
    taskBadge.textContent = 'Task ' + state.task;
    renderPrepPrompt(q);
    switchPhase('prep');
    startPrepTimer(q);
  }

  function openTask(taskNum) {
    state.task = parseInt(taskNum, 10);
    state.questionIndex = 0;
    state.recordedChunks = [];
    showPractice();
    startQuestion();
  }

  // Task cards
  document.querySelectorAll('.task-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openTask(card.dataset.task);
    });
  });

  // Header task buttons
  document.querySelectorAll('.task-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.task-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      openTask(btn.dataset.task);
    });
  });

  backBtn.addEventListener('click', showIntro);

  nextQuestionBtn.addEventListener('click', function () {
    state.questionIndex++;
    state.recordedChunks = [];
    startQuestion();
  });

  /** 分数按钮：选择 0–4 */
  if (scoreSelector) {
    scoreSelector.addEventListener('click', function (e) {
      var btn = e.target.closest('.score-btn');
      if (!btn) return;
      state.currentScore = parseInt(btn.dataset.score, 10);
      renderScoreUI();
      rubricList.querySelectorAll('.rubric-item').forEach(function (r) {
        r.classList.toggle('open', parseInt(r.dataset.score, 10) === state.currentScore);
      });
    });
  }

  /** AI 评分：上传录音到后端，按官方标准打分（省 token：只传转录稿 + WPM） */
  var aiScoreBtn = document.getElementById('aiScoreBtn');
  var aiScoreStatus = document.getElementById('aiScoreStatus');
  var aiScoreResult = document.getElementById('aiScoreResult');
  var aiScoreReason = document.getElementById('aiScoreReason');
  var aiScoreTranscript = document.getElementById('aiScoreTranscript');
  if (aiScoreBtn) {
    aiScoreBtn.addEventListener('click', function () {
      if (!state.lastRecordedBlob || aiScoreBtn.disabled) return;
      aiScoreBtn.disabled = true;
      if (aiScoreStatus) aiScoreStatus.textContent = '转录与评分中…';
      if (aiScoreResult) aiScoreResult.classList.add('hidden');
      var fd = new FormData();
      fd.append('audio', state.lastRecordedBlob, 'answer.webm');
      fd.append('task', String(state.task));
      var apiBase = (typeof window !== 'undefined' && window.TOEFL_API_BASE) ? window.TOEFL_API_BASE : '';
      fetch(apiBase + '/api/score', { method: 'POST', body: fd })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          if (r.ok && r.data.score != null) {
            state.currentScore = r.data.score;
            if (aiScoreReason) aiScoreReason.textContent = '理由：' + (r.data.reason || '');
            if (aiScoreTranscript) aiScoreTranscript.textContent = (r.data.transcript ? '转录：' + r.data.transcript : '') + (r.data.wpm != null ? '  WPM: ' + r.data.wpm : '');
            if (aiScoreResult) aiScoreResult.classList.remove('hidden');
            renderScoreUI();
            if (rubricList) rubricList.querySelectorAll('.rubric-item').forEach(function (el) {
              el.classList.toggle('open', parseInt(el.dataset.score, 10) === state.currentScore);
            });
            if (aiScoreStatus) aiScoreStatus.textContent = '得分：' + r.data.score + ' / 4';
          } else {
            if (aiScoreStatus) aiScoreStatus.textContent = '评分失败';
            if (aiScoreReason) aiScoreReason.textContent = r.data && r.data.error ? r.data.error : '请检查后端配置（如 OPENAI_API_KEY）';
            if (aiScoreResult) aiScoreResult.classList.remove('hidden');
          }
        })
        .catch(function (err) {
          if (aiScoreStatus) aiScoreStatus.textContent = '请求失败';
          if (aiScoreReason) aiScoreReason.textContent = err && err.message ? err.message : '请确保已启动 server.py 并配置 API';
          if (aiScoreResult) aiScoreResult.classList.remove('hidden');
        })
        .finally(function () {
          aiScoreBtn.disabled = false;
        });
    });
  }

  // Recording
  recordBtn.addEventListener('click', function () {
    if (recordBtn.classList.contains('recording')) {
      if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }
      return;
    }

    state.recordedChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        state.stream = stream;
        state.mediaRecorder = new MediaRecorder(stream);
        state.mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) state.recordedChunks.push(e.data);
        };
        state.mediaRecorder.onstop = function () {
          if (state.stream) {
            state.stream.getTracks().forEach(function (t) { t.stop(); });
            state.stream = null;
          }
          if (state.recordedChunks.length) {
            const blob = new Blob(state.recordedChunks, { type: 'audio/webm' });
            playbackAudio.src = URL.createObjectURL(blob);
            playbackArea.classList.remove('hidden');
          }
          recordBtn.classList.remove('recording');
          recordBtn.querySelector('.record-label').textContent = '开始录音';
          recordingStatus.classList.add('hidden');
          state.mediaRecorder = null;
        };
        state.mediaRecorder.start();
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.record-label').textContent = '停止录音';
        recordingStatus.classList.remove('hidden');
      })
      .catch(function (err) {
        alert('无法使用麦克风，请允许浏览器访问麦克风后重试。');
        console.error(err);
      });
  });
})();
