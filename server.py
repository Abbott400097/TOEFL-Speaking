# -*- coding: utf-8 -*-
"""
TOEFL Speaking 评分后端：
1. 接收录音 → 转录（Whisper 或你配置的 API）
2. 计算简单流利度：字数、时长 → WPM（便于 AI 判断流利度，不额外耗 token）
3. 按 ETS 官方标准调用 AI 给出 0-4 分 + 一句话理由（省 token）
"""
import os
import re
import json
import tempfile
from flask import Flask, request, jsonify, send_from_directory

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# 从环境变量读取，不写死 key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")  # Claude 评分（默认用这个若存在）
CLAUDE_SCORING_MODEL = os.environ.get("CLAUDE_SCORING_MODEL", "claude-sonnet-4-20250514")
# 可选：不用 OpenAI/Claude 时，用你自己的转录/评分接口
TRANSCRIPTION_URL = os.environ.get("TOEFL_TRANSCRIPTION_URL")  # 若提供则 POST audio → { "text": "..." }
SCORING_URL = os.environ.get("TOEFL_SCORING_URL")               # 若提供则 POST JSON → { "score": 0-4, "reason": "..." }
SCORING_API_KEY = os.environ.get("TOEFL_SCORING_API_KEY", OPENAI_API_KEY or ANTHROPIC_API_KEY)

# 官方 ETS 0-4 简述（给 AI 用，尽量短）
RUBRIC_SHORT = """Score 0-4 only. ETS: 4=fully addresses task, clear, fluent, minor errors. 3=generally good, some issues. 2=partial, limited clarity/development. 1=serious problems, hard to follow. 0=off-topic or no speech. Reply with JSON only: {"score":0-4,"reason":"one short sentence"}"""


def get_word_count(text):
    if not text or not text.strip():
        return 0
    return len(re.findall(r"\S+", text.strip()))


def transcribe_openai(audio_path):
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        with open(audio_path, "rb") as f:
            r = client.audio.transcriptions.create(model="whisper-1", file=f, language="en")
        return (r.text or "").strip(), None
    except Exception as e:
        return None, str(e)


def transcribe_custom(audio_path):
    if not TRANSCRIPTION_URL:
        return None, "No TRANSCRIPTION_URL"
    try:
        import requests
        with open(audio_path, "rb") as f:
            r = requests.post(
                TRANSCRIPTION_URL,
                files={"file": ("audio.webm", f, "audio/webm")},
                headers={"Authorization": "Bearer " + SCORING_API_KEY} if SCORING_API_KEY else None,
                timeout=60,
            )
        r.raise_for_status()
        data = r.json()
        return (data.get("text") or data.get("transcript") or "").strip(), None
    except Exception as e:
        return None, str(e)


def score_with_openai(task: int, transcript: str, duration_sec: float, word_count: int, wpm: float):
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        user = (
            f"Task {task}. Transcript: \"{transcript[:2000]}\" "
            f"Duration: {duration_sec:.0f}s. Words: {word_count}. WPM: {wpm:.0f}. "
            "Reply with JSON only: {\"score\":0-4,\"reason\":\"one short sentence\"}"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": RUBRIC_SHORT},
                {"role": "user", "content": user},
            ],
            max_tokens=150,
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        # 只取 JSON 行
        for line in text.splitlines():
            line = line.strip().strip("`")
            if line.startswith("{"):
                obj = json.loads(line)
                s = obj.get("score")
                if s is not None and 0 <= int(s) <= 4:
                    return int(s), obj.get("reason", ""), None
        return None, None, "No valid JSON score in response"
    except Exception as e:
        return None, None, str(e)


def score_with_claude(task: int, transcript: str, duration_sec: float, word_count: int, wpm: float):
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        user = (
            f"Task {task}. Transcript: \"{transcript[:2000]}\" "
            f"Duration: {duration_sec:.0f}s. Words: {word_count}. WPM: {wpm:.0f}. "
            "Reply with JSON only: {\"score\":0-4,\"reason\":\"one short sentence\"}"
        )
        msg = client.messages.create(
            model=CLAUDE_SCORING_MODEL,
            max_tokens=150,
            system=RUBRIC_SHORT,
            messages=[{"role": "user", "content": user}],
        )
        text = (msg.content[0].text if msg.content else "").strip()
        for line in text.splitlines():
            line = line.strip().strip("`")
            if line.startswith("{"):
                obj = json.loads(line)
                s = obj.get("score")
                if s is not None and 0 <= int(s) <= 4:
                    return int(s), obj.get("reason", ""), None
        return None, None, "No valid JSON score in response"
    except Exception as e:
        return None, None, str(e)


