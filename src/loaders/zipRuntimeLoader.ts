import JSZip from "jszip";
import type { LoadedFbxPack, ParsedZipAsset } from "../types/assets";
import {
  detectPackageKind,
  loadFbxPackFromBlobMap,
  normalizeAssetKey
} from "./fbxPackLoader";

export interface RuntimeZipLoadResult {
  parsed: ParsedZipAsset;
  pack: LoadedFbxPack;
  revoke: () => void;
}

const TEXTURE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".tga",
  ".tif",
  ".tiff"
]);

function extensionToMime(extension: string): string {
  switch (extension) {
    case ".fbx":
      return "application/octet-stream";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".tga":
      return "image/x-tga";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
}

function getExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

function trimExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) {
    return fileName;
  }
  return fileName.slice(0, dot);
}

export async function parseRuntimeZipAsset(file: File): Promise<RuntimeZipLoadResult> {
  const urlsToRevoke = new Set<string>();
  try {
    const zip = await JSZip.loadAsync(file);
    const allEntries = Object.values(zip.files).filter((entry) => !entry.dir);
    const fbxEntries = allEntries.filter((entry) => getExtension(entry.name) === ".fbx");

    if (fbxEntries.length === 0) {
      throw new Error("ZIP is missing an .fbx file.");
    }
    if (fbxEntries.length > 1) {
      throw new Error("ZIP must contain exactly one .fbx file for v1 runtime loading.");
    }

    const blobUrls: Record<string, string> = {};
    const entrySizes: Record<string, number> = {};
    const textureFileNames: string[] = [];

    for (const entry of allEntries) {
      const extension = getExtension(entry.name);
      const arrayBuffer = await entry.async("arraybuffer");
      const blob = new Blob([arrayBuffer], { type: extensionToMime(extension) });
      const objectUrl = URL.createObjectURL(blob);
      urlsToRevoke.add(objectUrl);

      const normalized = normalizeAssetKey(entry.name);
      blobUrls[normalized] = objectUrl;
      entrySizes[normalized] = arrayBuffer.byteLength;

      const basename = normalized.split("/").pop();
      if (basename && !(basename in blobUrls)) {
        blobUrls[basename] = objectUrl;
      }
      if (basename && !(basename in entrySizes)) {
        entrySizes[basename] = arrayBuffer.byteLength;
      }

      if (TEXTURE_EXTENSIONS.has(extension)) {
        textureFileNames.push(entry.name);
      }
    }

    const fbxEntry = fbxEntries[0];
    const pack = await loadFbxPackFromBlobMap(fbxEntry.name, blobUrls);
    const kind = detectPackageKind(pack);
    const normalizedFbx = normalizeAssetKey(fbxEntry.name);
    const fbxSizeBytes =
      entrySizes[normalizedFbx] ??
      entrySizes[normalizedFbx.split("/").pop() ?? ""] ??
      0;

    const parsed: ParsedZipAsset = {
      kind,
      name: trimExtension(file.name),
      fbxFileName: fbxEntry.name,
      textureFileNames,
      blobUrls,
      zipSizeBytes: file.size,
      fbxSizeBytes
    };

    return {
      parsed,
      pack,
      revoke() {
        for (const url of urlsToRevoke) {
          URL.revokeObjectURL(url);
        }
      }
    };
  } catch (error) {
    for (const url of urlsToRevoke) {
      URL.revokeObjectURL(url);
    }
    throw error;
  }
}
