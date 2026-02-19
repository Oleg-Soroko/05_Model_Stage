import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type {
  AnimationOption,
  LoadedFbxPack,
  ModelInfoStats,
  SlotState
} from "../types/assets";

export type SlotIndex = 0 | 1 | 2 | 3 | 4;

const WIREFRAME_COLOR_BOOST = new THREE.Color(0xffffff);
const DEFAULT_WIREFRAME_COLOR = new THREE.Color(0xd8e8ff);
const WORLD_BOX = new THREE.Box3();
const WORLD_SIZE = new THREE.Vector3();
const MATERIAL_TEXTURE_KEYS = [
  "map",
  "alphaMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
  "metalnessMap",
  "normalMap",
  "roughnessMap",
  "specularMap"
] as const;

interface NormalOptions {
  flipNormals: boolean;
  flatShading: boolean;
}

interface WireframeStyle {
  color: THREE.Color;
  thickness: number;
}

function materialToPbrSource(material: THREE.Material): THREE.Material {
  const candidate = material as THREE.Material & Record<string, unknown>;
  if (
    (candidate.isMeshStandardMaterial as boolean | undefined) ||
    (candidate.isMeshPhysicalMaterial as boolean | undefined)
  ) {
    return material;
  }

  const sourceColor = candidate.color instanceof THREE.Color ? candidate.color : null;
  const sourceEmissive = candidate.emissive instanceof THREE.Color ? candidate.emissive : null;
  const sourceShininess =
    typeof candidate.shininess === "number" ? Number(candidate.shininess) : null;
  const roughnessFromShininess =
    sourceShininess !== null ? clamp(Math.sqrt(2 / (sourceShininess + 2)), 0.06, 0.82) : 0.72;

  const converted = new THREE.MeshStandardMaterial({
    name: material.name,
    color: sourceColor ? sourceColor.clone() : new THREE.Color(0xffffff),
    map: (candidate.map as THREE.Texture | null | undefined) ?? null,
    alphaMap: (candidate.alphaMap as THREE.Texture | null | undefined) ?? null,
    aoMap: (candidate.aoMap as THREE.Texture | null | undefined) ?? null,
    aoMapIntensity:
      typeof candidate.aoMapIntensity === "number" ? Number(candidate.aoMapIntensity) : 1,
    bumpMap: (candidate.bumpMap as THREE.Texture | null | undefined) ?? null,
    bumpScale: typeof candidate.bumpScale === "number" ? Number(candidate.bumpScale) : 1,
    displacementMap: (candidate.displacementMap as THREE.Texture | null | undefined) ?? null,
    displacementScale:
      typeof candidate.displacementScale === "number" ? Number(candidate.displacementScale) : 1,
    emissive: sourceEmissive ? sourceEmissive.clone() : new THREE.Color(0x000000),
    emissiveMap: (candidate.emissiveMap as THREE.Texture | null | undefined) ?? null,
    emissiveIntensity:
      typeof candidate.emissiveIntensity === "number" ? Number(candidate.emissiveIntensity) : 1,
    lightMap: (candidate.lightMap as THREE.Texture | null | undefined) ?? null,
    lightMapIntensity:
      typeof candidate.lightMapIntensity === "number" ? Number(candidate.lightMapIntensity) : 1,
    metalnessMap: (candidate.metalnessMap as THREE.Texture | null | undefined) ?? null,
    roughnessMap: (candidate.roughnessMap as THREE.Texture | null | undefined) ?? null,
    normalMap: (candidate.normalMap as THREE.Texture | null | undefined) ?? null,
    normalScale:
      candidate.normalScale instanceof THREE.Vector2
        ? candidate.normalScale.clone()
        : new THREE.Vector2(1, 1),
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side,
    flatShading: typeof candidate.flatShading === "boolean" ? candidate.flatShading : false,
    metalness:
      typeof candidate.metalness === "number" ? clamp(Number(candidate.metalness), 0, 1) : 0,
    roughness:
      typeof candidate.roughness === "number"
        ? clamp(Number(candidate.roughness), 0, 1)
        : roughnessFromShininess
  });

  converted.alphaTest = material.alphaTest;
  converted.depthTest = material.depthTest;
  converted.depthWrite = material.depthWrite;
  converted.blending = material.blending;
  converted.blendSrc = material.blendSrc;
  converted.blendDst = material.blendDst;
  converted.blendEquation = material.blendEquation;
  converted.blendSrcAlpha = material.blendSrcAlpha;
  converted.blendDstAlpha = material.blendDstAlpha;
  converted.blendEquationAlpha = material.blendEquationAlpha;
  converted.premultipliedAlpha = material.premultipliedAlpha;
  converted.dithering = material.dithering;
  converted.polygonOffset = material.polygonOffset;
  converted.polygonOffsetFactor = material.polygonOffsetFactor;
  converted.polygonOffsetUnits = material.polygonOffsetUnits;
  converted.toneMapped = material.toneMapped;
  converted.visible = material.visible;
  converted.envMapIntensity =
    typeof candidate.envMapIntensity === "number" ? Number(candidate.envMapIntensity) : 1.35;
  converted.needsUpdate = true;
  return converted;
}

