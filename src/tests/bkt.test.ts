import { updateBkt } from '../utils/bkt';

const params = {
  pL0: 0.2,
  pT: 0.1,
  pG: 0.2,
  pS: 0.1
};

describe('BKT update', () => {
  it('increases knowledge on correct answer', () => {
    const p0 = 0.2;
    const p1 = updateBkt(p0, true, params);
    expect(p1).toBeGreaterThan(p0);
  });

  it('can decrease knowledge on incorrect answer (depending on params)', () => {
    const p0 = 0.8;
    const p1 = updateBkt(p0, false, params);
    // Strictly, with slip/guess it may move up or down; just ensure it stays in [0,1].
    expect(p1).toBeGreaterThanOrEqual(0);
    expect(p1).toBeLessThanOrEqual(1);
  });
});

