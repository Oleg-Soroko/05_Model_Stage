import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  TransformControls,
  type TransformControlsEventMap
} from "three/examples/jsm/controls/TransformControls.js";
import { CharacterLibrary } from "./characters/library";
import { CharacterSlot, type SlotIndex } from "./characters/characterSlot";
import { parseRuntimeZipAsset } from "./loaders/zipRuntimeLoader";
import { createRenderer, resizeRenderer } from "./scene/renderer";
import { SelectionFloorOverlay } from "./scene/selectionFloorOverlay";
import {
  createStudioStage,
  type EnvironmentPreset,
  type FogSettings,
  type GridFloorSettings
} from "./scene/stage";
import { createAppStore, type AppStatusLevel } from "./state/store";
import type {
  PackManifestItem,
  PackageKind,
  PacksManifest,
  VisibleCount
} from "./types/assets";
import {
  createShowcasePanel,
  type ModelInfoRow,
  type ShowcasePanel
} from "./ui/panel";

const SLOT_CAPACITY = 5;
const SLOT_SPACING = 2.35;
const CAMERA_TARGET_FOLLOW = 6.0;
const CLICK_SLOP_SQ = 25;
const ENV_PRESET_STORAGE_KEY = "ai-character-showcase.environment-preset.v1";
const TRANSFORM_SCALE_MIN = 0.01;
const TRANSFORM_SCALE_MAX = 8;
const WASD_LOOK_SENSITIVITY = 0.0022;
const WASD_MOVE_SPEED = 7;
const WASD_BOOST_MULTIPLIER = 2.2;
const WASD_TARGET_DISTANCE = 5.5;

const FALLBACK_MANIFEST: PacksManifest = {
  defaultVisibleCount: 3,
  modelPacks: [],
  clipPacks: []
};

interface SavedEnvironmentPresetV1 {
  version: 1;
  savedAtIso: string;
  environmentPreset: EnvironmentPreset;
  fogSettings: Partial<FogSettings>;
  gridSettings: Partial<GridFloorSettings>;
}

type TransformAxis = "x" | "y" | "z";
type NavigationMode = "locked" | "free" | "wasd";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSavedEnvironmentPreset(rawValue: string | null): SavedEnvironmentPresetV1 | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const version = parsed.version;
    const savedAtIso = parsed.savedAtIso;
    const environmentPreset = parsed.environmentPreset;
    const fogSettings = parsed.fogSettings;
    const gridSettings = parsed.gridSettings;

    if (version !== 1) {
      return null;
    }
    if (typeof savedAtIso !== "string") {
      return null;
    }
    if (environmentPreset !== "showcase_grid" && environmentPreset !== "studio_clay") {
      return null;
    }
    if (!isRecord(fogSettings) || !isRecord(gridSettings)) {
      return null;
    }

    return {
      version: 1,
      savedAtIso,
      environmentPreset,
      fogSettings,
      gridSettings
    };
  } catch {
    return null;
  }
}

