import { describe, expect, it } from "vitest";
import { seededGuardians, seededIncoming, seededPlayers, getGuardian, getPlayer } from "./friendsDirectory";
import {
  acceptRequestFrom,
  cancelRequest,
  CODE_LENGTH,
  countFriends,
  createCode,
  emptyFriendsDocument,
  formatCode,
  getFriends,
  getPendingRequests,
  getSentRequests,
  isCompleteCode,
  normalizeCode,
  parseFriendsDocument,
  rejectRequestFrom,
  removeFriend,
  requestByCode,
  type FriendsDocument
} from "./friendsModel";

const roqui = seededPlayers[0];
const tunki = seededPlayers[1];

function documentWith(
  friendIds: string[],
  code: string | null = "ZZZZZZ",
  extra: Partial<FriendsDocument> = {}
): FriendsDocument {
  return { version: 1, code, friendIds, requestedIds: [], dismissedIds: [], ...extra };
}

/** Sends a request the way the screen does, and hands back the new document. */
function ask(document: FriendsDocument, code: string): FriendsDocument {
  return requestByCode(document, code, seededPlayers).document;
}

describe("typing a code", () => {
  it("forgives the way a child actually types", () => {
    expect(normalizeCode("rq 47 km")).toBe("RQ47KM");
    expect(normalizeCode("RQ-47-KM")).toBe("RQ47KM");
    expect(normalizeCode("  rq47km  ")).toBe("RQ47KM");
  });

  it("drops characters the alphabet never produces, rather than refusing the whole code", () => {
    // O/0 and I/1 are excluded because these get read out loud and copied by hand.
    expect(normalizeCode("RQ47KM!?")).toBe("RQ47KM");
    expect(normalizeCode("OIL")).toBe("L");
  });

  it("knows when there is enough to try", () => {
    expect(isCompleteCode("rq 47 km")).toBe(true);
    expect(isCompleteCode("RQ47K")).toBe(false);
    expect(isCompleteCode(null)).toBe(false);
  });

  it("groups a code so it can be dictated", () => {
    expect(formatCode("RQ47KM")).toBe("RQ4 7KM");
  });
});

describe("drawing your own code", () => {
  it("uses only characters that can be read aloud without ambiguity", () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const code = createCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(normalizeCode(code)).toBe(code);
    }
  });

  it("survives a broken random source instead of producing a short code", () => {
    expect(createCode(() => Number.NaN)).toHaveLength(CODE_LENGTH);
    expect(createCode(() => 1)).toHaveLength(CODE_LENGTH);
    expect(createCode(() => -5)).toHaveLength(CODE_LENGTH);
  });
});

describe("using someone's code", () => {
  /*
   * The rule the whole feature rests on: a code lets you knock. Landing on somebody's
   * list without their say-so is exactly what the code is not allowed to do.
   */
  it("sends a request instead of adding anybody", () => {
    const outcome = requestByCode(documentWith([]), roqui.code, seededPlayers);

    expect(outcome.result).toBe("requested");
    expect(outcome.alias).toBe("Roqui 47");
    expect(outcome.document.requestedIds).toEqual([roqui.id]);
    expect(outcome.document.friendIds).toEqual([]);
  });

  it("accepts the code however it was typed", () => {
    expect(requestByCode(documentWith([]), ` ${roqui.code.toLowerCase()} `, seededPlayers).result).toBe(
      "requested"
    );
  });

  it("says the code is unknown instead of failing silently", () => {
    const outcome = requestByCode(documentWith([]), "XKQ9WD", seededPlayers);

    expect(outcome.result).toBe("unknown");
    expect(outcome.document.requestedIds).toEqual([]);
  });

  it("waits for a whole code before judging it", () => {
    expect(requestByCode(documentWith([]), "RQ47", seededPlayers).result).toBe("incomplete");
  });

  /*
   * A child asking themselves would end up playing versus against themselves, which is a
   * puzzle they would have to work out alone.
   */
  it("refuses your own code", () => {
    expect(requestByCode(documentWith([], roqui.code), roqui.code, seededPlayers).result).toBe("self");
  });

  it("does not send the same request twice", () => {
    const once = ask(documentWith([]), roqui.code);
    const twice = requestByCode(once, roqui.code, seededPlayers);

    expect(twice.result).toBe("waiting");
    expect(twice.document.requestedIds).toEqual([roqui.id]);
  });

  it("says so when they are already a friend", () => {
    expect(requestByCode(documentWith([roqui.id]), roqui.code, seededPlayers).result).toBe("already");
  });

  it("lets a sent request be taken back", () => {
    const document = cancelRequest(ask(documentWith([]), roqui.code), roqui.id);

    expect(document.requestedIds).toEqual([]);
    expect(getSentRequests(document, seededPlayers)).toEqual([]);
  });
});

