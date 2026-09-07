import type { Point } from './island';
export type Need =
  | 'companionship'
  | 'boundaries'
  | 'expression'
  | 'rest'
  | 'play'
  | 'continuity';
export type Choice = { text: string; need: Need; reply: string };
export type Memory = {
  id: string;
  title: string;
  region: 0 | 1 | 2;
  position: Point;
  kind: string;
  story: string;
  question: string;
  choices: Choice[];
};
export const memories: Memory[] = [
  {
    id: 'marble',
    title: '蓝色玻璃珠',
    region: 0,
    position: { x: -18, z: 3 },
    kind: 'marble',
    story:
      '玻璃珠滚进树根的凹处，沾了湿泥。\n那孩子趴下去找，袖口染成绿色。天黑前，只差一颗，就能铺满那条自己画的小河。',
    question: '如果能走进这个下午，你想为自己留一点什么？',
    choices: [
      {
        text: '玩一会没有目标的游戏',
        need: 'play',
        reply: '那条小河不需要流向哪里。你可以只是喜欢它。',
      },
      {
        text: '邀一个人一起发现小事',
        need: 'companionship',
        reply: '小河旁边，也可以再蹲下一个人。你愿意让发现被分享。',
      },
      {
        text: '把那条小河画完',
        need: 'continuity',
        reply: '你想接着画。今天添上一小笔，也算和那个下午重逢。',
      },
    ],
  },
  {
    id: 'stool',
    title: '厨房窗下的木凳',
    region: 0,
    position: { x: -20, z: -6 },
    kind: 'house',
    story:
      '凳面被坐得发亮。\n一个孩子踩上去看锅里的水冒泡，葱香钻出窗缝。有人扶了一下凳背，说汤还得再等一会儿。',
    question: '如果这段等待里有你想要的，它会是什么？',
    choices: [
      {
        text: '约熟悉的人吃顿饭',
        need: 'companionship',
        reply: '你选了一张有人同坐的餐桌。菜可以简单，见面也不必说很多。',
      },
      {
        text: '坐下慢慢吃一顿饭',
        need: 'rest',
        reply: '这一餐可以属于你自己。不赶着收拾，也不急着去做下一件事。',
      },
      {
        text: '说说我记得的那碗汤',
        need: 'expression',
        reply: '一道味道也能装下一段往事。你愿意把自己的版本说出来。',
      },
    ],
  },
  {
    id: 'pinwheel',
    title: '歪了的纸风车',
    region: 0,
    position: { x: -11, z: -9 },
    kind: 'swing',
    story:
      '风车有一角折歪了。别人的转得很快，这一只偶尔才动一下。\n举着它跑过花圃，纸片终于拍出细小的响声。',
    question: '遇到不太顺手的事，你想给自己怎样的余地？',
    choices: [
      {
        text: '换个玩法再试一次',
        need: 'play',
        reply: '你没有要求风车和别人转得一样。也许换个方向，能听见另一种响声。',
      },
      {
        text: '按自己的步子慢慢来',
        need: 'boundaries',
        reply: '别人的风车可以转得快。你的步子，由你来定。',
      },
      {
        text: '累了就先停下来',
        need: 'rest',
        reply: '你把举起风车的手放低了一点。停下来，不会抹去刚才的尝试。',
      },
    ],
  },
  {
    id: 'cup',
    title: '有缺口的杯子',
    region: 1,
    position: { x: -4, z: 9 },
    kind: 'bench',
    story:
      '海风把咖啡吹凉了。两个人轮流捧着同一个杯子，聊下周去哪儿。\n如今那家店换了招牌，杯沿碰到嘴唇的位置，仍有人记得。',
    question: '想起一份曾经的亲近，你现在更想怎样照顾自己？',
    choices: [
      {
        text: '和愿意的人坐一会儿',
        need: 'companionship',
        reply: '长椅上还有位置。你可以选择今天想让谁坐在身边。',
      },
      {
        text: '写下一个想念的细节',
        need: 'expression',
        reply: '你留下的是杯沿的温度。想念可以很具体，也不一定要寄给谁。',
      },
      {
        text: '留一段独处的时间',
        need: 'boundaries',
        reply: '你为自己留了半张长椅。亲近曾经重要，独处也可以重要。',
      },
    ],
  },
  {
    id: 'ticket',
    title: '折起的车票',
    region: 1,
    position: { x: 3, z: 1 },
    kind: 'bus',
    story:
      '车窗蒙着雾。有人用指尖擦出一小块透明，看那个人站在站牌下面。\n车开走时，手已经举起，却没看清对方有没有看见。',
    question: '对于没能确认的回应，今天你想给自己哪种空间？',
    choices: [
      {
        text: '写下当时想说的话',
        need: 'expression',
        reply: '这一次，那句话可以先被你自己听见。写下来，并不等于必须寄出。',
      },
      {
        text: '暂时不追问那个答案',
        need: 'boundaries',
        reply: '你把问号留在车窗上。今天可以往前走，也可以以后再想。',
      },
      {
        text: '找愿意倾听的人聊聊',
        need: 'companionship',
        reply: '未收到的回应，未必需要独自反复猜。你愿意找一双今天在场的耳朵。',
      },
    ],
  },
  {
    id: 'map',
    title: '手画的地图',
    region: 1,
    position: { x: 5, z: 13 },
    kind: 'boat',
    story:
      '地图背面沾着橘子汁，路口画了三遍。\n两个人还是走错了路，在关门的面包店前分掉最后一瓣橘子，笑着等雨停。',
    question: '这段一起走错路的记忆，让你想带走什么？',
    choices: [
      {
        text: '给熟悉的路换个走法',
        need: 'play',
        reply: '你为偶然留了一个路口。不用走得更远，也可能看见没注意过的东西。',
      },
      {
        text: '邀朋友散一次步',
        need: 'companionship',
        reply: '你想留下的，是有人并排走。路线不必先画好。',
      },
      {
        text: '留住偶尔散步的习惯',
        need: 'continuity',
        reply:
          '那张地图可以旧下去，散步却可以继续。新的路，也能装下旧时的一点轻松。',
      },
    ],
  },
  {
    id: 'notebook',
    title: '写到一半的本子',
    region: 2,
    position: { x: 13, z: 2 },
    kind: 'desk',
    story:
      '本子前几页写得很满，后面夹着一片干叶。\n再次翻开时，纸张发脆。有些愿望还在，有些已经变了。',
    question: '面对没有完成的计划，现在的你想怎样安排它？',
    choices: [
      {
        text: '挑一小步接着做',
        need: 'continuity',
        reply: '你不必一次填满剩下的纸。今天的一小步，有它自己的分量。',
      },
      {
        text: '写下已经改变的愿望',
        need: 'expression',
        reply: '你允许本子里出现新的字迹。改变愿望，也是在认真听现在的自己。',
      },
      {
        text: '先不安排继续的日期',
        need: 'boundaries',
        reply: '你没有给空白页补上期限。暂时不知道，也可以留在计划里。',
      },
    ],
  },
  {
    id: 'key',
    title: '旧家的钥匙',
    region: 2,
    position: { x: 21, z: -2 },
    kind: 'mailbox',
    story:
      '搬家后，钥匙仍在外套口袋里。\n习惯性摸到齿纹，才想起今天要走另一条路。新房间的窗边，纸箱还没有拆完。',
    question: '走进不熟悉的日常，你想先为自己做什么？',
    choices: [
      {
        text: '保留一个熟悉的小习惯',
        need: 'continuity',
        reply: '旧钥匙不必打开新门。一个熟悉的小习惯，可以陪你慢慢认路。',
      },
      {
        text: '给自己留个安静角落',
        need: 'rest',
        reply: '纸箱可以晚点再拆。你先为今天的自己，腾出了能坐下的位置。',
      },
      {
        text: '请熟悉的人来坐坐',
        need: 'companionship',
        reply: '新房间里可以有熟悉的声音。你愿意让变化，有人一起见证。',
      },
    ],
  },
  {
    id: 'scarf',
    title: '长椅上的围巾',
    region: 2,
    position: { x: 13, z: -12 },
    kind: 'scarf',
    story:
      '围巾的线头扎着下巴。以前一起上山的人，总在这张长椅歇脚。\n今天有人独自坐下，倒出两杯热茶，又把其中一杯慢慢喝掉。',
    question: '在一个少了人的位置，你此刻想给自己留些什么？',
    choices: [
      {
        text: '在这里多坐一会儿',
        need: 'rest',
        reply: '你没有催促自己站起来。茶还热着，想坐多久，可以由你决定。',
      },
      {
        text: '记下一件关于那人的事',
        need: 'expression',
        reply: '你选择让一个细节留下。写得完整或零散，都不影响它曾经真实发生。',
      },
      {
        text: '把偶尔上山的习惯留下',
        need: 'continuity',
        reply: '这条山路可以继续走。它会有新的风景，也可以仍然让你想起那个人。',
      },
    ],
  },
];
export type Answer = { id: string; choice: number; form: 'lantern' | 'star' };
export const NEEDS: Record<
  Need,
  { label: string; color: string; hint: string; title: string }
