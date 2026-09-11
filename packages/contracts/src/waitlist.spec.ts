import { createWaitlistEntrySchema } from './waitlist.js';

const VALID = {
  name: 'Victor',
  phone: '(21) 99999-9999',
  neighborhood: 'Engenho Novo',
  postalCode: '20720-000',
  petFoodDeclared: 'Golden Fórmula',
  source: 'CAMPAIGN',
  consent: true,
};

/** The field each rejection must point at, so the landing can place the error. */
const fieldOf = (body: unknown): string[] => {
  const result = createWaitlistEntrySchema.safeParse(body);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('createWaitlistEntrySchema', () => {
  it('accepts a filled-in form', () => {
    expect(createWaitlistEntrySchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts the optional pet food', () => {
    const { petFoodDeclared: _omitted, ...withoutFood } = VALID;

    expect(createWaitlistEntrySchema.safeParse(withoutFood).success).toBe(true);
  });

  it('rejects a landline', () => {
    expect(fieldOf({ ...VALID, phone: '2122223333' })).toEqual(['phone']);
  });

  it('rejects a CEP with seven digits', () => {
    expect(fieldOf({ ...VALID, postalCode: '2072000' })).toEqual(['postalCode']);
  });

  it('rejects a source outside the enum', () => {
    expect(fieldOf({ ...VALID, source: 'INSTAGRAM' })).toEqual(['source']);
  });

  it('rejects a form sent without consent', () => {
    expect(fieldOf({ ...VALID, consent: false })).toEqual(['consent']);
  });

  it('rejects a name of one character', () => {
    expect(fieldOf({ ...VALID, name: 'V' })).toEqual(['name']);
  });

  it('keeps input and output identical, so the OpenAPI types match', () => {
    const parsed = createWaitlistEntrySchema.parse(VALID);

    // No `.transform()` anywhere in the contract (pd-09, A11): the use case
    // normalises, the border only validates.
    expect(parsed).toEqual(VALID);
  });
});
