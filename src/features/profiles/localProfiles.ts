import { initialProgressState, parseProgressState, type ProgressState } from "@/features/progress/progressState";

/**
 * The player of this device, wrapped in a document that could hold more.
 *
 * The shape keeps a list rather than a single record on purpose: it is what lets the
 * stored file grow into several players later without another migration, and it is the
 * same shape the cloud would sync. Today exactly one profile is ever created.
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

export const PROFILES_VERSION = 1;

export const emptyProfilesDocument: ProfilesDocument = {
  version: PROFILES_VERSION,
  activeId: null,
  profiles: []
};

/** A ceiling so a loop or a corrupt file cannot fill the device, never a product rule. */
const MAX_STORED_PROFILES = 50;

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
  for (let index = 1; index <= existingIds.length + 1; index += 1) {
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

/**
 * Steps away without erasing anything.
 *
 * A child has no email, so their nickname is who they are on this phone. Leaving has to
 * keep that: the profile stays in the list and simply stops being the one playing, which
 * is what lets two siblings share a device without either losing a medal.
 */
export function leaveActiveProfile(document: ProfilesDocument): ProfilesDocument {
  return document.activeId === null ? document : { ...document, activeId: null };
}

/** Picks up a saved profile again. An id nobody has is ignored rather than guessed at. */
export function selectProfile(document: ProfilesDocument, id: string): ProfilesDocument {
  if (!document.profiles.some((profile) => profile.id === id)) return document;
  return { ...document, activeId: id };
}

/** The saved players, in the order they were created, for a "who is playing?" list. */
export function listProfiles(document: ProfilesDocument): LocalProfile[] {
  return document.profiles.filter((profile) => profile.progress.localNickname !== null);
}

/** Forgets a player entirely, medals included. Only ever asked for on purpose. */
export function removeProfile(document: ProfilesDocument, id: string): ProfilesDocument {
  const profiles = document.profiles.filter((profile) => profile.id !== id);
  if (profiles.length === document.profiles.length) return document;
  return { ...document, activeId: document.activeId === id ? null : document.activeId, profiles };
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
      if (!profile || seen.has(profile.id) || profiles.length >= MAX_STORED_PROFILES) continue;
      seen.add(profile.id);
      profiles.push(profile);
    }
    if (profiles.length > 0) {
      /*
       * Nobody playing is a real state, not a fault to be repaired.
       *
       * A child who hands the phone over leaves their profile behind and expects to find
       * it again; snapping the first one back into play would put the next person inside
       * somebody else's game. An explicit null is honoured, and only an unreadable value
       * falls back to the first profile.
       */
      const activeId = value.activeId === null
        ? null
        : isProfileId(value.activeId) && seen.has(value.activeId)
          ? value.activeId
          : profiles[0].id;
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
