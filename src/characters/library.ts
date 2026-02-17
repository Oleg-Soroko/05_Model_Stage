import { loadFbxPackFromUrl } from "../loaders/fbxPackLoader";
import type {
  LoadedFbxPack,
  PackageKind,
  PackManifestItem,
  PacksManifest
} from "../types/assets";

export interface PackEntry {
  id: string;
  label: string;
  kind: PackageKind;
  source: "manifest" | "runtime";
  fbxUrl?: string;
  fileSizeBytes?: number;
}

export interface LoadedPackEntry {
  entry: PackEntry;
  pack: LoadedFbxPack;
}

async function resolveFileSizeBytesFromUrl(url: string): Promise<number | undefined> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    const header = head.headers.get("content-length");
    if (head.ok && header) {
      const parsed = Number(header);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    // Continue with fallback.
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 0) {
      return buffer.byteLength;
    }
  } catch {
    // best effort only
  }
  return undefined;
}

function normalizeManifestItem(item: PackManifestItem): PackEntry {
  return {
    id: item.id,
    label: item.label,
    kind: item.kind,
    source: "manifest",
    fbxUrl: item.fbxUrl
  };
}

export class CharacterLibrary {
  private readonly modelEntries: PackEntry[];
  private readonly clipEntries: PackEntry[];
  private readonly modelCache = new Map<string, LoadedFbxPack>();
  private readonly clipCache = new Map<string, LoadedFbxPack>();
  private readonly runtimeRevokers = new Map<string, () => void>();
  private runtimeCounter = 0;

  public constructor(manifest: PacksManifest) {
    this.modelEntries = manifest.modelPacks.map(normalizeManifestItem);
    this.clipEntries = manifest.clipPacks.map(normalizeManifestItem);
  }

  public getModelEntries(): PackEntry[] {
    return [...this.modelEntries];
  }

  public getClipEntries(): PackEntry[] {
    return [...this.clipEntries];
  }

  public getLoadedClipPacks(): LoadedPackEntry[] {
    const out: LoadedPackEntry[] = [];
    for (const entry of this.clipEntries) {
      const pack = this.clipCache.get(entry.id);
      if (pack) {
        out.push({ entry, pack });
      }
    }
    return out;
  }

  public async loadModelPack(id: string): Promise<LoadedPackEntry> {
    const entry = this.modelEntries.find((item) => item.id === id);
    if (!entry) {
      throw new Error(`Model pack "${id}" is not registered.`);
    }
    const pack = await this.loadEntry(entry, this.modelCache);
    return { entry, pack };
  }

  public async loadClipPack(id: string): Promise<LoadedPackEntry> {
    const entry = this.clipEntries.find((item) => item.id === id);
    if (!entry) {
      throw new Error(`Clip pack "${id}" is not registered.`);
    }
    const pack = await this.loadEntry(entry, this.clipCache);
    return { entry, pack };
  }

  public async preloadClipPacks(
    onError?: (entry: PackEntry, error: unknown) => void
  ): Promise<void> {
    for (const entry of this.clipEntries) {
      try {
        await this.loadClipPack(entry.id);
      } catch (error) {
        if (onError) {
          onError(entry, error);
        }
      }
    }
  }

  public registerRuntimePack(
    kind: PackageKind,
    label: string,
    pack: LoadedFbxPack,
    revoke: () => void,
    fileSizeBytes?: number
  ): PackEntry {
    const suffix = kind === "model_with_clip" ? "model" : "clip";
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const id = `runtime-${suffix}-${slug || "pack"}-${this.runtimeCounter++}`;

    const entry: PackEntry = {
      id,
      label,
      kind,
      source: "runtime",
      fileSizeBytes
    };

    if (kind === "model_with_clip") {
      this.modelEntries.push(entry);
      this.modelCache.set(id, pack);
    } else {
      this.clipEntries.push(entry);
      this.clipCache.set(id, pack);
    }

    this.runtimeRevokers.set(id, revoke);
    return entry;
  }

  public dispose(): void {
    for (const revoke of this.runtimeRevokers.values()) {
      revoke();
    }
    this.runtimeRevokers.clear();
    this.modelCache.clear();
    this.clipCache.clear();
  }

  private async loadEntry(
    entry: PackEntry,
    cache: Map<string, LoadedFbxPack>
  ): Promise<LoadedFbxPack> {
    const cached = cache.get(entry.id);
    if (cached) {
      return cached;
    }

    if (!entry.fbxUrl) {
      throw new Error(`Pack "${entry.id}" is missing fbxUrl.`);
    }

    if (entry.fileSizeBytes === undefined) {
      entry.fileSizeBytes = await resolveFileSizeBytesFromUrl(entry.fbxUrl);
    }

    const pack = await loadFbxPackFromUrl(entry.fbxUrl);
    cache.set(entry.id, pack);
    return pack;
  }
}