function readSavedEnvironmentPreset(): SavedEnvironmentPresetV1 | null {
  try {
    return parseSavedEnvironmentPreset(localStorage.getItem(ENV_PRESET_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeSavedEnvironmentPreset(value: SavedEnvironmentPresetV1): boolean {
  try {
    localStorage.setItem(ENV_PRESET_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function formatSavedPresetTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "unknown time";
  }
  return date.toLocaleString();
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseVisibleCount(value: unknown): VisibleCount {
  if (value === 4 || value === 5) {
    return value;
  }
  return 3;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDurationSeconds(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) {
    return "N/A";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function sanitizeFileName(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  const cleaned = trimmed.replace(/[\\/:*?"<>|]/g, "_");
  return cleaned.length > 0 ? cleaned : fallback;
}

function ensureZipExtension(fileName: string): string {
  return fileName.toLowerCase().endsWith(".zip") ? fileName : `${fileName}.zip`;
}

function extractFileNameFromContentDisposition(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = value.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }
  return null;
}

function extractFileNameFromUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const last = parts[parts.length - 1];
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

async function blobHasZipSignature(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (header.length < 4) {
    return false;
  }

  const pk = header[0] === 0x50 && header[1] === 0x4b;
  if (!pk) {
    return false;
  }

  const sig2 = header[2];
  const sig3 = header[3];
  return (
    (sig2 === 0x03 && sig3 === 0x04) ||
    (sig2 === 0x05 && sig3 === 0x06) ||
    (sig2 === 0x07 && sig3 === 0x08)
  );
}

async function responseToZipFile(
  response: Response,
  fallbackFileName: string
): Promise<File> {
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const contentDisposition = response.headers.get("content-disposition");
  const blob = await response.blob();
  const blobType = (blob.type ?? "").toLowerCase();

  if (contentType.includes("text/html") || blobType.includes("text/html")) {
    throw new Error("Remote URL returned an HTML page, not a ZIP file.");
  }

  const zipMime =
    contentType.includes("application/zip") ||
    contentType.includes("application/x-zip-compressed") ||
    contentType.includes("application/octet-stream") ||
    blobType.includes("application/zip") ||
    blobType.includes("application/x-zip-compressed") ||
    blobType.includes("application/octet-stream");

  if (!zipMime && !(await blobHasZipSignature(blob))) {
    throw new Error("Downloaded file is not a valid ZIP.");
  }

  const rawFileName =
    extractFileNameFromContentDisposition(contentDisposition) ?? fallbackFileName;
  const safeName = ensureZipExtension(sanitizeFileName(rawFileName, fallbackFileName));
  return new File([blob], safeName, { type: "application/zip", lastModified: Date.now() });
}

async function fetchZipFileByUrl(url: URL, fallbackFileName: string): Promise<File> {
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit"
    });
  } catch {
    throw new Error("Network/CORS blocked the URL request.");
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ZIP.`);
  }

  return responseToZipFile(response, fallbackFileName);
}

function extractGoogleDriveFileId(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const isGoogleDriveHost =
    host === "drive.google.com" ||
    host.endsWith(".drive.google.com") ||
    host === "docs.google.com" ||
    host === "drive.usercontent.google.com";
  if (!isGoogleDriveHost) {
    return null;
  }

  const idParam = parsed.searchParams.get("id");
  if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) {
    return idParam;
  }

  const filePathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (filePathMatch?.[1]) {
    return filePathMatch[1];
  }

  const ucMatch = parsed.pathname.match(/\/uc\/?.*/);
  if (ucMatch) {
    const ucId = parsed.searchParams.get("id");
    if (ucId && /^[a-zA-Z0-9_-]{10,}$/.test(ucId)) {
      return ucId;
    }
  }

  return null;
}

function extractDriveConfirmToken(html: string): string | null {
  const formMatch = html.match(/name="confirm"\s+value="([^"]+)"/i);
  if (formMatch?.[1]) {
    return formMatch[1];
  }

  const queryMatch = html.match(/confirm=([0-9A-Za-z_-]+)/i);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  return null;
}

function buildGoogleDriveDownloadUrl(fileId: string, confirmToken?: string): URL {
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", fileId);
  if (confirmToken) {
    url.searchParams.set("confirm", confirmToken);
  }
  return url;
}

async function fetchGoogleDriveZip(fileId: string): Promise<File> {
  const directUserContentUrl = new URL("https://drive.usercontent.google.com/download");
  directUserContentUrl.searchParams.set("id", fileId);
  directUserContentUrl.searchParams.set("export", "download");
  directUserContentUrl.searchParams.set("confirm", "t");

  const fallbackName = `gdrive-${fileId}.zip`;
  try {
    return await fetchZipFileByUrl(directUserContentUrl, fallbackName);
  } catch {
    // Continue with canonical Google Drive endpoint.
  }

  const firstUrl = buildGoogleDriveDownloadUrl(fileId);
  let firstResponse: Response;
  try {
    firstResponse = await fetch(firstUrl.toString(), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit"
    });
  } catch {
    throw new Error("Google Drive request failed (network/CORS).");
  }

  if (!firstResponse.ok) {
    throw new Error(`Google Drive returned HTTP ${firstResponse.status}.`);
  }

  const firstType = (firstResponse.headers.get("content-type") ?? "").toLowerCase();
  if (!firstType.includes("text/html")) {
    return responseToZipFile(firstResponse, fallbackName);
  }

  const html = await firstResponse.text();
  const confirmToken = extractDriveConfirmToken(html);
  if (!confirmToken) {
    throw new Error(
      "Google Drive returned a confirmation page. Ensure link sharing is public and file is downloadable."
    );
  }

  const confirmedUrl = buildGoogleDriveDownloadUrl(fileId, confirmToken);
  return fetchZipFileByUrl(confirmedUrl, fallbackName);
}

async function downloadZipFromRemoteUrl(rawUrl: string): Promise<File> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid URL.");
  }

  const driveId = extractGoogleDriveFileId(parsedUrl.toString());
  if (driveId) {
    return fetchGoogleDriveZip(driveId);
  }

  const fallbackName = ensureZipExtension(
    sanitizeFileName(extractFileNameFromUrl(parsedUrl) ?? "remote-download.zip", "remote-download.zip")
  );
  return fetchZipFileByUrl(parsedUrl, fallbackName);
}

function parseManifestItems(
  raw: unknown,
  defaultKind: PackageKind
): PackManifestItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const items: PackManifestItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const data = entry as Record<string, unknown>;
    const id = typeof data.id === "string" ? data.id.trim() : "";
    const label = typeof data.label === "string" ? data.label.trim() : "";
    const fbxUrl = typeof data.fbxUrl === "string" ? data.fbxUrl.trim() : "";
    const thumbnailUrl =
      typeof data.thumbnailUrl === "string" ? data.thumbnailUrl.trim() : undefined;
    const kind =
      data.kind === "model_with_clip" || data.kind === "clip_only"
        ? data.kind
        : defaultKind;

    if (!id || !label || !fbxUrl) {
      continue;
    }

    items.push({ id, label, kind, fbxUrl, thumbnailUrl });
  }
  return items;
}

async function loadManifest(): Promise<PacksManifest> {
  try {
    const response = await fetch("./packs/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading manifest.`);
    }
    const raw = (await response.json()) as Partial<PacksManifest>;
    return {
      defaultVisibleCount: parseVisibleCount(raw.defaultVisibleCount),
      modelPacks: parseManifestItems(raw.modelPacks, "model_with_clip"),
      clipPacks: parseManifestItems(raw.clipPacks, "clip_only")
    };
  } catch (error) {
    console.warn("[AICharacterShowcase] Using fallback manifest.", error);
    return FALLBACK_MANIFEST;
  }
}

function toSlotIndex(index: number): SlotIndex {
  if (!Number.isInteger(index) || index < 0 || index >= SLOT_CAPACITY) {
    throw new Error(`Invalid slot index ${index}.`);
  }
  return index as SlotIndex;
}

function applyUiTheme(): void {
  document.body.classList.remove("theme-dark");
}

export async function mountApp(appRoot: HTMLElement): Promise<void> {
  const viewport = document.createElement("div");
  viewport.className = "viewport";
  appRoot.appendChild(viewport);

  const controlsHint = document.createElement("div");
  controlsHint.className = "controls-hint";
  controlsHint.textContent =
    "W move | E rotate | R scale | LMB orbit | MMB pan | Wheel zoom | Click character to select";
  appRoot.appendChild(controlsHint);

  const navigationPanel = document.createElement("div");
  navigationPanel.className = "nav-mode-panel";

  const navigationTitle = document.createElement("div");
  navigationTitle.className = "nav-mode-title";
  navigationTitle.textContent = "Navigation";
  navigationPanel.appendChild(navigationTitle);

  const navigationButtonsRow = document.createElement("div");
  navigationButtonsRow.className = "nav-mode-row";
  navigationPanel.appendChild(navigationButtonsRow);

  const navigationButtons = new Map<NavigationMode, HTMLButtonElement>();
  function addNavigationModeButton(label: string, mode: NavigationMode): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-mode-button";
    button.textContent = label;
    button.dataset.mode = mode;
    navigationButtons.set(mode, button);
    navigationButtonsRow.appendChild(button);
  }

  addNavigationModeButton("Locked", "locked");
  addNavigationModeButton("Free", "free");
  addNavigationModeButton("WASD", "wasd");
  appRoot.appendChild(navigationPanel);

  const renderer = createRenderer(viewport);
  const scene = new THREE.Scene();
  const stage = createStudioStage(scene, renderer);
  const selectionFloorOverlay = new SelectionFloorOverlay(scene);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 2.8, 8.8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.0, 0);
  controls.screenSpacePanning = true;
  controls.minDistance = 2.4;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.update();

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode("translate");
  transformControls.setSpace("world");
  transformControls.size = 0.78;
  const transformHelper = transformControls.getHelper();
  transformHelper.visible = false;
  scene.add(transformHelper);

  const rowGroup = new THREE.Group();
  scene.add(rowGroup);

  const slots: CharacterSlot[] = [];
  for (let i = 0; i < SLOT_CAPACITY; i += 1) {
    slots.push(new CharacterSlot(toSlotIndex(i), rowGroup));
  }

  const manifest = await loadManifest();
  const library = new CharacterLibrary(manifest);

  let visibleCount: VisibleCount = manifest.defaultVisibleCount;
  let selectedSlotIndex: SlotIndex | null = null;
  let disposed = false;
  let flipNormals = false;
  let flatShading = true;
  let wireframeOverlay = false;
  let wireframeColor = "#d8e8ff";
  let wireframeThickness = 0.12;
  let modelStatisticsVisible = true;
  let modelStatisticsColor = "#aeb7c2";
  let transformDragging = false;
  let navigationMode: NavigationMode = "locked";
  let wasdLookActive = false;
  let wasdYaw = 0;
  let wasdPitch = 0;
  let wasdLastPointerX = 0;
  let wasdLastPointerY = 0;
  const wasdMoveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false
  };
  const wasdEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const wasdForward = new THREE.Vector3();
  const wasdRight = new THREE.Vector3();
  const wasdUp = new THREE.Vector3(0, 1, 0);
  const wasdMoveDelta = new THREE.Vector3();
  const selectionFootprintCenter = new THREE.Vector3();
  const selectionFootprintSize = new THREE.Vector2();

  const store = createAppStore({
    visibleCount,
    selectedSlotIndex,
    slots: slots.map((slot) => slot.toSlotState()),
    statusText: "Ready",
    statusLevel: "info"
  });

  let panel: ShowcasePanel;

  function notify(message: string, level: AppStatusLevel = "info"): void {
    panel.showStatus(message, level);
    store.setState((state) => ({
      ...state,
      statusText: message,
      statusLevel: level
    }));
  }

  function clearWasdMovementState(): void {
    wasdMoveState.forward = false;
    wasdMoveState.backward = false;
    wasdMoveState.left = false;
    wasdMoveState.right = false;
    wasdMoveState.up = false;
    wasdMoveState.down = false;
    wasdMoveState.boost = false;
  }

  function setControlsHintForNavigationMode(mode: NavigationMode): void {
    if (mode === "wasd") {
      controlsHint.textContent =
        "WASD move | Q/E vertical | Shift boost | RMB look | LMB select | Wheel zoom disabled";
      return;
    }

    controlsHint.textContent =
      "W move | E rotate | R scale | LMB orbit | MMB pan | Wheel zoom | Click character to select";
  }

  function updateNavigationButtonsActiveState(): void {
    const modes: NavigationMode[] = ["locked", "free", "wasd"];
    for (const mode of modes) {
      const button = navigationButtons.get(mode);
      if (!button) {
        continue;
      }
      button.classList.toggle("active", navigationMode === mode);
    }
  }

  function syncWasdAnglesFromCamera(): void {
    wasdEuler.setFromQuaternion(camera.quaternion);
    wasdYaw = wasdEuler.y;
    wasdPitch = clamp(wasdEuler.x, -Math.PI * 0.495, Math.PI * 0.495);
  }

  function applyWasdRotationToCamera(): void {
    wasdEuler.set(wasdPitch, wasdYaw, 0);
    camera.quaternion.setFromEuler(wasdEuler);
  }

  function syncOrbitTargetFromCamera(distance = WASD_TARGET_DISTANCE): void {
    wasdForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.copy(camera.position).addScaledVector(wasdForward, distance);
    controls.update();
  }

  function updateOrbitControlsEnabled(): void {
    controls.enabled = navigationMode !== "wasd" && !transformDragging;
  }

  function setNavigationMode(nextMode: NavigationMode, showToast = true): void {
    if (navigationMode === nextMode) {
      updateNavigationButtonsActiveState();
      updateOrbitControlsEnabled();
      setControlsHintForNavigationMode(navigationMode);
      return;
    }

    const previousMode = navigationMode;
    navigationMode = nextMode;

    if (nextMode === "wasd") {
      syncWasdAnglesFromCamera();
      wasdLookActive = false;
      renderer.domElement.style.cursor = "default";
    } else {
      if (previousMode === "wasd") {
        clearWasdMovementState();
        wasdLookActive = false;
        syncOrbitTargetFromCamera();
        renderer.domElement.style.cursor = "default";
      }

      if (nextMode === "locked") {
        updateCameraTargetGoal(cameraTargetGoal);
      }
    }

    updateNavigationButtonsActiveState();
    updateOrbitControlsEnabled();
    setControlsHintForNavigationMode(navigationMode);

    if (showToast) {
      const label =
        nextMode === "locked" ? "Locked" : nextMode === "free" ? "Free" : "WASD";
      notify(`Navigation mode: ${label}`);
    }
  }

  function setWasdMovementKey(key: string, enabled: boolean): boolean {
    switch (key) {
      case "w":
        wasdMoveState.forward = enabled;
        return true;
      case "s":
        wasdMoveState.backward = enabled;
        return true;
      case "a":
        wasdMoveState.left = enabled;
        return true;
      case "d":
        wasdMoveState.right = enabled;
        return true;
      case "q":
        wasdMoveState.down = enabled;
        return true;
      case "e":
      case " ":
        wasdMoveState.up = enabled;
        return true;
      case "shift":
        wasdMoveState.boost = enabled;
        return true;
      default:
        return false;
    }
  }

  function updateWasdNavigation(deltaSeconds: number): void {
    applyWasdRotationToCamera();

    wasdMoveDelta.set(0, 0, 0);
    if (wasdMoveState.forward) {
      wasdMoveDelta.z -= 1;
    }
    if (wasdMoveState.backward) {
      wasdMoveDelta.z += 1;
    }
    if (wasdMoveState.left) {
      wasdMoveDelta.x -= 1;
    }
    if (wasdMoveState.right) {
      wasdMoveDelta.x += 1;
    }
    if (wasdMoveState.up) {
      wasdMoveDelta.y += 1;
    }
    if (wasdMoveState.down) {
      wasdMoveDelta.y -= 1;
    }

    if (wasdMoveDelta.lengthSq() > 0) {
      wasdMoveDelta.normalize();
      const speedMultiplier = wasdMoveState.boost ? WASD_BOOST_MULTIPLIER : 1;
      const distance = WASD_MOVE_SPEED * speedMultiplier * deltaSeconds;

      wasdForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      wasdRight.set(1, 0, 0).applyQuaternion(camera.quaternion);

      camera.position.addScaledVector(wasdRight, wasdMoveDelta.x * distance);
      camera.position.addScaledVector(wasdUp, wasdMoveDelta.y * distance);
      camera.position.addScaledVector(wasdForward, wasdMoveDelta.z * distance);
    }

    wasdForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.copy(camera.position).addScaledVector(wasdForward, WASD_TARGET_DISTANCE);
  }

  navigationButtons.get("locked")?.addEventListener("click", () => {
    setNavigationMode("locked");
  });
  navigationButtons.get("free")?.addEventListener("click", () => {
    setNavigationMode("free");
  });
  navigationButtons.get("wasd")?.addEventListener("click", () => {
    setNavigationMode("wasd");
  });

  function updateSavedPresetIndicator(): void {
    const savedPreset = readSavedEnvironmentPreset();
    if (!savedPreset) {
      panel.setSavedPresetState({
        hasSaved: false,
        label: "No saved preset"
      });
      return;
    }

    panel.setSavedPresetState({
      hasSaved: true,
      label: `Saved: ${formatSavedPresetTime(savedPreset.savedAtIso)}`
    });
  }

  function saveCurrentEnvironmentPreset(): void {
    const snapshot: SavedEnvironmentPresetV1 = {
      version: 1,
      savedAtIso: new Date().toISOString(),
      environmentPreset: stage.getEnvironmentPreset(),
      fogSettings: stage.getFogSettings(),
      gridSettings: stage.getGridSettings()
    };

    const saved = writeSavedEnvironmentPreset(snapshot);
    if (!saved) {
      notify("Unable to save preset (storage is unavailable).", "error");
      return;
    }

    updateSavedPresetIndicator();
    notify("Custom environment preset saved.");
  }

  function loadSavedEnvironmentPreset(): void {
    const snapshot = readSavedEnvironmentPreset();
    if (!snapshot) {
      updateSavedPresetIndicator();
      notify("No saved environment preset found.", "warning");
      return;
    }

    stage.setEnvironmentPreset(snapshot.environmentPreset);
    stage.setFogSettings(snapshot.fogSettings);
    stage.setGridSettings(snapshot.gridSettings);

    panel.setEnvironmentPreset(stage.getEnvironmentPreset());
    panel.setFogSettings(stage.getFogSettings());
    panel.setGridValues(stage.getGridSettings());
    panel.setHdriSettings(stage.getHdriSettings());
    updateSavedPresetIndicator();
    notify(`Loaded saved preset (${formatSavedPresetTime(snapshot.savedAtIso)}).`);
  }

  function updateCameraTargetGoal(target: THREE.Vector3): void {
    if (selectedSlotIndex === null) {
      target.set(0, 1, 0);
      return;
    }

    const selectedSlot = slots[selectedSlotIndex];
    const ok = selectedSlot.getFocusPoint(target);
    if (!ok) {
      target.set(0, 1, 0);
    }
  }

  function attachAllLoadedClipPacksToSlot(slot: CharacterSlot): void {
    const loadedClipPacks = library.getLoadedClipPacks();
    for (const { entry, pack } of loadedClipPacks) {
      slot.attachClipPack(entry.id, entry.label, pack);
    }
  }

  function applyShadingOptionsToAllSlots(): void {
    for (const slot of slots) {
      slot.setFlipNormals(flipNormals);
      slot.setFlatShading(flatShading);
      slot.setWireframeOverlay(wireframeOverlay);
      slot.setWireframeStyle(wireframeColor, wireframeThickness);
    }
  }

  function applyModelStatisticsOverlayOptions(): void {
    selectionFloorOverlay.setStatsVisible(modelStatisticsVisible);
    selectionFloorOverlay.setAccentColor(modelStatisticsColor);
  }

  function findFirstVisibleModelSlot(): SlotIndex | null {
    for (let i = 0; i < visibleCount; i += 1) {
      if (slots[i].hasModel()) {
        return toSlotIndex(i);
      }
    }
    return null;
  }

  function updateTransformControlsAttachment(): void {
    if (selectedSlotIndex === null) {
      transformControls.detach();
      transformHelper.visible = false;
      return;
    }

    const slot = slots[selectedSlotIndex];
    if (!slot.isVisible() || !slot.hasModel()) {
      transformControls.detach();
      transformHelper.visible = false;
      return;
    }

    const target = slot.getTransformObject();
    if (!target) {
      transformControls.detach();
      transformHelper.visible = false;
      return;
    }

    transformControls.attach(target);
    transformHelper.visible = true;
  }

  function getSlotRowBaseX(slotIndex: number, count: VisibleCount): number {
    const startX = -((count - 1) * SLOT_SPACING) * 0.5;
    return startX + slotIndex * SLOT_SPACING;
  }

  function getSelectedTransformObject(): THREE.Object3D | null {
    if (selectedSlotIndex === null) {
      return null;
    }

    const slot = slots[selectedSlotIndex];
    if (!slot.isVisible() || !slot.hasModel()) {
      return null;
    }

    return slot.getTransformObject();
  }

  function updateTransformPanelValues(): void {
    const target = getSelectedTransformObject();
    if (!target) {
      panel.setTransformValues({
        enabled: false,
        position: { x: 0, y: 0, z: 0 },
        rotationDeg: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        uniformScale: 1
      });
      return;
    }

    panel.setTransformValues({
      enabled: true,
      position: {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z
      },
      rotationDeg: {
        x: THREE.MathUtils.radToDeg(target.rotation.x),
        y: THREE.MathUtils.radToDeg(target.rotation.y),
        z: THREE.MathUtils.radToDeg(target.rotation.z)
      },
      scale: {
        x: target.scale.x,
        y: target.scale.y,
        z: target.scale.z
      },
      uniformScale: (target.scale.x + target.scale.y + target.scale.z) / 3
    });
  }

  function setSelectedTransformPosition(axis: TransformAxis, value: number): void {
    const target = getSelectedTransformObject();
    if (!target || !Number.isFinite(value)) {
      return;
    }

    target.position[axis] = value;
    updateTransformPanelValues();
  }

  function setSelectedTransformRotationDeg(axis: TransformAxis, valueDeg: number): void {
    const target = getSelectedTransformObject();
    if (!target || !Number.isFinite(valueDeg)) {
      return;
    }

    target.rotation[axis] = THREE.MathUtils.degToRad(valueDeg);
    updateTransformPanelValues();
  }

  function setSelectedTransformScale(axis: TransformAxis, value: number): void {
    const target = getSelectedTransformObject();
    if (!target || !Number.isFinite(value)) {
      return;
    }

    target.scale[axis] = clamp(value, TRANSFORM_SCALE_MIN, TRANSFORM_SCALE_MAX);
    updateTransformPanelValues();
  }

  function setSelectedUniformScale(value: number): void {
    const target = getSelectedTransformObject();
    if (!target || !Number.isFinite(value)) {
      return;
    }

    const next = clamp(value, TRANSFORM_SCALE_MIN, TRANSFORM_SCALE_MAX);
    target.scale.set(next, next, next);
    updateTransformPanelValues();
  }

  function resetSelectedTransform(): void {
    if (selectedSlotIndex === null) {
      return;
    }

    const target = getSelectedTransformObject();
    if (!target) {
      return;
    }

    target.position.set(getSlotRowBaseX(selectedSlotIndex, visibleCount), 0, 0);
    target.rotation.set(0, 0, 0);
    target.scale.set(1, 1, 1);
    updateTransformPanelValues();
    notify(`Transform reset on Slot ${selectedSlotIndex + 1}.`);
  }

  function updateSelectionFloorOverlayPlacement(): void {
    if (selectedSlotIndex === null) {
      selectionFloorOverlay.setVisible(false);
      return;
    }

    const slot = slots[selectedSlotIndex];
    if (!slot.isVisible() || !slot.hasModel()) {
      selectionFloorOverlay.setVisible(false);
      return;
    }

    const hasFootprint = slot.getGroundFootprint(selectionFootprintCenter, selectionFootprintSize);
    if (!hasFootprint) {
      selectionFloorOverlay.setVisible(false);
      return;
    }

    selectionFloorOverlay.setVisible(true);
    selectionFloorOverlay.updatePlacement(selectionFootprintCenter, selectionFootprintSize);
  }

  function applyVisibleCount(nextCount: VisibleCount): void {
    const previousCount = visibleCount;
    const previousStartX = -((previousCount - 1) * SLOT_SPACING) * 0.5;
    visibleCount = nextCount;
    const nextStartX = -((nextCount - 1) * SLOT_SPACING) * 0.5;

    for (let i = 0; i < SLOT_CAPACITY; i += 1) {
      const slot = slots[i];
      const transformTarget = slot.getTransformObject();
      let offsetX = 0;
      let offsetY = 0;
      let offsetZ = 0;
      if (slot.hasModel() && transformTarget) {
        const previousBaseX = previousStartX + i * SLOT_SPACING;
        offsetX = transformTarget.position.x - previousBaseX;
        offsetY = transformTarget.position.y;
        offsetZ = transformTarget.position.z;
      }

      if (i < nextCount) {
        slot.setVisible(true);
        if (slot.hasModel() && transformTarget) {
          transformTarget.position.set(nextStartX + i * SLOT_SPACING + offsetX, offsetY, offsetZ);
        } else {
          slot.setPosition(nextStartX + i * SLOT_SPACING, 0);
        }
      } else {
        slot.setVisible(false);
      }
    }

    if (selectedSlotIndex === null || selectedSlotIndex >= nextCount) {
      if (selectedSlotIndex !== null) {
        slots[selectedSlotIndex].setSelected(false);
      }
      selectedSlotIndex = findFirstVisibleModelSlot() ?? toSlotIndex(0);
      slots[selectedSlotIndex].setSelected(true);
    }

    updateTransformControlsAttachment();
    updateTransformPanelValues();
  }

  function refreshPanelAndStore(): void {
    const slotStates = slots.map((slot) => slot.toSlotState());
    panel.setVisibleCount(visibleCount);
    panel.setSlotButtons(slotStates, selectedSlotIndex, visibleCount);

    const modelOptions = library.getModelEntries().map((entry) => ({
      id: entry.id,
      label: entry.label
    }));
    const selectedSlot = selectedSlotIndex === null ? null : slots[selectedSlotIndex];
    const selectedModelId = selectedSlot ? selectedSlot.getModelPackId() : "";
    panel.setModelOptions(modelOptions, selectedModelId);

    if (!selectedSlot) {
      panel.setAnimationOptions([], "");
      panel.setActiveLabel("No active slot");
      const rows: ModelInfoRow[] = [
        { label: "Status", value: "No slot selected" },
        { label: "Polycount", value: "N/A" },
        { label: "Texture", value: "N/A" },
        { label: "Anim Duration", value: "N/A" },
        { label: "File Size", value: "N/A" }
      ];
      panel.setModelInfo("Model Info", rows);
      selectionFloorOverlay.setInfo("Model Stats", rows);
    } else {
      attachAllLoadedClipPacksToSlot(selectedSlot);
      const animationOptions = selectedSlot.getAnimationOptions().map((option) => ({
        id: option.id,
        label: option.label
      }));
      panel.setAnimationOptions(animationOptions, selectedSlot.getActiveClipId());
      const modelLabel = selectedSlot.getModelLabel() || "Empty";
      panel.setActiveLabel(`Slot ${selectedSlotIndex! + 1}: ${modelLabel}`);

      if (!selectedSlot.hasModel()) {
        const rows: ModelInfoRow[] = [
          { label: "Status", value: "No model loaded" },
          { label: "Polycount", value: "N/A" },
          { label: "Texture", value: "N/A" },
          { label: "Anim Duration", value: "N/A" },
          { label: "File Size", value: "N/A" }
        ];
        panel.setModelInfo(`Model Stats: ${modelLabel}`, rows);
        selectionFloorOverlay.setInfo(`Model Stats: ${modelLabel}`, rows);
        store.setState((state) => ({
          ...state,
          visibleCount,
          selectedSlotIndex,
          slots: slotStates
        }));
        updateTransformPanelValues();
        return;
      }

      const stats = selectedSlot.getModelInfoStats();
      const infoRows: ModelInfoRow[] = [
        { label: "Polycount", value: `${formatNumber(stats.triangleCount)} tris` },
        { label: "Vertices", value: formatNumber(stats.vertexCount) },
        { label: "Materials", value: formatNumber(stats.materialCount) },
        { label: "Textures", value: formatNumber(stats.textureCount) },
        { label: "Max Texture", value: stats.maxTextureSize },
        { label: "Anim Clips", value: formatNumber(stats.animationClipCount) },
        { label: "Anim Duration", value: formatDurationSeconds(stats.animationDurationSec) },
        { label: "File Size", value: formatBytes(stats.fileSizeBytes) }
      ];
      panel.setModelInfo(`Model Stats: ${modelLabel}`, infoRows);
      selectionFloorOverlay.setInfo(`Model Stats: ${modelLabel}`, infoRows);
    }

    store.setState((state) => ({
      ...state,
      visibleCount,
      selectedSlotIndex,
      slots: slotStates
    }));
    updateTransformPanelValues();
  }

  function selectSlot(slotIndex: SlotIndex): void {
    if (slotIndex >= visibleCount) {
      return;
    }
    const nextSlot = slots[slotIndex];

    if (selectedSlotIndex !== null && selectedSlotIndex !== slotIndex) {
      slots[selectedSlotIndex].setSelected(false);
    }
    selectedSlotIndex = slotIndex;
    nextSlot.setSelected(true);
    updateTransformControlsAttachment();
    refreshPanelAndStore();
  }

  async function applyModelToSlot(slotIndex: SlotIndex, modelPackId: string): Promise<boolean> {
    try {
      const { entry, pack } = await library.loadModelPack(modelPackId);
      const slot = slots[slotIndex];
      slot.loadModelPack(entry.id, entry.label, pack, entry.fileSizeBytes ?? null);
      slot.setFlipNormals(flipNormals);
      slot.setFlatShading(flatShading);
      slot.setWireframeOverlay(wireframeOverlay);
      slot.setWireframeStyle(wireframeColor, wireframeThickness);
      attachAllLoadedClipPacksToSlot(slot);

      const options = slot.getAnimationOptions();
      if (options.length > 0) {
        slot.playClip(options[0].id, true);
      }

      if (selectedSlotIndex === slotIndex) {
        slot.setSelected(true);
        updateTransformControlsAttachment();
      }
      refreshPanelAndStore();
      return true;
    } catch (error) {
      notify(`Failed to load model pack "${modelPackId}": ${toErrorMessage(error)}`, "error");
      return false;
    }
  }

  async function onVisibleCountChange(nextCount: VisibleCount): Promise<void> {
    applyVisibleCount(nextCount);
    refreshPanelAndStore();
    notify(`Visible characters: ${nextCount}`);
  }

  async function onModelChange(modelPackId: string): Promise<void> {
    if (selectedSlotIndex === null) {
      notify("Select a character before changing model.", "warning");
      return;
    }
    const ok = await applyModelToSlot(selectedSlotIndex, modelPackId);
    if (ok) {
      notify(`Model switched on Slot ${selectedSlotIndex + 1}.`);
    }
  }

  function onAnimationChange(animationId: string): void {
    if (selectedSlotIndex === null) {
      notify("Select a character before changing animation.", "warning");
      return;
    }

    const slot = slots[selectedSlotIndex];
    const ok = slot.playClip(animationId);
    if (!ok) {
      notify("Unable to play selected animation clip.", "warning");
      return;
    }

    refreshPanelAndStore();
    notify(`Animation changed on Slot ${selectedSlotIndex + 1}.`);
  }

  async function onUploadZip(file: File): Promise<void> {
    notify(`Loading ZIP: ${file.name}`);
    try {
      const loaded = await parseRuntimeZipAsset(file);
      const entry = library.registerRuntimePack(
        loaded.parsed.kind,
        loaded.parsed.name,
        loaded.pack,
        loaded.revoke,
        loaded.parsed.fbxSizeBytes
      );

      if (loaded.parsed.kind === "model_with_clip") {
        if (selectedSlotIndex === null) {
          selectedSlotIndex = findFirstVisibleModelSlot() ?? toSlotIndex(0);
          if (selectedSlotIndex !== null) {
            slots[selectedSlotIndex].setSelected(true);
          }
        }
        if (selectedSlotIndex === null) {
          notify("Model uploaded, but no selectable slot is available.", "warning");
          refreshPanelAndStore();
          return;
        }
        await applyModelToSlot(selectedSlotIndex, entry.id);
        notify(`Uploaded model applied to Slot ${selectedSlotIndex + 1}.`);
        return;
      }

      let appliedToSelected = false;
      for (const slot of slots) {
        if (!slot.hasModel()) {
          continue;
        }
        const added = slot.attachClipPack(entry.id, entry.label, loaded.pack);
        if (selectedSlotIndex !== null && slot === slots[selectedSlotIndex] && added.length > 0) {
          slot.playClip(added[0], false);
          appliedToSelected = true;
        }
      }

      refreshPanelAndStore();
      if (appliedToSelected) {
        notify("Clip uploaded and applied to selected character.");
      } else {
        notify(
          "Clip uploaded but incompatible with selected model. It remains available for compatible models.",
          "warning"
        );
      }
    } catch (error) {
      notify(`ZIP upload failed: ${toErrorMessage(error)}`, "error");
    }
  }

  async function onUploadZipFromUrl(rawUrl: string): Promise<void> {
    notify("Downloading ZIP from URL...");
    try {
      const remoteZip = await downloadZipFromRemoteUrl(rawUrl);
      await onUploadZip(remoteZip);
    } catch (error) {
      notify(`URL import failed: ${toErrorMessage(error)}`, "error");
    }
  }

  panel = createShowcasePanel(appRoot, {
    onVisibleCountChange: (count) => {
      void onVisibleCountChange(count);
    },
    onModelChange: onModelChange,
    onAnimationChange: onAnimationChange,
    onUploadZip: onUploadZip,
    onUploadZipFromUrl: onUploadZipFromUrl,
    onTransformPositionChange: (axis, value) => {
      setSelectedTransformPosition(axis, value);
    },
    onTransformRotationChange: (axis, valueDeg) => {
      setSelectedTransformRotationDeg(axis, valueDeg);
    },
    onTransformScaleChange: (axis, value) => {
      setSelectedTransformScale(axis, value);
    },
    onTransformUniformScaleChange: (value) => {
      setSelectedUniformScale(value);
    },
    onResetTransform: () => {
      resetSelectedTransform();
    },
    onModelStatisticsVisibilityChange: (enabled) => {
      modelStatisticsVisible = enabled;
      applyModelStatisticsOverlayOptions();
    },
    onModelStatisticsColorChange: (color) => {
      modelStatisticsColor = color;
      applyModelStatisticsOverlayOptions();
    },
    onSelectSlot: (slotIndex) => {
      try {
        selectSlot(toSlotIndex(slotIndex));
      } catch (error) {
        notify(`Invalid slot selection: ${toErrorMessage(error)}`, "warning");
      }
    },
    onEnvironmentPresetChange: (preset) => {
      stage.setEnvironmentPreset(preset);
      panel.setHdriSettings(stage.getHdriSettings());
      panel.setFogSettings(stage.getFogSettings());
      panel.setGridValues(stage.getGridSettings());
      notify(`Environment preset: ${preset === "studio_clay" ? "Studio Clay" : "Showcase Grid"}`);
    },
    onSaveEnvironmentPreset: () => {
      saveCurrentEnvironmentPreset();
    },
    onLoadEnvironmentPreset: () => {
      loadSavedEnvironmentPreset();
    },
    onHdriUpload: async (file) => {
      try {
        await stage.loadHdri(file);
        panel.setHdriSettings(stage.getHdriSettings());
        notify(`HDRI loaded: ${file.name}`);
      } catch (error) {
        notify(`HDRI load failed: ${toErrorMessage(error)}`, "error");
      }
    },
    onHdriEnabledChange: (enabled) => {
      stage.setHdriSettings({ enabled });
      panel.setHdriSettings(stage.getHdriSettings());
    },
    onHdriBackgroundVisibilityChange: (showBackground) => {
      stage.setHdriSettings({ showBackground });
      panel.setHdriSettings(stage.getHdriSettings());
    },
    onHdriRotationChange: (rotationDeg) => {
      stage.setHdriSettings({ rotationDeg });
      panel.setHdriSettings(stage.getHdriSettings());
    },
    onHdriIntensityChange: (intensity) => {
      stage.setHdriSettings({ intensity });
      panel.setHdriSettings(stage.getHdriSettings());
    },
    onHdriBackgroundIntensityChange: (backgroundIntensity) => {
      stage.setHdriSettings({ backgroundIntensity });
      panel.setHdriSettings(stage.getHdriSettings());
    },
    onFogEnabledChange: (enabled) => {
      stage.setFogSettings({ enabled });
    },
    onFogColorChange: (color) => {
      stage.setFogSettings({ color });
    },
    onFogDensityChange: (density) => {
      stage.setFogSettings({ density });
    },
    onFogFalloffChange: (falloff) => {
      stage.setFogSettings({ falloff });
    },
    onGridCellSizeChange: (cellSize) => {
      stage.setGridSettings({ cellSize });
    },
    onGridLineWidthChange: (lineWidth) => {
      stage.setGridSettings({ lineWidth });
    },
    onGridLineStrengthChange: (lineStrength) => {
      stage.setGridSettings({ lineStrength });
    },
    onGridRoughnessChange: (roughness) => {
      stage.setGridSettings({ roughness });
    },
    onGridEdgeTransparencyChange: (edgeTransparency) => {
      stage.setGridSettings({ edgeTransparency });
    },
    onBackgroundColorChange: (backgroundColor) => {
      stage.setGridSettings({ backgroundColor });
    },
    onBackgroundAlphaChange: (backgroundAlpha) => {
      stage.setGridSettings({ backgroundAlpha });
    },
    onGridBaseColorChange: (gridBaseColor) => {
      stage.setGridSettings({ gridBaseColor });
    },
    onGridBaseAlphaChange: (gridBaseAlpha) => {
      stage.setGridSettings({ gridBaseAlpha });
    },
    onGridMajorColorChange: (gridMajorColor) => {
      stage.setGridSettings({ gridMajorColor });
    },
    onGridMajorAlphaChange: (gridMajorAlpha) => {
      stage.setGridSettings({ gridMajorAlpha });
    },
    onGridMinorColorChange: (gridMinorColor) => {
      stage.setGridSettings({ gridMinorColor });
    },
    onGridMinorAlphaChange: (gridMinorAlpha) => {
      stage.setGridSettings({ gridMinorAlpha });
    },
    onWireframeOverlayChange: (enabled) => {
      wireframeOverlay = enabled;
      applyShadingOptionsToAllSlots();
    },
    onWireframeColorChange: (color) => {
      wireframeColor = color;
      applyShadingOptionsToAllSlots();
    },
    onWireframeThicknessChange: (thickness) => {
      wireframeThickness = thickness;
      applyShadingOptionsToAllSlots();
    },
    onFlipNormalsChange: (enabled) => {
      flipNormals = enabled;
      applyShadingOptionsToAllSlots();
    },
    onFlatShadingChange: (enabled) => {
      flatShading = enabled;
      applyShadingOptionsToAllSlots();
    }
  });

  applyUiTheme();
  panel.setEnvironmentPreset(stage.getEnvironmentPreset());
  panel.setHdriSettings(stage.getHdriSettings());
  panel.setFogSettings(stage.getFogSettings());
  const initialGridSettings = stage.getGridSettings();
  panel.setGridValues(initialGridSettings);
  updateSavedPresetIndicator();
  panel.setNormalOptions({ flipNormals, flatShading });
  panel.setWireframeOverlay(wireframeOverlay);
  panel.setWireframeStyle({ color: wireframeColor, thickness: wireframeThickness });
  panel.setModelStatisticsOptions({
    visible: modelStatisticsVisible,
    color: modelStatisticsColor
  });
  applyModelStatisticsOverlayOptions();
  updateTransformPanelValues();

  const cameraTargetGoal = new THREE.Vector3(0, 1, 0);
  const previousTarget = new THREE.Vector3();
  const targetDelta = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const pickablesBuffer: THREE.Object3D[] = [];
  let pointerDownX = 0;
  let pointerDownY = 0;

  updateNavigationButtonsActiveState();
  setControlsHintForNavigationMode(navigationMode);
  updateOrbitControlsEnabled();

  function onTransformDraggingChanged(
    event: TransformControlsEventMap["dragging-changed"]
  ): void {
    transformDragging = Boolean(event.value);
    updateOrbitControlsEnabled();
  }

  function onTransformObjectChange(): void {
    updateTransformPanelValues();
  }

  transformControls.addEventListener("dragging-changed", onTransformDraggingChanged);
  transformControls.addEventListener("objectChange", onTransformObjectChange);

  function collectPickables(): void {
    pickablesBuffer.length = 0;
    for (let i = 0; i < visibleCount; i += 1) {
      pickablesBuffer.push(...slots[i].getPickableObjects());
    }
  }

  function pickSlotAtPointer(event: PointerEvent): SlotIndex | null {
    collectPickables();
    if (pickablesBuffer.length === 0) {
      return null;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    const intersections = raycaster.intersectObjects(pickablesBuffer, false);
    for (const hit of intersections) {
      const slotIndex = hit.object.userData.slotIndex;
      if (
        typeof slotIndex === "number" &&
        Number.isInteger(slotIndex) &&
        slotIndex >= 0 &&
        slotIndex < SLOT_CAPACITY
      ) {
        return toSlotIndex(slotIndex);
      }
    }
    return null;
  }

  function onPointerDown(event: PointerEvent): void {
    if (navigationMode === "wasd" && event.button === 2) {
      wasdLookActive = true;
      wasdLastPointerX = event.clientX;
      wasdLastPointerY = event.clientY;
      renderer.domElement.style.cursor = "grabbing";
      updateOrbitControlsEnabled();
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  }

  function onPointerMove(event: PointerEvent): void {
    if (navigationMode !== "wasd" || !wasdLookActive) {
      return;
    }

    const dx =
      typeof event.movementX === "number" ? event.movementX : event.clientX - wasdLastPointerX;
    const dy =
      typeof event.movementY === "number" ? event.movementY : event.clientY - wasdLastPointerY;
    wasdLastPointerX = event.clientX;
    wasdLastPointerY = event.clientY;

    wasdYaw -= dx * WASD_LOOK_SENSITIVITY;
    wasdPitch = clamp(
      wasdPitch - dy * WASD_LOOK_SENSITIVITY,
      -Math.PI * 0.495,
      Math.PI * 0.495
    );
    applyWasdRotationToCamera();
    event.preventDefault();
  }

  function onPointerUp(event: PointerEvent): void {
    if (navigationMode === "wasd" && event.button === 2) {
      wasdLookActive = false;
      renderer.domElement.style.cursor = "default";
      updateOrbitControlsEnabled();
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }
    if (transformDragging || transformControls.axis !== null) {
      return;
    }
    const dx = event.clientX - pointerDownX;
    const dy = event.clientY - pointerDownY;
    if (dx * dx + dy * dy > CLICK_SLOP_SQ) {
      return;
    }

    const hit = pickSlotAtPointer(event);
    if (hit !== null) {
      selectSlot(hit);
    }
  }

  function onPointerLeave(): void {
    if (!wasdLookActive) {
      return;
    }
    wasdLookActive = false;
    renderer.domElement.style.cursor = "default";
    updateOrbitControlsEnabled();
  }

  function onContextMenu(event: MouseEvent): void {
    if (navigationMode !== "wasd") {
      return;
    }
    event.preventDefault();
  }

  function onResize(): void {
    resizeRenderer(renderer, camera, viewport);
  }

  function isTypingInField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.isContentEditable) {
      return true;
    }

    const tagName = target.tagName;
    return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (isTypingInField(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (navigationMode === "wasd") {
      const handledMovement = setWasdMovementKey(key, true);
      if (handledMovement) {
        event.preventDefault();
        return;
      }
    }

    let nextMode: "translate" | "rotate" | "scale" | null = null;
    if (navigationMode !== "wasd" && key === "w") {
      nextMode = "translate";
    } else if (navigationMode !== "wasd" && key === "e") {
      nextMode = "rotate";
    } else if (navigationMode !== "wasd" && key === "r") {
      nextMode = "scale";
    }

    if (!nextMode) {
      return;
    }

    transformControls.setMode(nextMode);
    event.preventDefault();
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (navigationMode !== "wasd") {
      return;
    }

    const key = event.key.toLowerCase();
    const handledMovement = setWasdMovementKey(key, false);
    if (handledMovement) {
      event.preventDefault();
    }
  }

  async function initializeScene(): Promise<void> {
    applyVisibleCount(visibleCount);

    const modelEntries = library.getModelEntries();
    if (modelEntries.length === 0) {
      selectedSlotIndex = toSlotIndex(0);
      slots[selectedSlotIndex].setSelected(true);
      updateTransformControlsAttachment();
      refreshPanelAndStore();
      notify("No model packs found. Add entries to public/packs/manifest.json.", "warning");
      return;
    }

    for (let i = 0; i < SLOT_CAPACITY; i += 1) {
      const entry = modelEntries[i % modelEntries.length];
      await applyModelToSlot(toSlotIndex(i), entry.id);
    }

    selectedSlotIndex = findFirstVisibleModelSlot();
    if (selectedSlotIndex !== null) {
      slots[selectedSlotIndex].setSelected(true);
    } else {
      selectedSlotIndex = toSlotIndex(0);
      slots[selectedSlotIndex].setSelected(true);
    }

    updateTransformControlsAttachment();
    refreshPanelAndStore();

    await library.preloadClipPacks((entry, error) => {
      notify(
        `Clip pack "${entry.label}" failed to preload: ${toErrorMessage(error)}`,
        "warning"
      );
    });

    for (const slot of slots) {
      if (!slot.hasModel()) {
        continue;
      }
      attachAllLoadedClipPacksToSlot(slot);
    }
    refreshPanelAndStore();
  }

  const clock = new THREE.Clock();
  let rafId = 0;

  function animate(): void {
    if (disposed) {
      return;
    }
    rafId = window.requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    for (const slot of slots) {
      slot.update(dt);
    }

    if (navigationMode === "locked") {
      updateCameraTargetGoal(cameraTargetGoal);
      previousTarget.copy(controls.target);
      const follow = 1 - Math.exp(-dt * CAMERA_TARGET_FOLLOW);
      controls.target.lerp(cameraTargetGoal, follow);
      targetDelta.subVectors(controls.target, previousTarget);
      camera.position.add(targetDelta);
      controls.update();
    } else if (navigationMode === "free") {
      controls.update();
    } else {
      updateWasdNavigation(dt);
    }
    updateSelectionFloorOverlayPlacement();
    renderer.render(scene, camera);
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;

    window.cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("beforeunload", dispose);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
    renderer.domElement.removeEventListener("contextmenu", onContextMenu);
    transformControls.removeEventListener("dragging-changed", onTransformDraggingChanged);
    transformControls.removeEventListener("objectChange", onTransformObjectChange);

    panel.dispose();
    controls.dispose();
    transformControls.detach();
    transformControls.dispose();
    scene.remove(transformHelper);
    selectionFloorOverlay.dispose(scene);
    stage.dispose();
    library.dispose();
    for (const slot of slots) {
      slot.dispose();
    }
    renderer.dispose();
    scene.remove(rowGroup);

    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
    controlsHint.remove();
    navigationPanel.remove();
    viewport.remove();
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("beforeunload", dispose);

  onResize();
  await initializeScene();
  animate();
}