describe("the requests waiting for an answer", () => {
  it("shows whoever used this child's code", () => {
    const waiting = getPendingRequests(documentWith([]), seededIncoming, seededPlayers);

    expect(waiting.map((player) => player.id)).toEqual([...seededIncoming]);
  });

  it("adds them on yes", () => {
    const document = acceptRequestFrom(documentWith([]), "p-quri-08");

    expect(document.friendIds).toEqual(["p-quri-08"]);
    expect(getPendingRequests(document, seededIncoming, seededPlayers).map((p) => p.id)).toEqual([
      "p-wayra-23"
    ]);
  });

  /*
   * A "no" that lets the same request come back tomorrow is a button that does nothing.
   */
  it("remembers a no, so the request does not come back", () => {
    const document = rejectRequestFrom(documentWith([]), "p-quri-08");

    expect(document.friendIds).toEqual([]);
    expect(getPendingRequests(document, seededIncoming, seededPlayers).map((p) => p.id)).toEqual([
      "p-wayra-23"
    ]);
  });

  it("does not answer the same request twice", () => {
    const once = rejectRequestFrom(documentWith([]), "p-quri-08");

    expect(rejectRequestFrom(once, "p-quri-08")).toBe(once);
    expect(acceptRequestFrom(documentWith(["p-quri-08"]), "p-quri-08")).toEqual(documentWith(["p-quri-08"]));
  });

  it("lets a refusal be undone later by asking them", () => {
    const refused = rejectRequestFrom(documentWith([]), "p-quri-08");
    const asked = requestByCode(refused, seededPlayers[2].code, seededPlayers);

    expect(asked.result).toBe("requested");
  });

  it("ignores an incoming id that matches nobody", () => {
    expect(getPendingRequests(documentWith([]), ["p-nobody"], seededPlayers)).toEqual([]);
  });

  it("keeps the order friends were accepted in", () => {
    let document = acceptRequestFrom(documentWith([]), roqui.id);
    document = acceptRequestFrom(document, tunki.id);

    expect(getFriends(document, seededPlayers).map((player) => player.alias)).toEqual(["Roqui 47", "Tunki 12"]);
  });
});

describe("changing your mind", () => {
  it("removes a friend and leaves no trace, so the code works again later", () => {
    const document = removeFriend(documentWith([roqui.id, tunki.id]), roqui.id);

    expect(document.friendIds).toEqual([tunki.id]);
    expect(requestByCode(document, roqui.code, seededPlayers).result).toBe("requested");
  });

  it("leaves the list alone when there was nothing to remove", () => {
    const document = documentWith([tunki.id]);

    expect(removeFriend(document, roqui.id)).toBe(document);
  });

  it("counts only who is actually on the list", () => {
    expect(countFriends(documentWith([]))).toBe(0);
    expect(countFriends(documentWith([roqui.id, tunki.id]))).toBe(2);
  });

  it("skips a friend whose player no longer exists rather than rendering a hole", () => {
    expect(getFriends(documentWith([roqui.id, "p-vanished"]), seededPlayers)).toHaveLength(1);
  });
});

describe("what survives being written down", () => {
  it("falls back to an empty list rather than breaking on nonsense", () => {
    for (const bad of [null, 42, "friends", [], { version: 99 }]) {
      expect(parseFriendsDocument(bad)).toEqual(emptyFriendsDocument);
    }
  });

  it("drops a stored code that is not a real one", () => {
    expect(parseFriendsDocument({ version: 1, code: "OI1", friendIds: [] }).code).toBeNull();
  });

  it("drops unreadable ids and de-duplicates the rest", () => {
    const parsed = parseFriendsDocument({
      version: 1,
      code: "RQ47KM",
      friendIds: [roqui.id, roqui.id, 7, "", null]
    });

    expect(parsed.friendIds).toEqual([roqui.id]);
  });

  /*
   * The three lists can contradict each other only if something wrote them badly. Being a
   * friend is the later word, so it settles it rather than leaving a player in two states.
   */
  it("lets friendship settle a stored contradiction", () => {
    const parsed = parseFriendsDocument({
      version: 1,
      code: "RQ47KM",
      friendIds: [roqui.id],
      requestedIds: [roqui.id],
      dismissedIds: [roqui.id]
    });

    expect(parsed).toEqual({
      version: 1,
      code: "RQ47KM",
      friendIds: [roqui.id],
      requestedIds: [],
      dismissedIds: []
    });
  });

  it("round-trips a real document unchanged", () => {
    const document = {
      version: 1,
      code: "RQ47KM",
      friendIds: [roqui.id],
      requestedIds: [tunki.id],
      dismissedIds: ["p-quri-08"]
    };

    expect(parseFriendsDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });
});

describe("the privacy the directory promises", () => {
  /*
   * The architecture commits to this in writing: a child is an alias, never a real name,
   * an age or a school. Held to it here so a screen cannot break the promise quietly.
   */
  it("names every player with a generated alias and a number", () => {
    for (const player of seededPlayers) {
      expect(player.alias).toMatch(/^[A-Z][a-zá-ú]+ \d{2}$/);
    }
  });

  it("carries no field that could identify a child", () => {
    for (const player of seededPlayers) {
      expect(Object.keys(player).sort()).toEqual(["alias", "code", "guardianId", "id"]);
    }
  });

  it("gives every player a code that can actually be typed in", () => {
    for (const player of seededPlayers) {
      expect(normalizeCode(player.code), player.alias).toBe(player.code);
      expect(isCompleteCode(player.code), player.alias).toBe(true);
    }
  });

  it("gives no two players the same code", () => {
    const codes = seededPlayers.map((player) => player.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("describes each grown-up by role only, never as a person", () => {
    for (const guardian of seededGuardians) {
      expect(Object.keys(guardian).sort()).toEqual(["id", "role"]);
      expect(["parent", "teacher"]).toContain(guardian.role);
    }
  });

  it("hangs every child off a grown-up, as the database would require", () => {
    for (const player of seededPlayers) {
      expect(getGuardian(player.guardianId), player.alias).toBeDefined();
    }
  });

  it("finds a player by id and nothing by a made-up one", () => {
    expect(getPlayer(roqui.id)?.alias).toBe("Roqui 47");
    expect(getPlayer("p-nobody")).toBeUndefined();
  });
});
