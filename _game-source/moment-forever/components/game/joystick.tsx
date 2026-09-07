'use client';
import { useState, type PointerEvent } from 'react';
import type { Point } from '@/lib/island';
export function Joystick({ onMove }: { onMove: (p: Point) => void }) {
  const [knob, setKnob] = useState<Point>({ x: 0, z: 0 });
  function update(event: PointerEvent<HTMLDivElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    let x = event.clientX - r.left - r.width / 2,
      z = event.clientY - r.top - r.height / 2;
    const length = Math.hypot(x, z);
    if (length > 36) {
      x = (x / length) * 36;
      z = (z / length) * 36;
    }
    setKnob({ x, z });
    onMove({ x: x / 36, z: z / 36 });
  }
  function stop() {
    setKnob({ x: 0, z: 0 });
    onMove({ x: 0, z: 0 });
  }
  return (
    <div
      className="joystick"
      aria-hidden="true"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          update(event);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
    >
      <span className="joystick-cross">＋</span>
      <i style={{ transform: `translate(${knob.x}px,${knob.z}px)` }} />
      <span className="joystick-label">慢慢走</span>
    </div>
  );
}