function cloneMaterialWithTextures(material: THREE.Material): THREE.Material {
  const source = materialToPbrSource(material);
  const cloned =
    source === material ? material.clone() : (source as THREE.MeshStandardMaterial).clone();
  const keys = Object.keys(cloned) as Array<keyof THREE.Material>;
  for (const key of keys) {
    const value = (cloned as unknown as Record<string, unknown>)[key as string];
    if (value && (value as THREE.Texture).isTexture) {
      const textureClone = (value as THREE.Texture).clone();
      textureClone.needsUpdate = true;
      (cloned as unknown as Record<string, unknown>)[key as string] = textureClone;
    }
  }
  return cloned;
}

function cloneMaterials(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) {
    return material.map(cloneMaterialWithTextures);
  }
  return cloneMaterialWithTextures(material);
}

function disposeMaterialTextures(material: THREE.Material): void {
  const candidate = material as unknown as Record<string, unknown>;
  for (const value of Object.values(candidate)) {
    if (value && (value as THREE.Texture).isTexture) {
      (value as THREE.Texture).dispose();
    }
  }
}

function disposeObjectResources(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.geometry.dispose();

    const { material } = mesh;
    if (Array.isArray(material)) {
      for (const entry of material) {
        disposeMaterialTextures(entry);
        entry.dispose();
      }
      return;
    }

    disposeMaterialTextures(material);
    material.dispose();
  });
}

function normalizeMaterialForDisplay(material: THREE.Material): void {
  const candidate = material as THREE.Material & {
    map?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
    color?: THREE.Color;
    roughness?: number;
    metalness?: number;
    roughnessMap?: THREE.Texture | null;
    envMapIntensity?: number;
    isMeshStandardMaterial?: boolean;
    isMeshPhysicalMaterial?: boolean;
  };

  if (candidate.map) {
    candidate.map.colorSpace = THREE.SRGBColorSpace;
    candidate.map.needsUpdate = true;
  }
  if (candidate.emissiveMap) {
    candidate.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    candidate.emissiveMap.needsUpdate = true;
  }

  if (candidate.map && candidate.color) {
    if (candidate.color.r < 0.02 && candidate.color.g < 0.02 && candidate.color.b < 0.02) {
      candidate.color.set(0xffffff);
    }
  }

  if (candidate.isMeshStandardMaterial || candidate.isMeshPhysicalMaterial) {
    if (typeof candidate.roughness !== "number" || Number.isNaN(candidate.roughness)) {
      candidate.roughness = 0.72;
    } else if (!candidate.roughnessMap && candidate.roughness >= 0.98) {
      candidate.roughness = 0.78;
    }

    if (typeof candidate.metalness !== "number" || Number.isNaN(candidate.metalness)) {
      candidate.metalness = 0;
    }

    if (
      typeof candidate.envMapIntensity !== "number" ||
      Number.isNaN(candidate.envMapIntensity) ||
      candidate.envMapIntensity <= 0
    ) {
      candidate.envMapIntensity = 1.35;
    }
  }

  material.needsUpdate = true;
}

function applyMaterialNormalOptions(material: THREE.Material, options: NormalOptions): void {
  const candidate = material as THREE.Material & {
    side: THREE.Side;
    flatShading?: boolean;
  };

  candidate.side = options.flipNormals ? THREE.BackSide : THREE.FrontSide;
  if (typeof candidate.flatShading === "boolean") {
    candidate.flatShading = options.flatShading;
  }
  material.needsUpdate = true;
}

function collectTexturesFromMaterial(
  material: THREE.Material,
  outTextures: Set<THREE.Texture>
): void {
  const candidate = material as unknown as Record<string, unknown>;
  for (const key of MATERIAL_TEXTURE_KEYS) {
    const value = candidate[key];
    if (value && (value as THREE.Texture).isTexture) {
      outTextures.add(value as THREE.Texture);
    }
  }
}

