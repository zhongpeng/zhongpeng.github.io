'use client';
import { useEffect, useRef } from 'react';
import type { IslandWorld, WorldStatus } from '@/lib/world';
export function WorldCanvas({
  onReady,
  onStatus,
  onInteract,
  onError,
}: {
  onReady: (world: IslandWorld | null) => void;
  onStatus: (s: WorldStatus) => void;
  onInteract: (id: string) => void;
  onError: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let stopped = false;
    let instance: IslandWorld | undefined;
    void import('@/lib/world')
      .then(({ IslandWorld }) => {
        if (stopped || !canvas.current) return;
        try {
          instance = new IslandWorld(
            canvas.current,
            onStatus,
            onInteract,
            onError,
          );
          onReady(instance);
        } catch {
          onError();
        }
      })
      .catch(onError);
    return () => {
      stopped = true;
      instance?.dispose();
      onReady(null);
    };
  }, [onReady, onStatus, onInteract, onError]);
  return (
    <canvas
      className="world-canvas"
      ref={canvas}
      tabIndex={0}
      aria-label="回忆小岛。方向键或 W A S D 行走，空格看见回忆，E 靠近。也可以点击地面，或打开地图选择前往的地方。"
    />
  );
}
