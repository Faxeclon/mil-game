import { initialProgressState, parseProgressState, type ProgressState } from "@/features/progress/progressState";

/**
 * Several children sharing one phone.
 *
 * Where this game is going, one phone per family is the norm, so two siblings playing the
 * same app is the ordinary case rather than an edge case. Each of them gets their own
 * progress, medals and streak; none of it leaves the device and no account is involved.
 *
 * A profile is simply a progress state with an id: the nickname and apprentice already
 * live inside it, so nothing about a player is stored twice.
 */
export type LocalProfile = {
  id: string;
  progress: ProgressState;
};

export type ProfilesDocument = {
  version: 1;
  /** The profile currently playing, or null when nobody has been chosen yet. */
  activeId: string | null;
  profiles: LocalProfile[];
};

/**
 * A ceiling against runaway growth, not a rule about families.
 *
 * How many children share a phone is not ours to decide, so nothing in the interface
 * counts down towards this. It exists only so a loop or a corrupt file cannot fill the
 * device: each profile weighs about two kilobytes, and this leaves the total far under
 * any storage a browser offers.
 */
export const MAX_LOCAL_PROFILES = 50;

export const PROFILES_VERSION = 1;

export const emptyProfilesDocument: ProfilesDocument = {
  version: PROFILES_VERSION,
  activeId: null,
  profiles: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const profileIdPattern = /^player-\d+$/;

export function isProfileId(value: unknown): value is string {
  return typeof value === "string" && profileIdPattern.test(value);
}

/** Ids are counted, not random: no crypto is needed and every test reads the same. */
export function createProfileId(existingIds: readonly string[]): string {
  const used = new Set(existingIds);
  for (let index = 1; index <= MAX_LOCAL_PROFILES + existingIds.length + 1; index += 1) {
    const candidate = `player-${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `player-${existingIds.length + 1}`;
}

export function getActiveProfile(document: ProfilesDocument): LocalProfile | undefined {
  return document.profiles.find((profile) => profile.id === document.activeId);
}

export function getActiveProgress(document: ProfilesDocument): ProgressState {
  return getActiveProfile(document)?.progress ?? initialProgressState;
}

export function canAddProfile(document: ProfilesDocument): boolean {
  return document.profiles.length < MAX_LOCAL_PROFILES;
}

/** How many can still be added, for a screen that needs to know it is near the ceiling. */
export function remainingProfileSlots(document: ProfilesDocument): number {
  return Math.max(0, MAX_LOCAL_PROFILES - document.profiles.length);
}

/** Adds an empty profile and hands the phone to it straight away. */
export function addProfile(document: ProfilesDocument): ProfilesDocument {
  if (!canAddProfile(document)) return document;
  const id = createProfileId(document.profiles.map((profile) => profile.id));
  return {
    ...document,
    activeId: id,
    profiles: [...document.profiles, { id, progress: initialProgressState }]
  };
}

export function selectProfile(document: ProfilesDocument, id: string): ProfilesDocument {
  if (document.activeId === id) return document;
  if (!document.profiles.some((profile) => profile.id === id)) return document;
  return { ...document, activeId: id };
}

/**
 * Removes a profile with everything in it. The last profile cannot be removed here:
 * emptying the phone entirely is what the reset action is for, and it asks first.
 */
export function removeProfile(document: ProfilesDocument, id: string): ProfilesDocument {
  if (document.profiles.length <= 1) return document;
  const profiles = document.profiles.filter((profile) => profile.id !== id);
  if (profiles.length === document.profiles.length) return document;
  return {
    ...document,
    profiles,
    activeId: document.activeId === id ? profiles[0].id : document.activeId
  };
}

/** Writes the active player's progress back, leaving every other profile untouched. */
export function updateActiveProgress(document: ProfilesDocument, progress: ProgressState): ProfilesDocument {
  const active = getActiveProfile(document);
  if (!active) {
    const id = createProfileId(document.profiles.map((profile) => profile.id));
    return { ...document, activeId: id, profiles: [...document.profiles, { id, progress }] };
  }
  if (active.progress === progress) return document;
  return {
    ...document,
    profiles: document.profiles.map((profile) =>
      profile.id === active.id ? { ...profile, progress } : profile
    )
  };
}

function parseProfile(value: unknown): LocalProfile | undefined {
  if (!isRecord(value) || !isProfileId(value.id)) return undefined;
  return { id: value.id, progress: parseProgressState(value.progress) };
}

/**
 * Rebuilds the profiles from stored data.
 *
 * A device that only ever had one player carries a bare progress state; it becomes that
 * player's profile rather than being thrown away, so nobody loses medals to an upgrade.
 */
export function parseProfilesDocument(value: unknown, legacyProgress?: unknown): ProfilesDocument {
  if (isRecord(value) && value.version === PROFILES_VERSION && Array.isArray(value.profiles)) {
    const profiles: LocalProfile[] = [];
    const seen = new Set<string>();
    for (const entry of value.profiles) {
      const profile = parseProfile(entry);
      if (!profile || seen.has(profile.id) || profiles.length >= MAX_LOCAL_PROFILES) continue;
      seen.add(profile.id);
      profiles.push(profile);
    }
    if (profiles.length > 0) {
      const activeId = isProfileId(value.activeId) && seen.has(value.activeId) ? value.activeId : profiles[0].id;
      return { version: PROFILES_VERSION, activeId, profiles };
    }
  }

  if (legacyProgress !== undefined) {
    const progress = parseProgressState(legacyProgress);
    // Only a device that actually played gets a migrated profile; a blank one starts fresh.
    if (progress.completedLevelIds.length > 0 || progress.onboarded === true || progress.localNickname) {
      return { version: PROFILES_VERSION, activeId: "player-1", profiles: [{ id: "player-1", progress }] };
    }
  }

  return emptyProfilesDocument;
}
