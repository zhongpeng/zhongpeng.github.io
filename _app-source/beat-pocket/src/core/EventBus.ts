type Handler = (data?: any) => void;
const listeners = new Map<string, Set<Handler>>();
export const Events = { STATE:'game:state', FEEDBACK:'spectacle:hit', ACTION:'spectacle:action', COMBO:'spectacle:combo', OVER:'game:over' } as const;
export const EventBus = {
 on(name:string,fn:Handler){const set=listeners.get(name)??new Set();set.add(fn);listeners.set(name,set);return ()=>set.delete(fn);},
 emit(name:string,data?:any){listeners.get(name)?.forEach(fn=>fn(data));}
};