function setMaterialHighlight(material: THREE.Material, highlighted: boolean): void {
  const candidate = material as THREE.Material & { emissive?: THREE.Color };
  if (!candidate.emissive) {
    return;
  }

  const baseColor = (material.userData.__baseEmissive as THREE.Color | undefined) ?? null;
  if (!baseColor) {
    material.userData.__baseEmissive = candidate.emissive.clone();
  }
  const actualBase = material.userData.__baseEmissive as THREE.Color;
  candidate.emissive.copy(actualBase);
}

function setObjectHighlight(root: THREE.Object3D | null, highlighted: boolean): void {
  if (!root) {
    return;
  }
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        setMaterialHighlight(material, highlighted);
      }
      return;
    }
    setMaterialHighlight(mesh.material, highlighted);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeWireframeHex(value: string): string {
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }
  return `#${DEFAULT_WIREFRAME_COLOR.getHexString()}`;
}

function getOverlayScaleFactors(thickness: number): number[] {
  const clamped = clamp(thickness, 0.01, 0.5);
  if (clamped < 0.24) {
    return [1];
  }
  if (clamped < 0.38) {
    return [1, 1 + clamped * 0.0028];
  }
  return [1, 1 + clamped * 0.0034];
}

function toWireframeMaterial(
  sourceMaterial: THREE.Material,
  style: WireframeStyle
): THREE.MeshBasicMaterial {
  const candidate = sourceMaterial as THREE.Material & { color?: THREE.Color };
  const baseColor = candidate.color
    ? candidate.color.clone().lerp(WIREFRAME_COLOR_BOOST, 0.18)
    : DEFAULT_WIREFRAME_COLOR.clone();
  const color = baseColor.lerp(style.color, 0.85);
  const opacity = clamp(0.08 + style.thickness * 1.5, 0.08, 0.8);

  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    wireframeLinewidth: Math.max(1, Math.round(style.thickness * 4))
  });
}

export class CharacterSlot {
  public readonly slotIndex: SlotIndex;
  public readonly root: THREE.Group;

  private readonly pickables: THREE.Object3D[] = [];
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly animationOptions = new Map<string, AnimationOption>();
  private readonly attachedClipPackIds = new Set<string>();
  private readonly wireframeOverlays: THREE.Object3D[] = [];

  private modelRoot: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private modelLabel = "";
  private modelPackId = "";
  private activeClipId = "";
  private selected = false;
  private visible = true;
  private skeletonSignature: string | null = null;
  private mixerTimeScale = 1;
  private flipNormalsEnabled = false;
  private flatShadingEnabled = false;
  private wireframeOverlayEnabled = false;
  private wireframeColor = `#${DEFAULT_WIREFRAME_COLOR.getHexString()}`;
  private wireframeThickness = 0.12;
  private modelInfoStats: ModelInfoStats = {
    meshCount: 0,
    materialCount: 0,
    textureCount: 0,
    vertexCount: 0,
    triangleCount: 0,
    maxTextureSize: "N/A",
    animationClipCount: 0,
    animationDurationSec: 0,
    fileSizeBytes: null
  };

  public constructor(slotIndex: SlotIndex, parent: THREE.Object3D) {
    this.slotIndex = slotIndex;
    this.root = new THREE.Group();
    this.root.name = `slot-${slotIndex + 1}`;
    parent.add(this.root);
  }

  public setPosition(x: number, z: number): void {
    this.root.position.set(x, 0, z);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public hasModel(): boolean {
    return this.modelRoot !== null;
  }

  public getModelPackId(): string {
    return this.modelPackId;
  }

  public getModelLabel(): string {
    return this.modelLabel;
  }

  public getActiveClipId(): string {
    return this.activeClipId;
  }

  public getSkeletonSignature(): string | null {
    return this.skeletonSignature;
  }

  public getTransformObject(): THREE.Object3D | null {
    if (!this.modelRoot) {
      return null;
    }
    return this.root;
  }

  public getModelInfoStats(): ModelInfoStats {
    return { ...this.modelInfoStats };
  }

  public loadModelPack(
    modelPackId: string,
    modelLabel: string,
    pack: LoadedFbxPack,
    fileSizeBytes: number | null = null
  ): void {
    this.clearModel();

    const clone = cloneSkeleton(pack.root) as THREE.Object3D;
    this.prepareCloneResources(clone);
    this.placeFeetOnGround(clone);

    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.userData.slotIndex = this.slotIndex;
      this.pickables.push(mesh);
    });

