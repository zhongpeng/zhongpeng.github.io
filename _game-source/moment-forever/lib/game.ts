export const memories = [
  {
    title: '一颗纽扣',
    place: '旧日的浅滩',
    english: 'THE LITTLE THINGS',
    at: 18,
    icon: 'button',
    present: '潮水退去，一颗纽扣留在石缝里。',
    memory:
      '你替我补过这颗纽扣。\n线绕得太多，扣起来有些费劲。\n我一直没有重新缝。',
    words: ['照顾', '笨拙'],
    farewell: '水面只动了一下。那双替你缝过纽扣的手，你还记得。',
  },
  {
    title: '折起的车票',
    place: '雨停的地方',
    english: 'A SHARED SILENCE',
    at: 39,
    icon: 'ticket',
    present: '一张折过两次的车票，停在脚边。',
    memory:
      '那天一路下雨。我们坐在末排，谁也没说话。\n快到站时，你把靠窗的位置让给我。\n我们看了一小段海。',
    words: ['并肩', '沉默'],
    farewell: '字迹慢慢散开。那一小段海，还在。',
  },
  {
    title: '有缺口的杯子',
    place: '空下来的房间',
    english: 'WHAT WE LEFT BEHIND',
    at: 62,
    icon: 'cup',
    present: '沙里露出杯沿。缺口的位置，你很熟悉。',
    memory:
      '搬走那天，我们分好了书和碗。\n这个杯子留在桌上，谁都没拿。\n我关门后，又回来取了一次。',
    words: ['留恋', '迟疑'],
    farewell: '海水漫过杯沿。你终于可以空出一只手。',
  },
  {
    title: '一把小钥匙',
    place: '未说完的话',
    english: 'ANOTHER MORNING',
    at: 84,
    icon: 'key',
    present: '最后一道潮线里，躺着一把小钥匙。',
    memory:
      '你说，备用钥匙放我这里方便。\n后来锁换了，我也知道。\n我把它从钥匙圈上拆下来，放进了抽屉。',
    words: ['信任', '遗憾'],
    farewell: '钥匙沉下去的时候，远处的灯塔还亮着。',
  },
] as const;
export type Keepsake = { word: string; kept: boolean };
export type GameState = {
  phase: 'intro' | 'walk' | 'memory' | 'depart' | 'ending';
  position: number;
  index: number;
  keepsakes: Keepsake[];
};
export const initialState: GameState = {
  phase: 'intro',
  position: 0,
  index: 0,
  keepsakes: [],
};
export type Action =
  | { type: 'start' }
  | { type: 'move'; distance: number }
  | { type: 'remember' }
  | { type: 'decide'; word: string; kept: boolean }
  | { type: 'continue' }
  | { type: 'restart' };
export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start':
      return state.phase === 'intro'
        ? { ...initialState, phase: 'walk' }
        : state;
    case 'move': {
      if (state.phase !== 'walk' || !Number.isFinite(action.distance))
        return state;
      const target = memories[state.index]?.at ?? 100;
      const position = Math.min(
        target,
        Math.max(0, state.position + Math.max(0, action.distance)),
      );
      return { ...state, position, phase: position >= 100 ? 'ending' : 'walk' };
    }
    case 'remember':
      return state.phase === 'walk' &&
        state.index < memories.length &&
        state.position >= memories[state.index].at
        ? { ...state, phase: 'memory' }
        : state;
    case 'decide': {
      if (
        state.phase !== 'memory' ||
        !memories[state.index].words.some((word) => word === action.word)
      )
        return state;
      return {
        ...state,
        phase: 'depart',
        keepsakes: [
          ...state.keepsakes,
          { word: action.word, kept: action.kept },
        ],
      };
    }
    case 'continue':
      return state.phase === 'depart'
        ? { ...state, phase: 'walk', index: state.index + 1 }
        : state;
    case 'restart':
      return { ...initialState, keepsakes: [] };
  }
}