def score_with_custom(task: int, transcript: str, duration_sec: float, word_count: int, wpm: float):
    if not SCORING_URL:
        return None, None, "No SCORING_URL"
    try:
        import requests
        payload = {
            "task": task,
            "transcript": transcript,
            "duration_sec": duration_sec,
            "word_count": word_count,
            "wpm": wpm,
            "rubric_hint": RUBRIC_SHORT,
        }
        r = requests.post(
            SCORING_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                **({"Authorization": "Bearer " + SCORING_API_KEY} if SCORING_API_KEY else {}),
            },
            timeout=60,
        )
        r.raise_for_status()
        data = r.json()
        s = data.get("score")
        if s is not None and 0 <= int(s) <= 4:
            return int(s), data.get("reason", ""), None
        return None, None, "Invalid score in response"
    except Exception as e:
        return None, None, str(e)


def get_audio_duration_sec(audio_path):
    try:
        import wave
        with wave.open(audio_path, "rb") as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        pass
    try:
        from pydub import AudioSegment
        seg = AudioSegment.from_file(audio_path)
        return len(seg) / 1000.0
    except Exception:
        pass
    return 0.0


@app.route("/api/score", methods=["POST"])
def api_score():
    # 接收：audio 文件，task 1-4
    audio = request.files.get("audio")
    task = request.form.get("task", "1")
    try:
        task = int(task)
        if task not in (1, 2, 3, 4):
            task = 1
    except Exception:
        task = 1

    if not audio:
        return jsonify({"error": "Missing audio file"}), 400

    suffix = ".webm"
    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[-1].lower()
    if suffix not in (".webm", ".mp3", ".wav", ".m4a", ".ogg"):
        suffix = ".webm"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        try:
            audio.save(tmp.name)
            # 1) 转录
            if TRANSCRIPTION_URL:
                transcript, err = transcribe_custom(tmp.name)
            elif OPENAI_API_KEY:
                transcript, err = transcribe_openai(tmp.name)
            else:
                transcript, err = "", "No OPENAI_API_KEY or TOEFL_TRANSCRIPTION_URL"
            if err and not transcript:
                return jsonify({"error": "Transcription failed: " + str(err)}), 500
            transcript = transcript or ""

            # 2) 时长（用于 WPM）
            duration_sec = get_audio_duration_sec(tmp.name)
            if duration_sec <= 0:
                duration_sec = 30.0  # 默认估计
            word_count = get_word_count(transcript)
            wpm = (word_count / duration_sec) * 60.0 if duration_sec > 0 else 0

            # 3) 评分：优先 Claude → OpenAI → 自定义 URL
            if ANTHROPIC_API_KEY:
                score, reason, err = score_with_claude(task, transcript, duration_sec, word_count, wpm)
            elif SCORING_URL and not OPENAI_API_KEY:
                score, reason, err = score_with_custom(task, transcript, duration_sec, word_count, wpm)
            elif OPENAI_API_KEY:
                score, reason, err = score_with_openai(task, transcript, duration_sec, word_count, wpm)
            else:
                score, reason, err = score_with_custom(task, transcript, duration_sec, word_count, wpm)

            if err:
                return jsonify({"error": "Scoring failed: " + str(err), "transcript": transcript, "wpm": round(wpm, 1)}), 500
            return jsonify({
                "score": score,
                "reason": reason or "",
                "transcript": transcript,
                "duration_sec": round(duration_sec, 1),
                "word_count": word_count,
                "wpm": round(wpm, 1),
            })
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "transcription": "openai" if OPENAI_API_KEY else ("custom" if TRANSCRIPTION_URL else "none"),
        "scoring": "claude" if ANTHROPIC_API_KEY else ("openai" if OPENAI_API_KEY else ("custom" if SCORING_URL else "none")),
    })


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_file(path):
    return send_from_directory(".", path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
