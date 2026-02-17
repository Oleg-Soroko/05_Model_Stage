import * as THREE from "three";

export type VisibleCount = 3 | 4 | 5;
export type PackageKind = "model_with_clip" | "clip_only";

export interface PackManifestItem {
  id: string;
  label: string;
  kind: PackageKind;
  fbxUrl: string;
  thumbnailUrl?: string;
}

export interface PacksManifest {
  defaultVisibleCount: VisibleCount;
  modelPacks: PackManifestItem[];
  clipPacks: PackManifestItem[];
}

export interface SlotState {
  slotIndex: 0 | 1 | 2 | 3 | 4;
  modelPackId: string;
  activeClipName: string;
  mixerTimeScale: number;
  selected: boolean;
}

export interface ParsedZipAsset {
  kind: PackageKind;
  name: string;
  fbxFileName: string;
  textureFileNames: string[];
  blobUrls: Record<string, string>;
  zipSizeBytes: number;
  fbxSizeBytes: number;
}

export interface LoadedFbxPack {
  root: THREE.Group;
  clips: THREE.AnimationClip[];
  skeletonSignature: string | null;
  hasSkinnedMesh: boolean;
}

export interface AnimationOption {
  id: string;
  label: string;
  clip: THREE.AnimationClip;
  source: "model" | "clip_pack";
  packId: string;
}

export interface ModelInfoStats {
  meshCount: number;
  materialCount: number;
  textureCount: number;
  vertexCount: number;
  triangleCount: number;
  maxTextureSize: string;
  animationClipCount: number;
  animationDurationSec: number;
  fileSizeBytes: number | null;
}
