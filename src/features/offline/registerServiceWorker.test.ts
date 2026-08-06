import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canRegisterServiceWorker,
  registerServiceWorker,
  requestPersistentStorage,
  SERVICE_WORKER_URL,
  unregisterServiceWorkers
} from "./registerServiceWorker";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preparing the game to open without a signal", () => {
  it("does nothing on a browser that has no service workers", () => {
    vi.stubGlobal("navigator", {});

    expect(canRegisterServiceWorker()).toBe(false);
  });

  it("registers the worker at the root, so every page of the game is covered", async () => {
    const register = vi.fn().mockResolvedValue({});
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    await expect(registerServiceWorker()).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: "/" });
  });

  it("keeps playing when registration is refused", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: {
        register: () => Promise.reject(new Error("blocked in private mode"))
      }
    });

    await expect(registerServiceWorker()).resolves.toBe(false);
  });

  it("reports honestly when there is no service worker support at all", async () => {
    vi.stubGlobal("navigator", {});

    await expect(registerServiceWorker()).resolves.toBe(false);
  });
});

describe("asking the browser to keep the progress", () => {
  it("reports that the browser cannot be asked, rather than claiming success", async () => {
    vi.stubGlobal("navigator", {});

    await expect(requestPersistentStorage()).resolves.toBeNull();
  });

  it("does not ask again once the storage is already persisted", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persist, persisted: () => Promise.resolve(true) } });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("asks when nothing has been granted yet", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persist, persisted: () => Promise.resolve(false) } });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("treats a refusal as a refusal and carries on", async () => {
    vi.stubGlobal("navigator", {
      storage: { persist: () => Promise.resolve(false), persisted: () => Promise.resolve(false) }
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("never throws when the browser errors mid-request", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        persist: () => Promise.reject(new Error("nope")),
        persisted: () => Promise.resolve(false)
      }
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});

describe("clearing a worker left behind by another build", () => {
  it("unregisters everything it finds and drops the caches with it", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations: () => Promise.resolve([{ unregister }, { unregister }]) }
    });
    vi.stubGlobal("caches", { keys: () => Promise.resolve(["kikiria-v1"]), delete: remove });

    await expect(unregisterServiceWorkers()).resolves.toBe(2);
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith("kikiria-v1");
  });

  it("reports nothing to clear on a browser without service workers", async () => {
    vi.stubGlobal("navigator", {});

    await expect(unregisterServiceWorkers()).resolves.toBe(0);
  });

  it("never throws when the browser refuses", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistrations: () => Promise.reject(new Error("nope")) }
    });

    await expect(unregisterServiceWorkers()).resolves.toBe(0);
  });
});
