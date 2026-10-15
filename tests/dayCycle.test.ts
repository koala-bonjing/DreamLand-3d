import { describe, expect, it } from 'vitest';
import { DayCycle } from '../src/world/dayCycle';

describe('DayCycle System', () => {
  it('initializes and wraps 80s cycle properly', () => {
    const cycle = new DayCycle(0);
    expect(cycle.getTime()).toBe(0);
    expect(cycle.getProgress()).toBe(0);

    cycle.update(40);
    expect(cycle.getProgress()).toBeCloseTo(0.5, 2);

    cycle.update(40);
    expect(cycle.getProgress()).toBeCloseTo(0.0, 2);
  });

  it('cycles through day, dusk, night, and dawn smoothly', () => {
    const cycle = new DayCycle();

    // Noon (day)
    cycle.setTime(20);
    expect(cycle.current.dirIntensity).toBe(0.8);

    // Sunset / Dusk
    cycle.setTime(41); // progress ~ 0.51
    expect(cycle.current.dirIntensity).toBeLessThan(0.8);
    expect(cycle.current.dirColor.getHexString()).toBe('fda57d');

    // Midnight
    cycle.setTime(60); // progress ~ 0.75
    expect(cycle.current.dirIntensity).toBe(0.2);
  });
});
