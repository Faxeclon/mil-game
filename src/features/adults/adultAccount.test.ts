import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADULTS_STORAGE_KEY,
  createAdultAccount,
  emptyAdultsDocument,
  findAdultByEmail,
  forgetAdult,
  getActiveAdult,
  getAdultHome,
  getAdultPlayName,
  isFamily,
  isTeacher,
  LEGACY_ADULT_STORAGE_KEY,
  LEGACY_TEACHER_STORAGE_KEY,
  normalizeAdultEmail,
  parseAdultAccount,
  parseAdultsDocument,
  readAdultsDocument,
  registerAdultAccount,
  signInAdult,
  signOutActiveAdult,
  writeAdultsDocument,
  type AdultsDocument
} from "./adultAccount";

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    }
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A device that already knows one teacher and one parent. */
function knownDevice(): AdultsDocument {
  let document = emptyAdultsDocument;
  document = registerAdultAccount(document, "rosa@example.com", "teacher", "2026-08-01").document;
  document = registerAdultAccount(document, "marta@example.com", "family", "2026-08-02").document;
  return document;
}

describe("one account, two roles", () => {
  it("keeps the role the grown-up chose", () => {
    expect(createAdultAccount("rosa@example.com", "teacher", "2026-08-08")?.role).toBe("teacher");
    expect(createAdultAccount("marta@example.com", "family", "2026-08-08")?.role).toBe("family");
  });

  it("refuses a role nobody offers", () => {
    expect(createAdultAccount("rosa@example.com", "principal", "2026-08-08")).toBeNull();
    expect(createAdultAccount("rosa@example.com", undefined, "2026-08-08")).toBeNull();
  });

  /*
   * The address is never checked because there is no server to check it with. Pretending
   * otherwise would imply a confirmation mail that never left.
   */
  it("takes the address as typed, only refusing nothing at all", () => {
    expect(normalizeAdultEmail("  Rosa@Example.COM ")).toBe("rosa@example.com");
    expect(normalizeAdultEmail("   ")).toBeNull();
    expect(normalizeAdultEmail("a".repeat(255))).toBeNull();
    expect(normalizeAdultEmail(42)).toBeNull();
  });

  it("answers which kind of grown-up is holding the device", () => {
    const document = knownDevice();

    expect(isTeacher(findAdultByEmail(document, "rosa@example.com"))).toBe(true);
    expect(isFamily(findAdultByEmail(document, "marta@example.com"))).toBe(true);
    expect(isTeacher(null)).toBe(false);
    expect(isFamily(null)).toBe(false);
  });
});

/*
 * The rule the whole app leans on: signing in adds a door, it never takes one away. Every
 * shared screen asks these two, so a parent is exactly as visible as a teacher.
 */
describe("what signing in adds", () => {
  it("sends each kind of grown-up to their own tools", () => {
    const document = knownDevice();

    expect(getAdultHome(findAdultByEmail(document, "rosa@example.com"))).toBe("/teacher");
    expect(getAdultHome(findAdultByEmail(document, "marta@example.com"))).toBe("/adult");
  });

  it("offers nowhere when nobody is signed in, so no screen invents a door", () => {
    expect(getAdultHome(null)).toBeNull();
    expect(getAdultPlayName(null)).toBeNull();
  });

  /*
   * They answered "who are you" with their address, so asking again with a nickname form
   * would be the same question twice. The name comes from what they already typed.
   */
  it("plays them under the name they already gave", () => {
    const document = knownDevice();

    expect(getAdultPlayName(findAdultByEmail(document, "rosa@example.com"))).toBe("rosa");
  });

  it("still finds a name when the address has no local part to take", () => {
    const { found } = registerAdultAccount(emptyAdultsDocument, "@example.com", "family", "2026-08-08");

    expect(getAdultPlayName(found)).toBe("@example.com");
  });
});

describe("signing in with nothing but an address", () => {
  /*
   * The whole point of keeping accounts: the device already knows the role, so asking for
   * it again would be asking a question we can answer ourselves.
   */
  it("brings the role back without asking for it", () => {
    const parked = signOutActiveAdult(knownDevice());

    const { document, found } = signInAdult(parked, "rosa@example.com");

    expect(found?.role).toBe("teacher");
    expect(getActiveAdult(document)?.email).toBe("rosa@example.com");
  });

  it("forgives the case and the spaces around it", () => {
    const parked = signOutActiveAdult(knownDevice());

    expect(signInAdult(parked, "  MARTA@Example.com ").found?.role).toBe("family");
  });

  /*
   * An address nobody has seen cannot be signed in as. Creating an account and picking a
   * role on their behalf would hand somebody tools they never asked for.
   */
  it("refuses an address this device has never seen", () => {
    const parked = signOutActiveAdult(knownDevice());

    const { document, found } = signInAdult(parked, "nadie@example.com");

    expect(found).toBeNull();
    expect(getActiveAdult(document)).toBeNull();
  });
});