> = {
  companionship: {
    label: '陪伴',
    color: '#edc892',
    title: '给陪伴留一个小位置',
    hint: '如果愿意，找一个让你自在的人，分享今天的一件小事。也可以只坐一会儿，不必解释全部。',
  },
  boundaries: {
    label: '自己的空间',
    color: '#a7c8c7',
    title: '有些回应，可以晚一点',
    hint: '你可以给自己留一点空间。一句“我想晚些再回答”，也能是今天对自己的照顾。',
  },
  expression: {
    label: '表达',
    color: '#dcaea1',
    title: '让那句话先被自己听见',
    hint: '如果还有一句话想说，可以先写给自己。写一半、改写，或不寄出，都由你决定。',
  },
  rest: {
    label: '歇一歇',
    color: '#b9bfdc',
    title: '今天可以先到这里',
    hint: '喝一点水，舒展一下，或找个舒服的位置停一会儿。不需要证明自己已经想通。',
  },
  play: {
    label: '玩心',
    color: '#e6d58d',
    title: '留一点没有用途的快乐',
    hint: '如果愿意，给一件单纯喜欢的小事留几分钟。不必把它做得很好，也不必把它变成任务。',
  },
  continuity: {
    label: '延续',
    color: '#bace9b',
    title: '把重要的事，带进一个小动作',
    hint: '一张照片、一段旋律，或一个属于你的习惯，都可以安放回忆。你也可以随时换一种方式。',
  },
};
export function resolveAnswer(answer: Answer) {
  const memory = memories.find((m) => m.id === answer.id);
  if (
    !memory ||
    !Number.isInteger(answer.choice) ||
    !memory.choices[answer.choice] ||
    !['lantern', 'star'].includes(answer.form)
  )
    return null;
  return { memory, choice: memory.choices[answer.choice], answer };
}
export function cleanAnswers(raw: unknown): Answer[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, Answer>();
  for (const a of raw) {
    if (a && typeof a === 'object' && resolveAnswer(a as Answer))
      result.set(a.id, { id: a.id, choice: a.choice, form: a.form });
  }
  return [...result.values()].slice(0, memories.length);
}
export function chooseAnswer(answers: Answer[], answer: Answer): Answer[] {
  if (!resolveAnswer(answer)) return answers;
  return [...answers.filter((a) => a.id !== answer.id), answer];
}
export function composeEnding(answers: Answer[]) {
  const selected = cleanAnswers(answers).flatMap((a) => {
    const r = resolveAnswer(a);
    return r ? [r] : [];
  });
  const needs = [...new Set(selected.map((a) => a.choice.need))];
  const stars = selected.filter((a) => a.answer.form === 'star').length;
  const lamps = selected.length - stars;
  const chapters = selected.map(({ memory, choice, answer }) => ({
    id: memory.id,
    title: memory.title,
    line: `在「${memory.title}」旁，你选择了「${choice.text}」。`,
    reply: choice.reply,
    placement:
      answer.form === 'star'
        ? '你把这个瞬间化成星光，带在身边。'
        : '你把这个瞬间留成一盏灯，让它在原处亮着。',
  }));
  const landscape =
    stars && lamps
      ? `${lamps} 盏灯留在来时的路上，${stars} 颗星随你来到这里。有些陪伴来自身边，有些来自你知道它仍在那里。`
      : stars
        ? `${stars} 颗星跟你来到灯塔。你选择把这些瞬间带在身边；以后，也仍可以重新安放。`
        : lamps
          ? `${lamps} 盏灯亮在你走过的地方。你给这些瞬间留了位置，也给今天的自己留了路。`
          : '你没有为回忆作出决定。这段散步同样完整，海风并不需要你交出答案。';
  return {
    chapters,
    needs,
    landscape,
    signature: selected
      .map((a) => `${a.memory.id}:${a.answer.choice}:${a.answer.form}`)
      .join('|'),
    hints: needs.map((n) => NEEDS[n]),
  };
}
