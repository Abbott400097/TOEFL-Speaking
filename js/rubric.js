/**
 * TOEFL Speaking 评分标准（与 ETS 官方一致）
 * 每题 0–4 分整数，四题原始分 0–16，换算为口语 section 0–30 分
 */
var TOEFL_SPEAKING_RUBRIC = {
  /** 各分数档描述（与 ETS 官方口语评分标准一致） */
  levels: [
    {
      score: 0,
      label: '0 分',
      short: '未作答 / 离题 / 非英语',
      description: '未作答、完全离题，或未使用英语作答。'
    },
    {
      score: 1,
      label: '1 分',
      short: '严重不足',
      description: '未能有效完成题目要求。表达难以理解或内容极少；存在严重的连贯性、发展或语言问题。'
    },
    {
      score: 2,
      label: '2 分',
      short: '明显局限',
      description: '部分完成题目要求。表达清晰度有限；内容或逻辑发展不充分；语言运用存在明显问题，可能影响理解。'
    },
    {
      score: 3,
      label: '3 分',
      short: '基本达标',
      description: '基本完成题目要求。表达大体清晰、连贯；内容与逻辑发展尚可；存在一些表达、语法或流利度问题，但不严重影响理解。'
    },
    {
      score: 4,
      label: '4 分',
      short: '充分完成',
      description: '充分完成题目要求。表达清晰、流畅；内容充实、逻辑连贯、发展充分；仅有少量小错误，不影响理解。'
    }
  ],

  /**
   * ETS 原始分(0–16) 转 口语 section 换算分(0–30)
   * 参考 ETS 换算表
   */
  rawToScaled: function (rawTotal) {
    var table = {
      0: 0, 1: 8, 2: 14, 3: 18, 4: 22, 5: 24, 6: 26, 7: 27, 8: 28,
      9: 28, 10: 29, 11: 29, 12: 30, 13: 30, 14: 30, 15: 30, 16: 30
    };
    rawTotal = Math.max(0, Math.min(16, Math.round(rawTotal)));
    return table[rawTotal] !== undefined ? table[rawTotal] : 0;
  }
};
