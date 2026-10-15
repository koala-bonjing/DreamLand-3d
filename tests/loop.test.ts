import { describe, expect, it } from 'vitest';
import { EngineLoop } from '../src/core/loop';

describe('EngineLoop Simulation', () => {
  it('instantiates loop with defaults and supports step configuration', () => {
    let updateCount = 0;
    let renderCount = 0;

    const loop = new EngineLoop({
      fixedTimestep: 1 / 60,
      maxSubSteps: 5,
      fpsCap: 30,
      onUpdate: () => {
        updateCount++;
      },
      onRender: () => {
        renderCount++;
      }
    });

    expect(loop).toBeDefined();
    expect(updateCount).toBe(0);
    expect(renderCount).toBe(0);
    loop.dispose();
  });

  it('allows dynamic adjustment of fps cap', () => {
    const loop = new EngineLoop({
      onUpdate: () => {},
      onRender: () => {}
    });

    expect(() => loop.setFpsCap(60)).not.toThrow();
    expect(() => loop.setFpsCap(0)).not.toThrow();
    loop.dispose();
  });
});
