import { createPetSchema, updatePetSchema, upsertTutorProfileSchema } from './tutors.js';

const VALID_ADDRESS = {
  street: 'Rua Dias da Cruz',
  number: '100',
  neighborhood: 'Méier',
  postalCode: '20720-000',
};

const VALID_PROFILE = {
  name: 'Victor',
  phone: '(21) 99999-0001',
  address: VALID_ADDRESS,
};

const VALID_PET = {
  name: 'Thor',
  species: 'DOG',
  birthDate: '2021-03-12',
  weightGrams: 12_500,
};

/**
 * The distinct fields a rejection points at, so the client can place the error.
 *
 * Distinct because one field can raise twice — `birthDate` fails the ISO shape
 * *and* the "not in the future" refinement — and the screen indexes its errors
 * by field either way.
 */
const fieldOf = (schema: { safeParse: (value: unknown) => unknown }, body: unknown): string[] => {
  const result = schema.safeParse(body) as
    { success: true } | { success: false; error: { issues: { path: (string | number)[] }[] } };

  return result.success
    ? []
    : [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
};

describe('upsertTutorProfileSchema', () => {
  it('accepts a complete profile', () => {
    expect(upsertTutorProfileSchema.safeParse(VALID_PROFILE).success).toBe(true);
  });

  it('accepts the CEP hyphenated and bare alike — normalising is the use case', () => {
    expect(upsertTutorProfileSchema.safeParse(VALID_PROFILE).success).toBe(true);
    expect(
      upsertTutorProfileSchema.safeParse({
        ...VALID_PROFILE,
        address: { ...VALID_ADDRESS, postalCode: '20720000' },
      }).success,
    ).toBe(true);
  });

  it('points at the nested field of a bad CEP', () => {
    expect(
      fieldOf(upsertTutorProfileSchema, {
        ...VALID_PROFILE,
        address: { ...VALID_ADDRESS, postalCode: '2072' },
      }),
    ).toEqual(['address.postalCode']);
  });

  it('rejects a landline — the platform reaches people on a mobile', () => {
    expect(fieldOf(upsertTutorProfileSchema, { ...VALID_PROFILE, phone: '2133334444' })).toEqual([
      'phone',
    ]);
  });

  it('requires street, number, neighbourhood and CEP', () => {
    const { street: _street, ...withoutStreet } = VALID_ADDRESS;

    expect(fieldOf(upsertTutorProfileSchema, { ...VALID_PROFILE, address: withoutStreet })).toEqual(
      ['address.street'],
    );

    expect(
      fieldOf(upsertTutorProfileSchema, {
        ...VALID_PROFILE,
        address: { ...VALID_ADDRESS, number: '' },
      }),
    ).toEqual(['address.number']);
  });

  it('accepts an address with no complement and no reference', () => {
    expect(upsertTutorProfileSchema.parse(VALID_PROFILE).address.complement).toBeUndefined();
  });

  it('rejects a name of one character', () => {
    expect(fieldOf(upsertTutorProfileSchema, { ...VALID_PROFILE, name: 'V' })).toEqual(['name']);
  });
});

describe('createPetSchema', () => {
  it('accepts a pet with every field', () => {
    expect(createPetSchema.safeParse(VALID_PET).success).toBe(true);
  });

  it('accepts a pet whose birth date nobody knows', () => {
    const { birthDate: _birthDate, ...withoutBirthDate } = VALID_PET;

    expect(createPetSchema.safeParse(withoutBirthDate).success).toBe(true);
    expect(createPetSchema.safeParse({ ...VALID_PET, birthDate: null }).success).toBe(true);
  });

  it('rejects a species outside the enum', () => {
    expect(fieldOf(createPetSchema, { ...VALID_PET, species: 'BIRD' })).toEqual(['species']);
  });

  it('rejects a weight of zero and a fractional gram', () => {
    expect(fieldOf(createPetSchema, { ...VALID_PET, weightGrams: 0 })).toEqual(['weightGrams']);
    expect(fieldOf(createPetSchema, { ...VALID_PET, weightGrams: 12.5 })).toEqual(['weightGrams']);
  });

  it('rejects a weight outside the plausible bounds', () => {
    expect(fieldOf(createPetSchema, { ...VALID_PET, weightGrams: 99 })).toEqual(['weightGrams']);
    expect(fieldOf(createPetSchema, { ...VALID_PET, weightGrams: 120_001 })).toEqual([
      'weightGrams',
    ]);
  });

  it('rejects a birth date in the future', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    expect(fieldOf(createPetSchema, { ...VALID_PET, birthDate: tomorrow })).toEqual(['birthDate']);
  });

  it('rejects a date that matches the shape but not the calendar', () => {
    expect(fieldOf(createPetSchema, { ...VALID_PET, birthDate: '2021-02-31' })).toEqual([
      'birthDate',
    ]);
  });

  it('rejects the Brazilian spelling — the screen converts before sending', () => {
    expect(fieldOf(createPetSchema, { ...VALID_PET, birthDate: '12/03/2021' })).toEqual([
      'birthDate',
    ]);
  });

  it('keeps input and output identical, so the OpenAPI types match', () => {
    expect(createPetSchema.parse(VALID_PET)).toEqual(VALID_PET);
  });
});

describe('updatePetSchema', () => {
  it('accepts a single field', () => {
    expect(updatePetSchema.safeParse({ weightGrams: 13_000 }).success).toBe(true);
  });

  it('🔴 refuses an empty body — a request that asks for nothing is a client bug', () => {
    expect(updatePetSchema.safeParse({}).success).toBe(false);
  });

  it('still applies every rule of the field it does carry', () => {
    expect(fieldOf(updatePetSchema, { weightGrams: 0 })).toEqual(['weightGrams']);
    expect(fieldOf(updatePetSchema, { species: 'BIRD' })).toEqual(['species']);
  });
});