describe("signing out", () => {
  it("keeps the account, so signing back in needs only the address", () => {
    const parked = signOutActiveAdult(knownDevice());

    expect(getActiveAdult(parked)).toBeNull();
    expect(parked.accounts).toHaveLength(2);
    expect(signInAdult(parked, "rosa@example.com").found).not.toBeNull();
  });

  it("does nothing when nobody was signed in", () => {
    const parked = signOutActiveAdult(knownDevice());

    expect(signOutActiveAdult(parked)).toBe(parked);
  });

  it("forgets a grown-up for good only when asked", () => {
    const document = forgetAdult(knownDevice(), "rosa@example.com");

    expect(document.accounts.map((account) => account.email)).toEqual(["marta@example.com"]);
    expect(signInAdult(document, "rosa@example.com").found).toBeNull();
  });
});

describe("registering", () => {
  it("signs the grown-up in as well", () => {
    const { document } = registerAdultAccount(emptyAdultsDocument, "rosa@example.com", "teacher", "2026-08-08");

    expect(getActiveAdult(document)?.email).toBe("rosa@example.com");
  });

  it("does not store the same address twice when the role changes", () => {
    let document = knownDevice();
    document = registerAdultAccount(document, "rosa@example.com", "family", "2026-08-08").document;

    expect(document.accounts).toHaveLength(2);
    expect(findAdultByEmail(document, "rosa@example.com")?.role).toBe("family");
  });

  it("marks a fresh registration as not yet sent anywhere", () => {
    expect(createAdultAccount("rosa@example.com", "teacher", "2026-08-08")?.syncPending).toBe(true);
  });
});

describe("what survives being written down", () => {
  it("falls back to nobody rather than breaking on nonsense", () => {
    for (const bad of [null, 42, "adults", [], { version: 9, accounts: [] }]) {
      expect(parseAdultsDocument(bad)).toEqual(emptyAdultsDocument);
    }
  });

  /*
   * Records written before roles existed could only have come from the classroom screen,
   * so they are teachers. Guessing "family" would hand somebody a stranger's tools.
   */
  it("treats a record with no role as the teacher it must have been", () => {
    expect(parseAdultAccount({ email: "rosa@example.com", registeredOn: "2026-08-01" })?.role).toBe("teacher");
  });

  it("drops an active address that matches nobody", () => {
    const parsed = parseAdultsDocument({
      version: 1,
      activeEmail: "ghost@example.com",
      accounts: [{ email: "rosa@example.com", role: "teacher", registeredOn: "2026-08-01" }]
    });

    expect(parsed.activeEmail).toBeNull();
    expect(parsed.accounts).toHaveLength(1);
  });

  it("round-trips a real document unchanged", () => {
    const document = knownDevice();

    expect(parseAdultsDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });
});

describe("the grown-up who registered before any of this existed", () => {
  it("is still a teacher after the account learned about roles", () => {
    stubStorage({
      [LEGACY_TEACHER_STORAGE_KEY]: JSON.stringify({ email: "rosa@example.com", registeredOn: "2026-08-01" })
    });

    expect(getActiveAdult(readAdultsDocument())).toMatchObject({ email: "rosa@example.com", role: "teacher" });
  });

  it("is carried across from the single-account file too", () => {
    stubStorage({
      [LEGACY_ADULT_STORAGE_KEY]: JSON.stringify({
        email: "marta@example.com",
        role: "family",
        registeredOn: "2026-08-05"
      })
    });

    expect(getActiveAdult(readAdultsDocument())).toMatchObject({ email: "marta@example.com", role: "family" });
  });

  /*
   * The old keys have to go on the first write, or a later read could resurrect an account
   * somebody already replaced.
   */
  it("stops reading the old records once it has taken them over", () => {
    const store = stubStorage({
      [LEGACY_TEACHER_STORAGE_KEY]: JSON.stringify({ email: "rosa@example.com", registeredOn: "2026-08-01" })
    });

    readAdultsDocument();

    expect(store.get(ADULTS_STORAGE_KEY)).toBeDefined();
    expect(store.get(LEGACY_TEACHER_STORAGE_KEY)).toBeUndefined();
  });

  it("survives a device with no storage at all", () => {
    vi.stubGlobal("window", undefined);

    expect(readAdultsDocument()).toEqual(emptyAdultsDocument);
    expect(() => writeAdultsDocument(emptyAdultsDocument)).not.toThrow();
  });
});