    this.modelRoot = clone;
    this.modelPackId = modelPackId;
    this.modelLabel = modelLabel;
    this.skeletonSignature = pack.skeletonSignature;
    this.root.add(clone);

    this.mixer = new THREE.AnimationMixer(clone);
    this.mixer.timeScale = this.mixerTimeScale;
    this.animationOptions.clear();
    this.actions.clear();
    this.attachedClipPackIds.clear();
    this.activeClipId = "";

    for (let i = 0; i < pack.clips.length; i += 1) {
      const clip = pack.clips[i];
      const clipName = clip.name?.trim() || `Clip ${i + 1}`;
      const clipId = `model:${modelPackId}:${i}`;
      this.animationOptions.set(clipId, {
        id: clipId,
        label: clipName,
        clip,
        source: "model",
        packId: modelPackId
      });

      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      this.actions.set(clipId, action);
    }

    const firstOption = this.getAnimationOptions()[0];
    if (firstOption) {
      this.playClip(firstOption.id, true);
    }

    this.applyNormalOptionsToModel();
    this.modelInfoStats = this.computeModelInfoStats(fileSizeBytes);
    this.syncWireframeOverlay();
    setObjectHighlight(this.modelRoot, this.selected);
  }

  public attachClipPack(packId: string, label: string, clipPack: LoadedFbxPack): string[] {
    if (!this.mixer || this.attachedClipPackIds.has(packId)) {
      return [];
    }
    if (!this.isCompatibleClipPack(clipPack.skeletonSignature)) {
      return [];
    }

    const addedIds: string[] = [];
    for (let i = 0; i < clipPack.clips.length; i += 1) {
      const clip = clipPack.clips[i];
      const clipName = clip.name?.trim() || `Clip ${i + 1}`;
      const clipId = `clip:${packId}:${i}`;

      if (this.animationOptions.has(clipId)) {
        continue;
      }

      this.animationOptions.set(clipId, {
        id: clipId,
        label: `${label} - ${clipName}`,
        clip,
        source: "clip_pack",
        packId
      });

      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      this.actions.set(clipId, action);
      addedIds.push(clipId);
    }

    if (addedIds.length > 0) {
      this.attachedClipPackIds.add(packId);
    }

    return addedIds;
  }

  public getClipOptionIdsForPack(packId: string): string[] {
    const ids: string[] = [];
    for (const option of this.animationOptions.values()) {
      if (option.packId === packId && option.source === "clip_pack") {
        ids.push(option.id);
      }
    }
    return ids;
  }

  public isCompatibleClipPack(signature: string | null): boolean {
    return Boolean(this.skeletonSignature && signature && this.skeletonSignature === signature);
  }

  public playClip(clipId: string, immediate = false): boolean {
    const next = this.actions.get(clipId);
    if (!next) {
      return false;
    }

    const previous = this.actions.get(this.activeClipId);
    if (previous === next) {
      return true;
    }

    if (previous && !immediate) {
      next.reset().play();
      next.crossFadeFrom(previous, 0.2, true);
    } else {
      if (previous) {
        previous.stop();
      }
      next.reset().play();
    }

    next.setEffectiveTimeScale(this.mixerTimeScale);
    next.setEffectiveWeight(1.0);
    this.activeClipId = clipId;
    return true;
  }

  public getAnimationOptions(): AnimationOption[] {
    const options = [...this.animationOptions.values()];
    options.sort((a, b) => {
      const aOrder = a.source === "model" ? 0 : 1;
      const bOrder = b.source === "model" ? 0 : 1;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.label.localeCompare(b.label);
    });
    return options;
  }

  public getPickableObjects(): THREE.Object3D[] {
    if (!this.visible) {
      return [];
    }
    return this.pickables;
  }

  public getFocusPoint(out: THREE.Vector3): boolean {
    if (!this.modelRoot) {
      return false;
    }
    WORLD_BOX.setFromObject(this.modelRoot);
    if (WORLD_BOX.isEmpty()) {
      this.modelRoot.getWorldPosition(out);
      return true;
    }
    WORLD_BOX.getCenter(out);
    return true;
  }

  public getGroundFootprint(outCenter: THREE.Vector3, outSize: THREE.Vector2): boolean {
    if (!this.modelRoot) {
      return false;
    }

    WORLD_BOX.setFromObject(this.modelRoot);
    if (WORLD_BOX.isEmpty()) {
      return false;
    }

    WORLD_BOX.getCenter(outCenter);
    WORLD_BOX.getSize(WORLD_SIZE);
    outCenter.y = 0;
    outSize.set(Math.max(WORLD_SIZE.x, 0.35), Math.max(WORLD_SIZE.z, 0.35));
    return true;
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    setObjectHighlight(this.modelRoot, selected);
  }

  public setFlipNormals(enabled: boolean): void {
    this.flipNormalsEnabled = enabled;
    this.applyNormalOptionsToModel();
  }

  public setFlatShading(enabled: boolean): void {
    this.flatShadingEnabled = enabled;
    this.applyNormalOptionsToModel();
  }

  public setWireframeOverlay(enabled: boolean): void {
    this.wireframeOverlayEnabled = enabled;
    this.syncWireframeOverlay();
  }

  public setWireframeStyle(colorHex: string, thickness: number): void {
    const nextColor = sanitizeWireframeHex(colorHex);
    const nextThickness = clamp(thickness, 0.01, 0.5);
    if (this.wireframeColor === nextColor && this.wireframeThickness === nextThickness) {
      return;
    }

    this.wireframeColor = nextColor;
    this.wireframeThickness = nextThickness;
    if (this.wireframeOverlayEnabled) {
      this.clearWireframeOverlay();
      this.syncWireframeOverlay();
    }
  }

  public update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  public toSlotState(): SlotState {
    return {
      slotIndex: this.slotIndex,
      modelPackId: this.modelPackId,
      activeClipName: this.animationOptions.get(this.activeClipId)?.label ?? "None",
      mixerTimeScale: this.mixerTimeScale,
      selected: this.selected
    };
  }

  public dispose(): void {
    this.clearModel();
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }

  private clearModel(): void {
    this.clearWireframeOverlay();

    this.pickables.length = 0;
    this.actions.clear();
    this.animationOptions.clear();
    this.attachedClipPackIds.clear();
    this.activeClipId = "";
    this.modelPackId = "";
    this.modelLabel = "";
    this.skeletonSignature = null;
    this.modelInfoStats = {
      meshCount: 0,
      materialCount: 0,
      textureCount: 0,
      vertexCount: 0,
      triangleCount: 0,
      maxTextureSize: "N/A",
      animationClipCount: 0,
      animationDurationSec: 0,
      fileSizeBytes: null
    };

    if (this.mixer && this.modelRoot) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.modelRoot);
    }
    this.mixer = null;

    if (this.modelRoot) {
      this.root.remove(this.modelRoot);
      disposeObjectResources(this.modelRoot);
      this.modelRoot = null;
    }
  }

  private placeFeetOnGround(root: THREE.Object3D): void {
    WORLD_BOX.setFromObject(root);
    if (!WORLD_BOX.isEmpty()) {
      root.position.y -= WORLD_BOX.min.y;
    }
  }

  private prepareCloneResources(root: THREE.Object3D): void {
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      mesh.geometry = mesh.geometry.clone();
      if (!mesh.geometry.hasAttribute("normal")) {
        mesh.geometry.computeVertexNormals();
      }
      mesh.material = cloneMaterials(mesh.material);

      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          normalizeMaterialForDisplay(material);
        }
      } else {
        normalizeMaterialForDisplay(mesh.material);
      }
    });
  }

  private computeModelInfoStats(fileSizeBytes: number | null): ModelInfoStats {
    if (!this.modelRoot) {
      return {
        meshCount: 0,
        materialCount: 0,
        textureCount: 0,
        vertexCount: 0,
        triangleCount: 0,
        maxTextureSize: "N/A",
        animationClipCount: this.animationOptions.size,
        animationDurationSec: 0,
        fileSizeBytes
      };
    }

    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;
    let maxTextureWidth = 0;
    let maxTextureHeight = 0;
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    this.modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      meshCount += 1;
      const positionAttr = mesh.geometry.getAttribute("position");
      if (positionAttr) {
        vertexCount += positionAttr.count;
        if (mesh.geometry.index) {
          triangleCount += Math.floor(mesh.geometry.index.count / 3);
        } else {
          triangleCount += Math.floor(positionAttr.count / 3);
        }
      }

      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          materials.add(material);
          collectTexturesFromMaterial(material, textures);
        }
      } else {
        materials.add(mesh.material);
        collectTexturesFromMaterial(mesh.material, textures);
      }
    });

    for (const texture of textures) {
      const image = texture.image as { width?: number; height?: number } | undefined;
      const width = image?.width ?? 0;
      const height = image?.height ?? 0;
      if (width > maxTextureWidth) {
        maxTextureWidth = width;
      }
      if (height > maxTextureHeight) {
        maxTextureHeight = height;
      }
    }

    let animationDurationSec = 0;
    for (const option of this.animationOptions.values()) {
      animationDurationSec = Math.max(animationDurationSec, option.clip.duration || 0);
    }

    return {
      meshCount,
      materialCount: materials.size,
      textureCount: textures.size,
      vertexCount,
      triangleCount,
      maxTextureSize:
        maxTextureWidth > 0 && maxTextureHeight > 0
          ? `${maxTextureWidth}x${maxTextureHeight}`
          : "N/A",
      animationClipCount: this.animationOptions.size,
      animationDurationSec,
      fileSizeBytes
    };
  }

  private clearWireframeOverlay(): void {
    for (const overlay of this.wireframeOverlays) {
      if (overlay.parent) {
        overlay.parent.remove(overlay);
      }

      const overlayMesh = overlay as THREE.Mesh;
      const { material } = overlayMesh;
      if (Array.isArray(material)) {
        for (const entry of material) {
          entry.dispose();
        }
      } else {
        material.dispose();
      }
    }
    this.wireframeOverlays.length = 0;
  }

  private syncWireframeOverlay(): void {
    if (!this.modelRoot || !this.wireframeOverlayEnabled) {
      this.clearWireframeOverlay();
      return;
    }
    if (this.wireframeOverlays.length > 0) {
      return;
    }

    const wireframeStyle: WireframeStyle = {
      color: new THREE.Color(this.wireframeColor),
      thickness: this.wireframeThickness
    };
    const layerScaleFactors = getOverlayScaleFactors(this.wireframeThickness);

    this.modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.parent) {
        return;
      }

      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (let layer = 0; layer < layerScaleFactors.length; layer += 1) {
        const scaleFactor = layerScaleFactors[layer];
        const wireframeMaterial =
          sourceMaterials.length === 1
            ? toWireframeMaterial(sourceMaterials[0], wireframeStyle)
            : sourceMaterials.map((material) => toWireframeMaterial(material, wireframeStyle));

        let overlay: THREE.Object3D;
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          const skinned = mesh as THREE.SkinnedMesh;
          const wireSkinned = new THREE.SkinnedMesh(mesh.geometry, wireframeMaterial);
          wireSkinned.bind(skinned.skeleton, skinned.bindMatrix);
          wireSkinned.bindMatrix.copy(skinned.bindMatrix);
          wireSkinned.bindMatrixInverse.copy(skinned.bindMatrixInverse);
          overlay = wireSkinned;
        } else {
          overlay = new THREE.Mesh(mesh.geometry, wireframeMaterial);
        }

        overlay.position.copy(mesh.position);
        overlay.quaternion.copy(mesh.quaternion);
        overlay.scale.copy(mesh.scale);
        overlay.scale.multiplyScalar(scaleFactor);
        overlay.castShadow = false;
        overlay.receiveShadow = false;
        overlay.renderOrder = Math.max(mesh.renderOrder + 1 + layer, 2600 + layer);
        overlay.frustumCulled = mesh.frustumCulled;
        overlay.userData.slotIndex = this.slotIndex;
        overlay.userData.isWireframeOverlay = true;

        mesh.parent.add(overlay);
        this.wireframeOverlays.push(overlay);
      }
    });
  }

  private applyNormalOptionsToModel(): void {
    if (!this.modelRoot) {
      return;
    }

    const options: NormalOptions = {
      flipNormals: this.flipNormalsEnabled,
      flatShading: this.flatShadingEnabled
    };

    this.modelRoot.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) {
        return;
      }

      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          applyMaterialNormalOptions(material, options);
        }
      } else {
        applyMaterialNormalOptions(mesh.material, options);
      }

      if (!mesh.geometry.hasAttribute("normal")) {
        mesh.geometry.computeVertexNormals();
      } else if (!options.flatShading) {
        mesh.geometry.computeVertexNormals();
      }

      if (mesh.geometry.hasAttribute("normal")) {
        mesh.geometry.attributes.normal.needsUpdate = true;
      }
    });
  }
}
