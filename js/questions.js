/**
 * TOEFL Speaking 题目库
 *
 * 真实考试听力时长参考（便于你接 TPO/真题）：
 * - Task 2 校园对话：约 60–90 秒
 * - Task 3 学术对话/讲座：约 60–90 秒
 * - Task 4 学术讲座：约 1.5–2 分钟（约 90–120 秒）
 *
 * 题目字段：
 * - reading: 阅读文稿（Task 2/3）
 * - listening: 听力文稿；无音频文件时用浏览器 TTS 朗读（仅适合短篇，长讲座建议用音频）
 * - listeningAudio: 听力音频 URL（推荐）。放 TPO/真题 MP3 路径即可，例如 '/audio/task4_tpo1.mp3'
 * - listeningDurationLabel: 可选，界面提示用，如 "约 2 分钟" "约 90 秒"
 * - prep: 题目/作答指示
 * - prepSeconds / responseSeconds: 准备与作答秒数
 *
 * 使用真题/TPO：把音频放到项目下（如 audio/ 文件夹），在题目里写 listeningAudio: '/audio/xxx.mp3'
 * 并保留 listening 作为备用（或空字符串），界面会优先播放 listeningAudio。
 */
var TOEFL_QUESTIONS = {
  1: [
    {
      prep: 'Some people prefer to live in a small town. Others prefer to live in a big city. Which do you prefer? Use specific reasons and examples to support your answer.',
      prepSeconds: 15,
      responseSeconds: 45
    },
    {
      prep: 'Do you agree or disagree with the following statement? Students should be required to wear uniforms at school. Use specific reasons and examples to support your answer.',
      prepSeconds: 15,
      responseSeconds: 45
    }
  ],
  2: [
    {
      reading: 'The university is considering closing the campus coffee shop in the library. The school newspaper has published a letter from the administration explaining the reasons. The main reasons are: first, the shop creates noise and distracts students who are trying to study; second, the space could be used for additional quiet study rooms that are in high demand.',
      listening: 'Woman: I totally disagree with closing the coffee shop. I mean, yeah, it can get a little noisy sometimes, but it\'s not that bad. And the thing is, a lot of students really depend on that place. We have back-to-back classes all day, and the coffee shop is the only place nearby where we can grab something to eat or get coffee between classes. If they close it, we\'d have to leave the library and walk all the way to the student center, and we\'d lose like twenty minutes. Man: I see your point. So you\'re saying the convenience is really important. Woman: Exactly. And as for the study rooms, I think they could add those somewhere else, like in the basement. They don\'t have to take away the coffee shop.',
      prep: 'The woman expresses her opinion about the university\'s plan. State her opinion and explain the reasons she gives for holding that opinion.',
      prepSeconds: 30,
      responseSeconds: 60
    }
  ],
  3: [
    {
      reading: 'Cognitive Dissonance. When people hold two conflicting beliefs or when their behavior conflicts with their beliefs, they experience psychological discomfort known as cognitive dissonance. To reduce this discomfort, people often change one of the beliefs or their behavior to make them consistent.',
      listening: 'Professor: So, a classic example is smoking. Let\'s say a person knows that smoking is bad for their health—they believe it\'s harmful. But they smoke anyway. So there\'s a conflict: the belief "smoking is bad" and the behavior of smoking. That creates cognitive dissonance. Now, to reduce the discomfort, the smoker might change their belief. They might tell themselves, "Well, my grandfather smoked his whole life and lived to ninety," or "I only smoke a few a day, so it\'s not that bad." By changing the belief, the conflict goes away and they feel better. Or, alternatively, they could change the behavior—quit smoking—and then their behavior would match their belief.',
      prep: 'Explain cognitive dissonance and how the example of smoking illustrates the concept.',
      prepSeconds: 30,
      responseSeconds: 60
    }
  ],
  4: [
    {
      // Task 4 真实考试约 1.5–2 分钟讲座。有 TPO/真题 MP3 时请设 listeningAudio: '/audio/task4_xxx.mp3'
      listening: 'Professor: Today we\'re looking at how birds navigate during long migrations. One key method is using the Earth\'s magnetic field. Researchers have found that birds have a protein called cryptochrome in their eyes that is sensitive to magnetic fields. When light hits this protein, it creates molecules that react differently depending on the direction of the magnetic field. So in a sense, birds might actually "see" the magnetic field. Another method birds use is the sun. They use the position of the sun in the sky combined with their internal biological clock to figure out direction. So if they know what time it is and where the sun is, they can determine north, south, east, and west. So you have these two systems—magnetic and solar—and it seems that birds use both, perhaps as a backup or in different conditions.',
      listeningDurationLabel: '约 2 分钟',
      prep: 'Using points and examples from the lecture, explain how birds navigate during migration.',
      prepSeconds: 20,
      responseSeconds: 60
    }
  ]
};
