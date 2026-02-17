import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { LoadedFbxPack, PackageKind } from "../types/assets";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeAssetKey(input: string): string {
  return input
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/^[a-z]:\//i, "")
    .replace(/^file:\/+/i, "")
    .replace(/^\//, "")
    .trim()
    .toLowerCase();
}

function resolveBlobUrl(requestedUrl: string, blobUrls: Record<string, string>): string {
  if (requestedUrl.startsWith("blob:")) {
    return requestedUrl;
  }

  const decoded = safeDecode(requestedUrl).split("?")[0].split("#")[0];
  const normalized = normalizeAssetKey(decoded);
  const candidates = new Set<string>();
  if (normalized) {
    candidates.add(normalized);
  }

  const basename = normalized.split("/").pop() ?? normalized;
  if (basename) {
    candidates.add(basename);
  }

  const fbxFolderIndex = normalized.lastIndexOf(".fbm/");
  if (fbxFolderIndex >= 0) {
    const afterFbm = normalized.slice(fbxFolderIndex + 5);
    if (afterFbm) {
      candidates.add(afterFbm);
      const afterFbmBase = afterFbm.split("/").pop();
      if (afterFbmBase) {
        candidates.add(afterFbmBase);
      }
    }
  }

  for (const key of candidates) {
    if (blobUrls[key]) {
      return blobUrls[key];
    }
  }

  for (const [key, value] of Object.entries(blobUrls)) {
    if (basename && key.endsWith(`/${basename}`)) {
      return value;
    }
  }

  return requestedUrl;
}

export function computeSkeletonSignature(root: THREE.Object3D): string | null {
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedMeshes.push(node as THREE.SkinnedMesh);
    }
  });

  if (skinnedMeshes.length > 0) {
    const names = skinnedMeshes[0].skeleton.bones
      .map((bone) => bone.name.trim().toLowerCase())
      .filter(Boolean);

    if (names.length > 0) {
      return names.join("|");
    }
  }

  const fallbackBoneNames: string[] = [];
  root.traverse((node) => {
    if ((node as THREE.Bone).isBone) {
      const name = (node as THREE.Bone).name.trim().toLowerCase();
      if (name) {
        fallbackBoneNames.push(name);
      }
    }
  });

  if (fallbackBoneNames.length === 0) {
    return null;
  }

  return fallbackBoneNames.join("|");
}

function hasSkinnedMesh(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
      found = true;
    }
  });
  return found;
}

function buildLoadedPack(root: THREE.Group): LoadedFbxPack {
  const clips = [...(root.animations ?? [])];
  const skinned = hasSkinnedMesh(root);
  const signature = computeSkeletonSignature(root);
  return {
    root,
    clips,
    hasSkinnedMesh: skinned,
    skeletonSignature: signature
  };
}

export function detectPackageKind(pack: LoadedFbxPack): PackageKind {
  return pack.hasSkinnedMesh ? "model_with_clip" : "clip_only";
}

export async function loadFbxPackFromUrl(url: string): Promise<LoadedFbxPack> {
  const loader = new FBXLoader();
  const object = await loader.loadAsync(url);
  return buildLoadedPack(object as THREE.Group);
}

export async function loadFbxPackFromBlobMap(
  fbxFileName: string,
  blobUrls: Record<string, string>
): Promise<LoadedFbxPack> {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => resolveBlobUrl(url, blobUrls));

  const loader = new FBXLoader(manager);
  const normalizedFbx = normalizeAssetKey(fbxFileName);
  const fbxUrl = blobUrls[normalizedFbx] ?? blobUrls[normalizedFbx.split("/").pop() ?? ""];
  if (!fbxUrl) {
    throw new Error(`FBX file "${fbxFileName}" is not available in ZIP blob map.`);
  }

  const object = await loader.loadAsync(fbxUrl);
  return buildLoadedPack(object as THREE.Group);
}
