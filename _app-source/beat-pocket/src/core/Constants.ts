export const TIMING = { PERFECT: .065, GOOD: .13, MAX: .19, DEBOUNCE: .075, LEAD: 1.8, COUNT_IN: 4, END_TAIL: .8, LOOK_AHEAD: .18 } as const;
export const COLORS = { BG: 0x151a17, LIME: 0xd9fa76, CORAL: 0xff926f, WHITE: 0xf2f3e9, DIM: 0x526057 } as const;
export const MODES = { easy: { bpm: 96, label: '轻松入拍' }, normal: { bpm: 120, label: '多一点挑战' } } as const;
export type Mode = keyof typeof MODES;
export type Note = { id: number; beat: number; time: number; accent: boolean; judged: boolean };
export function makeChart(mode: Mode): Note[] {
 const beats = Array.from({ length: 48 }, (_, i) => i);
 if (mode === 'normal') for (let i = 16; i < 48; i += 4) beats.push(i + .5);
 return beats.sort((a,b)=>a-b).map((beat,id)=>({id,beat,time:beat*60/MODES[mode].bpm,accent:beat%4===0,judged:false}));
}
