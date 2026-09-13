/** Where the onboarding sends the person next. `/conta` means "nothing left to do". */
export type OnboardingStep = '/conta/endereco' | '/conta/pets/novo' | '/conta';

/**
 * The next step of the onboarding, given what the account already has.
 *
 * A pure function, and the one piece of the onboarding that is unit-tested: the
 * screens have no render tests by decision (ADR-0012, A11), so the ordering
 * rule is worth holding somewhere a test can reach it.
 *
 * 🔴 The address comes before the pet because a pet hangs off the tutor
 * profile — `POST /tutors/me/pets` answers `TUTOR_NOT_FOUND` without one. The
 * order is not a preference about which screen is nicer to see first.
 *
 * Nothing here is blocking: every screen also offers "Fazer depois", and
 * `/conta` is usable with none of it filled in (ADR-0015, A11).
 */
export function nextOnboardingStep({
  hasProfile,
  petCount,
}: {
  hasProfile: boolean;
  petCount: number;
}): OnboardingStep {
  if (!hasProfile) {
    return '/conta/endereco';
  }

  return petCount === 0 ? '/conta/pets/novo' : '/conta';
}
