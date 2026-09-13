import { nextOnboardingStep } from './next-step';

describe('nextOnboardingStep', () => {
  it('asks for the address first — a pet cannot exist without a profile', () => {
    expect(nextOnboardingStep({ hasProfile: false, petCount: 0 })).toBe('/conta/endereco');
  });

  it('asks for the first pet once the profile is there', () => {
    expect(nextOnboardingStep({ hasProfile: true, petCount: 0 })).toBe('/conta/pets/novo');
  });

  it('is finished once there is a profile and a pet', () => {
    expect(nextOnboardingStep({ hasProfile: true, petCount: 1 })).toBe('/conta');
  });

  it('🔴 still asks for the address even if pets somehow exist', () => {
    // Cannot happen through the API — the pet hangs off the tutor — but the
    // ordering must not depend on that being true, or a stale count would send
    // someone to a form that answers TUTOR_NOT_FOUND.
    expect(nextOnboardingStep({ hasProfile: false, petCount: 3 })).toBe('/conta/endereco');
  });
});
