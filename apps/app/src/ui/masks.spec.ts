import { formatPostalCode } from '@petdots/domain';

import { applyMask } from './masks';

const typing = (current: string, next: string) => applyMask(current, next, formatPostalCode);

describe('applyMask', () => {
  it('formats as the person types', () => {
    expect(typing('2072', '20720')).toBe('20720');
    expect(typing('20720', '207200')).toBe('20720-0');
  });

  it('🔴 backspacing over the separator deletes a digit, not nothing', () => {
    // The field shows `20720-0`; the person hits backspace twice. The first
    // press lands on the `0`, the second on the `-`. Without this, the second
    // press would re-add the hyphen and the caret would sit there forever.
    expect(typing('20720-0', '20720-')).toBe('20720');
    expect(typing('20720', '2072')).toBe('2072');
  });

  it('leaves a normal deletion alone', () => {
    // Digits changed, so the person deleted a digit — nothing to compensate.
    expect(typing('20720-000', '20720-00')).toBe('20720-00');
  });

  it('empties cleanly', () => {
    expect(typing('2', '')).toBe('');
  });

  it('masks a value pasted in one go', () => {
    expect(typing('', '20720000')).toBe('20720-000');
    expect(typing('', '20.720-000')).toBe('20720-000');
  });
});
