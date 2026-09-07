import { applyBasisPoints, InvalidMoneyOperationError } from './money';

describe('applyBasisPoints', () => {
  it('returns zero for a zero rate', () => {
    expect(applyBasisPoints(19_990, 0)).toBe(0);
  });

  it('returns the whole amount for 10000 bps', () => {
    expect(applyBasisPoints(19_990, 10_000)).toBe(19_990);
  });

  it('applies a fractional rate', () => {
    expect(applyBasisPoints(19_990, 850)).toBe(1699);
  });

  it('rounds half up, away from zero', () => {
    expect(applyBasisPoints(1, 5_000)).toBe(1);
    expect(applyBasisPoints(3, 5_000)).toBe(2);
    expect(applyBasisPoints(-1, 5_000)).toBe(-1);
  });

  it('rounds down below the half cent', () => {
    expect(applyBasisPoints(1, 4_999)).toBe(0);
  });

  it('rejects non-integer inputs', () => {
    expect(() => applyBasisPoints(10.5, 100)).toThrow(InvalidMoneyOperationError);
    expect(() => applyBasisPoints(10, 100.5)).toThrow(InvalidMoneyOperationError);
  });

  it('rejects negative rates', () => {
    expect(() => applyBasisPoints(10, -1)).toThrow(InvalidMoneyOperationError);
  });

  it('rejects amounts that overflow the safe integer range', () => {
    expect(() => applyBasisPoints(Number.MAX_SAFE_INTEGER, 10_000)).toThrow(
      InvalidMoneyOperationError,
    );
  });
});
