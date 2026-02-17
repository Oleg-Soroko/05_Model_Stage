import * as THREE from "three";
import { readExr } from "hdrify";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export interface GridFloorSettings {
  cellSize: number;
  lineWidth: number;
  lineStrength: number;
  roughness: number;
  edgeTransparency: number;
  backgroundColor: string;
  backgroundAlpha: number;
  gridBaseColor: string;
  gridBaseAlpha: number;
  gridMajorColor: string;
  gridMajorAlpha: number;
  gridMinorColor: string;
  gridMinorAlpha: number;
}

export interface FogSettings {
  enabled: boolean;
  color: string;
  density: number;
  falloff: number;
}

export type EnvironmentPreset = "showcase_grid" | "studio_clay";

export interface HdriSettings {
  loaded: boolean;
  name: string;
  enabled: boolean;
  showBackground: boolean;
  rotationDeg: number;
  intensity: number;
  backgroundIntensity: number;
  backgroundBlur: number;
}

export interface StageHandle {
  getFogDensity: () => number;
  setFogDensity: (density: number) => void;
  getFogSettings: () => FogSettings;
  setFogSettings: (settings: Partial<FogSettings>) => void;
  getEnvironmentPreset: () => EnvironmentPreset;
  setEnvironmentPreset: (preset: EnvironmentPreset) => void;
  getHdriSettings: () => HdriSettings;
  setHdriSettings: (settings: Partial<HdriSettings>) => void;
  loadHdri: (file: File) => Promise<void>;
  getGridSettings: () => GridFloorSettings;
  setGridSettings: (settings: Partial<GridFloorSettings>) => void;
  isDarkMode: () => boolean;
  setDarkMode: (enabled: boolean) => void;
  dispose: () => void;
}

const FLOOR_SIZE = 280;
const ORIGIN_DOT_RADIUS = 0.085;
const GRID_TEXTURE_SIZE = 1024;
const BG_TEX_WIDTH = 64;
const BG_TEX_HEIGHT = 1024;

const DEFAULT_FOG_DENSITY = 0.06;
const DEFAULT_FOG_FALLOFF = 1;
const LIGHT_FOG_COLOR_HEX = "#c5ced8";
const DARK_FOG_COLOR_HEX = "#0a0f14";
const STUDIO_FOG_COLOR_HEX = "#3f464f";
const MAX_HDRI_INTENSITY = 8;
const MAX_HDRI_BACKGROUND_BLUR = 1;
const GRID_EDGE_TRANSPARENCY_MIN = 1;
const GRID_EDGE_TRANSPARENCY_MAX = 20;

const LIGHT_GRID_COLORS = {
  backgroundColor: "#c5ced8",
  backgroundAlpha: 1,
  gridBaseColor: "#b7c0ca",
  gridBaseAlpha: 1,
  gridMajorColor: "#8c98a5",
  gridMajorAlpha: 0.82,
  gridMinorColor: "#9da8b4",
  gridMinorAlpha: 0.72
};

const DARK_GRID_COLORS = {
  backgroundColor: "#121820",
  backgroundAlpha: 1,
  gridBaseColor: "#0f1318",
  gridBaseAlpha: 1,
  gridMajorColor: "#3c4652",
  gridMajorAlpha: 0.68,
  gridMinorColor: "#28313a",
  gridMinorAlpha: 0.58
};

const DEFAULT_GRID_SETTINGS: GridFloorSettings = {
  cellSize: 1.4,
  lineWidth: 0.012,
  lineStrength: 0.38,
  roughness: 0.95,
  edgeTransparency: 16.6,
  ...LIGHT_GRID_COLORS
};

const SHOWCASE_GRID_GRID_SETTINGS: Partial<GridFloorSettings> = {
  cellSize: 1.4,
  lineWidth: 0.012,
  lineStrength: 0.38,
  roughness: 0.95,
  edgeTransparency: 16.6,
  ...LIGHT_GRID_COLORS
};

const SHOWCASE_GRID_FOG_SETTINGS: FogSettings = {
  enabled: true,
  color: LIGHT_FOG_COLOR_HEX,
  density: DEFAULT_FOG_DENSITY,
  falloff: DEFAULT_FOG_FALLOFF
};

const STUDIO_CLAY_GRID_SETTINGS: Partial<GridFloorSettings> = {
  cellSize: 1.4,
  lineWidth: 0.012,
  lineStrength: 1.0,
  roughness: 0.65,
  edgeTransparency: 1.0,
  backgroundColor: "#2f343b",
  backgroundAlpha: 1,
  gridBaseColor: "#545b63",
  gridBaseAlpha: 1,
  gridMajorColor: "#727981",
  gridMajorAlpha: 0.41,
  gridMinorColor: "#6a7179",
  gridMinorAlpha: 0.78
};

const STUDIO_CLAY_FOG_SETTINGS: FogSettings = {
  enabled: true,
  color: STUDIO_FOG_COLOR_HEX,
  density: 0.04,
  falloff: 1.2
};

const DEFAULT_HDRI_SETTINGS: HdriSettings = {
  loaded: false,
  name: "",
  enabled: false,
  showBackground: false,
  rotationDeg: 0,
  intensity: 1,
  backgroundIntensity: 1,
  backgroundBlur: 0
};

function pickHdriLoader(fileName: string): RGBELoader | EXRLoader {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".exr")) {
    return new EXRLoader();
  }
  return new RGBELoader();
}

function isExrFile(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith(".exr");
}

function buildExrFallbackTextureFromHdrify(exrBytes: Uint8Array): THREE.DataTexture {
  const decoded = readExr(exrBytes);
  if (!decoded || !decoded.width || !decoded.height || !(decoded.data instanceof Float32Array)) {
    throw new Error("EXR fallback decoder returned invalid image data.");
  }

  const texture = new THREE.DataTexture(
    decoded.data,
    decoded.width,
    decoded.height,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeGridEdgeTransparency(edgeTransparency: number): number {
  const normalized =
    (edgeTransparency - GRID_EDGE_TRANSPARENCY_MIN) /
    (GRID_EDGE_TRANSPARENCY_MAX - GRID_EDGE_TRANSPARENCY_MIN);
  return clamp(normalized, 0, 1);
}

function sanitizeHexColor(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }
  return fallback;
}

function sanitizeAlpha(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return clamp(value, 0, 1);
}

function colorToRgbaString(color: THREE.Color, alpha: number): string {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function createBackgroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = BG_TEX_WIDTH;
  canvas.height = BG_TEX_HEIGHT;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function paintBackgroundTexture(
  texture: THREE.CanvasTexture,
  backgroundColor: string,
  backgroundAlpha: number,
  darkMode: boolean,
  preset: EnvironmentPreset,
  fog: FogSettings
): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create 2D context for background texture.");
  }

  const fogColor = new THREE.Color(
    sanitizeHexColor(fog.color, darkMode ? DARK_FOG_COLOR_HEX : LIGHT_FOG_COLOR_HEX)
  );
  const selectedColor = new THREE.Color(
    sanitizeHexColor(
      backgroundColor,
      preset === "studio_clay" ? "#2f343b" : darkMode ? "#121820" : "#c5ced8"
    )
  );
  const alpha = clamp(backgroundAlpha, 0, 1);
  const baseColor = new THREE.Color(darkMode ? 0x000000 : 0xf6f9fd).lerp(selectedColor, alpha);
  const solidBackground = fog.enabled ? fogColor : baseColor;

  ctx.fillStyle = `#${solidBackground.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  texture.needsUpdate = true;
}

function createGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_TEXTURE_SIZE;
  canvas.height = GRID_TEXTURE_SIZE;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function drawDottedGridTexture(
  texture: THREE.CanvasTexture,
  settings: GridFloorSettings
): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const size = canvas.width;
  const majorCells = 4;
  const minorDivisions = 4;
  const totalMinor = majorCells * minorDivisions;
  const majorLineWidth = clamp(Math.round(settings.lineWidth * size * 0.2), 1, 18);
  const minorLineWidth = Math.max(1, Math.round(majorLineWidth * 0.55));
  const strength = clamp(settings.lineStrength, 0, 1);

  const baseColor = new THREE.Color(sanitizeHexColor(settings.gridBaseColor, "#b7c0ca"));
  const majorColor = new THREE.Color(sanitizeHexColor(settings.gridMajorColor, "#8c98a5"));
  const minorColor = new THREE.Color(sanitizeHexColor(settings.gridMinorColor, "#9da8b4"));

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = colorToRgbaString(baseColor, settings.gridBaseAlpha);
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.strokeStyle = colorToRgbaString(
    minorColor,
    (0.12 + strength * 0.44) * clamp(settings.gridMinorAlpha, 0, 1)
  );
  ctx.lineWidth = minorLineWidth;
  ctx.setLineDash([minorLineWidth * 1.2, minorLineWidth * 2.8]);

  for (let i = 1; i < totalMinor; i += 1) {
    if (i % minorDivisions === 0) {
      continue;
    }

    const p = (i / totalMinor) * size;

    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = colorToRgbaString(
    majorColor,
    (0.28 + strength * 0.6) * clamp(settings.gridMajorAlpha, 0, 1)
  );
  for (let i = 0; i <= majorCells; i += 1) {
    const p = Math.round((i / majorCells) * size);
    ctx.fillRect(p - Math.floor(majorLineWidth * 0.5), 0, majorLineWidth, size);
    ctx.fillRect(0, p - Math.floor(majorLineWidth * 0.5), size, majorLineWidth);
  }

  texture.needsUpdate = true;
}

function createFloorFadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create 2D context for floor fade texture.");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawFloorFadeTexture(
  texture: THREE.CanvasTexture,
  edgeTransparency: number
): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const edgeAlpha = 1 - normalizeGridEdgeTransparency(edgeTransparency);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const radial = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.58,
    canvas.width * 0.08,
    canvas.width * 0.5,
    canvas.height * 0.58,
    canvas.width * 0.98
  );
  radial.addColorStop(0, "rgba(255,255,255,1)");
  radial.addColorStop(0.34, "rgba(255,255,255,1)");
  radial.addColorStop(0.7, "rgba(255,255,255,0.72)");
  radial.addColorStop(1, `rgba(255,255,255,${edgeAlpha.toFixed(3)})`);

  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";

  texture.needsUpdate = true;
}

export function createStudioStage(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): StageHandle {
  let darkMode = false;
  let environmentPreset: EnvironmentPreset = "showcase_grid";
  let gridSettings: GridFloorSettings = { ...DEFAULT_GRID_SETTINGS };
  let fogColorAuto = true;
  let hdriSettings: HdriSettings = { ...DEFAULT_HDRI_SETTINGS };
  let hdriBackgroundTexture: THREE.DataTexture | null = null;
  let hdriEnvironmentTexture: THREE.Texture | null = null;
  let hdriObjectUrl: string | null = null;
  let fogSettings: FogSettings = {
    enabled: true,
    color: LIGHT_FOG_COLOR_HEX,
    density: DEFAULT_FOG_DENSITY,
    falloff: DEFAULT_FOG_FALLOFF
  };
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const floorFadeUniforms = {
    start: { value: 58.0 },
    end: { value: 136.0 }
  };

  const backgroundTexture = createBackgroundTexture();
  const gridTexture = createGridTexture();
  const floorFadeTexture = createFloorFadeTexture();
  drawFloorFadeTexture(floorFadeTexture, gridSettings.edgeTransparency);

  paintBackgroundTexture(
    backgroundTexture,
    gridSettings.backgroundColor,
    gridSettings.backgroundAlpha,
    darkMode,
    environmentPreset,
    fogSettings
  );
  drawDottedGridTexture(gridTexture, gridSettings);

  scene.background = backgroundTexture;
  scene.fog = new THREE.FogExp2(new THREE.Color(fogSettings.color).getHex(), 0);
  scene.environment = null;
  scene.environmentIntensity = 1;
  scene.backgroundIntensity = 1;
  scene.backgroundBlurriness = 0;
  scene.environmentRotation.set(0, 0, 0);
  scene.backgroundRotation.set(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xf4f8ff, 0x838d98, 1.08);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(6.8, 9.8, 6.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 36;
  keyLight.shadow.camera.left = -12;
  keyLight.shadow.camera.right = 12;
  keyLight.shadow.camera.top = 12;
  keyLight.shadow.camera.bottom = -12;
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd6e5f4, 0.44);
  fillLight.position.set(-6.0, 4.2, -4.8);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xf0f5ff, 0.36);
  rimLight.position.set(-7.2, 7.6, -6.0);
  scene.add(rimLight);

  const topLight = new THREE.DirectionalLight(0xffffff, 0.2);
  topLight.position.set(0, 11.0, 2.2);
  scene.add(topLight);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: gridSettings.roughness,
    metalness: 0,
    map: gridTexture,
    alphaMap: floorFadeTexture,
    transparent: true,
    opacity: 1,
    depthWrite: false
  });

  floorMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uDistanceFadeStart = floorFadeUniforms.start;
    shader.uniforms.uDistanceFadeEnd = floorFadeUniforms.end;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uDistanceFadeStart;\nuniform float uDistanceFadeEnd;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphamap_fragment>",
      `#include <alphamap_fragment>\nfloat _distanceFade = 1.0 - smoothstep(uDistanceFadeStart, uDistanceFadeEnd, length(vViewPosition));\n_distanceFade = pow(clamp(_distanceFade, 0.0, 1.0), 1.8);\ndiffuseColor.a *= _distanceFade;`
    );
  };
  floorMaterial.customProgramCacheKey = () => "stage-floor-distance-fade-v5";

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  scene.add(floor);

  const originDotGeometry = new THREE.CircleGeometry(ORIGIN_DOT_RADIUS, 32);
  const originDotMaterial = new THREE.MeshBasicMaterial({
    color: 0x9aa6b2,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
    depthWrite: false
  });
  const originDot = new THREE.Mesh(originDotGeometry, originDotMaterial);
  originDot.rotation.x = -Math.PI / 2;
  originDot.position.set(0, 0.004, 0);
  originDot.renderOrder = 400;
  originDot.frustumCulled = false;
  scene.add(originDot);

  const originDotColor = new THREE.Color();
  const originDotHighlight = new THREE.Color(0xffffff);

  function applyGridRepeat(): void {
    const repeat = FLOOR_SIZE / Math.max(gridSettings.cellSize * 4, 0.1);
    gridTexture.repeat.set(repeat, repeat);
  }

  function updateOriginDotAppearance(): void {
    const fallback = environmentPreset === "studio_clay" ? "#727981" : "#8c98a5";
    originDotColor.set(sanitizeHexColor(gridSettings.gridMajorColor, fallback));
    const lift = darkMode || environmentPreset === "studio_clay" ? 0.34 : 0.2;
    originDotMaterial.color.copy(originDotColor).lerp(originDotHighlight, lift);
    originDotMaterial.opacity =
      clamp(0.42 + gridSettings.lineStrength * 0.52, 0.26, 0.92) *
      clamp(gridSettings.gridMajorAlpha, 0, 1);
    originDotMaterial.needsUpdate = true;
  }

  function applyHdriToScene(): void {
    const hasHdri =
      hdriSettings.loaded && hdriBackgroundTexture !== null && hdriEnvironmentTexture !== null;
    const rotationY = THREE.MathUtils.degToRad(hdriSettings.rotationDeg);

    scene.environmentRotation.set(0, rotationY, 0);
    scene.backgroundRotation.set(0, rotationY, 0);
    scene.environmentIntensity = clamp(hdriSettings.intensity, 0, MAX_HDRI_INTENSITY);
    scene.backgroundIntensity = clamp(
      hdriSettings.backgroundIntensity,
      0,
      MAX_HDRI_INTENSITY
    );
    scene.backgroundBlurriness =
      hasHdri && hdriSettings.showBackground
        ? clamp(hdriSettings.backgroundBlur, 0, MAX_HDRI_BACKGROUND_BLUR)
        : 0;

    scene.environment =
      hasHdri && hdriSettings.enabled && hdriEnvironmentTexture ? hdriEnvironmentTexture : null;

    if (hasHdri && hdriSettings.showBackground && hdriBackgroundTexture) {
      scene.background = hdriBackgroundTexture;
      return;
    }

    scene.background = backgroundTexture;
  }

  function getBaseDistanceFade(): { start: number; end: number } {
    if (darkMode) {
      return { start: 72.0, end: 214.0 };
    }
    return { start: 80.0, end: 228.0 };
  }

  function updateFloorDistanceFade(): void {
    const base = getBaseDistanceFade();
    const falloffScale = fogSettings.enabled ? 1 / clamp(fogSettings.falloff, 0.2, 4) : 1;
    const edgeFade = normalizeGridEdgeTransparency(gridSettings.edgeTransparency);
    const startScale = THREE.MathUtils.lerp(1.18, 0.62, edgeFade);
    const endScale = THREE.MathUtils.lerp(1.28, 0.82, edgeFade);
    floorFadeUniforms.start.value = base.start * falloffScale * startScale;
    floorFadeUniforms.end.value = base.end * falloffScale * endScale;
  }

  function applyFogSettings(): void {
    const fog = scene.fog;
    if (!fog || !(fog instanceof THREE.FogExp2)) {
      return;
    }

    fog.color.setHex(new THREE.Color(fogSettings.color).getHex());
    const effectiveDensity =
      fogSettings.enabled
        ? clamp(fogSettings.density, 0, 0.6) * clamp(fogSettings.falloff, 0.2, 4)
        : 0;
    fog.density = effectiveDensity;

    updateFloorDistanceFade();
  }

  function updateThemeVisuals(): void {
    paintBackgroundTexture(
      backgroundTexture,
      gridSettings.backgroundColor,
      gridSettings.backgroundAlpha,
      darkMode,
      environmentPreset,
      fogSettings
    );
    drawDottedGridTexture(gridTexture, gridSettings);
    updateOriginDotAppearance();

    if (environmentPreset === "studio_clay") {
      hemi.color.setHex(0xa8b4c2);
      hemi.groundColor.setHex(0x06090e);
      hemi.intensity = 0.1;

      keyLight.color.setHex(0xf8fbff);
      keyLight.intensity = 1.52;
      keyLight.position.set(7.8, 8.8, 6.4);

      fillLight.color.setHex(0xcdd9e8);
      fillLight.intensity = 0.24;
      fillLight.position.set(-8.6, 4.6, 3.4);

      rimLight.color.setHex(0xf2f7ff);
      rimLight.intensity = 0.76;
      rimLight.position.set(-4.5, 8.4, -8.2);

      topLight.color.setHex(0xffffff);
      topLight.intensity = 0.52;
      topLight.position.set(0.8, 10.8, 2.8);
    } else if (darkMode) {
      hemi.color.setHex(0x8290a2);
      hemi.groundColor.setHex(0x060b11);
      hemi.intensity = 0.18;

      keyLight.color.setHex(0xffffff);
      keyLight.intensity = 1.18;
      keyLight.position.set(6.8, 9.8, 6.2);

      fillLight.color.setHex(0xb4c0ce);
      fillLight.intensity = 0.14;
      fillLight.position.set(-6.0, 4.2, -4.8);

      rimLight.color.setHex(0xdce7f6);
      rimLight.intensity = 0.4;
      rimLight.position.set(-7.2, 7.6, -6.0);

      topLight.color.setHex(0xffffff);
      topLight.intensity = 0.2;
      topLight.position.set(0, 11.0, 2.2);
    } else {
      hemi.color.setHex(0xf4f8ff);
      hemi.groundColor.setHex(0x838d98);
      hemi.intensity = 1.08;

      keyLight.color.setHex(0xffffff);
      keyLight.intensity = 1.3;
      keyLight.position.set(6.8, 9.8, 6.2);

      fillLight.color.setHex(0xd6e5f4);
      fillLight.intensity = 0.44;
      fillLight.position.set(-6.0, 4.2, -4.8);

      rimLight.color.setHex(0xf0f5ff);
      rimLight.intensity = 0.36;
      rimLight.position.set(-7.2, 7.6, -6.0);

      topLight.color.setHex(0xffffff);
      topLight.intensity = 0.2;
      topLight.position.set(0, 11.0, 2.2);
    }

    floorMaterial.roughness = gridSettings.roughness;
    floorMaterial.needsUpdate = true;

    applyFogSettings();
    applyHdriToScene();
  }

  function setFogDensity(density: number): void {
    setFogSettings({ density });
  }

  function setFogSettings(next: Partial<FogSettings>): void {
    if (typeof next.color === "string") {
      fogSettings.color = sanitizeHexColor(next.color, fogSettings.color);
      fogColorAuto = false;
    }

    fogSettings = {
      enabled: typeof next.enabled === "boolean" ? next.enabled : fogSettings.enabled,
      color: fogSettings.color,
      density: clamp(next.density ?? fogSettings.density, 0, 0.6),
      falloff: clamp(next.falloff ?? fogSettings.falloff, 0.2, 4)
    };

    applyFogSettings();
    paintBackgroundTexture(
      backgroundTexture,
      gridSettings.backgroundColor,
      gridSettings.backgroundAlpha,
      darkMode,
      environmentPreset,
      fogSettings
    );
    applyHdriToScene();
  }

  function setGridSettings(next: Partial<GridFloorSettings>): void {
    gridSettings = {
      cellSize: clamp(next.cellSize ?? gridSettings.cellSize, 0.25, 4.5),
      lineWidth: clamp(next.lineWidth ?? gridSettings.lineWidth, 0.002, 0.09),
      lineStrength: clamp(next.lineStrength ?? gridSettings.lineStrength, 0, 1),
      roughness: clamp(next.roughness ?? gridSettings.roughness, 0.2, 1),
      edgeTransparency: clamp(
        next.edgeTransparency ?? gridSettings.edgeTransparency,
        GRID_EDGE_TRANSPARENCY_MIN,
        GRID_EDGE_TRANSPARENCY_MAX
      ),
      backgroundColor: sanitizeHexColor(next.backgroundColor, gridSettings.backgroundColor),
      backgroundAlpha: sanitizeAlpha(next.backgroundAlpha, gridSettings.backgroundAlpha),
      gridBaseColor: sanitizeHexColor(next.gridBaseColor, gridSettings.gridBaseColor),
      gridBaseAlpha: sanitizeAlpha(next.gridBaseAlpha, gridSettings.gridBaseAlpha),
      gridMajorColor: sanitizeHexColor(next.gridMajorColor, gridSettings.gridMajorColor),
      gridMajorAlpha: sanitizeAlpha(next.gridMajorAlpha, gridSettings.gridMajorAlpha),
      gridMinorColor: sanitizeHexColor(next.gridMinorColor, gridSettings.gridMinorColor),
      gridMinorAlpha: sanitizeAlpha(next.gridMinorAlpha, gridSettings.gridMinorAlpha)
    };

    drawDottedGridTexture(gridTexture, gridSettings);
    drawFloorFadeTexture(floorFadeTexture, gridSettings.edgeTransparency);
    applyGridRepeat();
    updateFloorDistanceFade();
    updateOriginDotAppearance();
    floorMaterial.roughness = gridSettings.roughness;
    floorMaterial.needsUpdate = true;
    paintBackgroundTexture(
      backgroundTexture,
      gridSettings.backgroundColor,
      gridSettings.backgroundAlpha,
      darkMode,
      environmentPreset,
      fogSettings
    );
    applyHdriToScene();
  }

  function setHdriSettings(next: Partial<HdriSettings>): void {
    hdriSettings = {
      ...hdriSettings,
      enabled: typeof next.enabled === "boolean" ? next.enabled : hdriSettings.enabled,
      showBackground:
        typeof next.showBackground === "boolean"
          ? next.showBackground
          : hdriSettings.showBackground,
      rotationDeg: clamp(next.rotationDeg ?? hdriSettings.rotationDeg, -180, 180),
      intensity: clamp(next.intensity ?? hdriSettings.intensity, 0, MAX_HDRI_INTENSITY),
      backgroundIntensity: clamp(
        next.backgroundIntensity ?? hdriSettings.backgroundIntensity,
        0,
        MAX_HDRI_INTENSITY
      ),
      backgroundBlur: clamp(
        next.backgroundBlur ?? hdriSettings.backgroundBlur,
        0,
        MAX_HDRI_BACKGROUND_BLUR
      )
    };

    applyHdriToScene();
  }

  async function loadHdri(file: File): Promise<void> {
    if (!file) {
      throw new Error("HDRI file is required.");
    }

    const exrFile = isExrFile(file.name);
    const objectUrl = URL.createObjectURL(file);
    let nextBackgroundTexture: THREE.DataTexture | null = null;
    let nextEnvironmentTexture: THREE.Texture | null = null;
    let nextObjectUrl: string | null = null;

    try {
      const loader = pickHdriLoader(file.name);
      try {
        nextBackgroundTexture = await loader.loadAsync(objectUrl);
        nextBackgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
        nextBackgroundTexture.needsUpdate = true;
        nextObjectUrl = objectUrl;
      } catch (primaryError) {
        if (!exrFile) {
          throw primaryError;
        }
        const primaryMessage =
          primaryError instanceof Error ? primaryError.message : String(primaryError);
        try {
          const exrBuffer = new Uint8Array(await file.arrayBuffer());
          nextBackgroundTexture = buildExrFallbackTextureFromHdrify(exrBuffer);
          URL.revokeObjectURL(objectUrl);
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(
            `EXR decode failed (three.js: ${primaryMessage}; fallback: ${fallbackMessage})`
          );
        }
      }

      const pmremRenderTarget = pmremGenerator.fromEquirectangular(nextBackgroundTexture);
      nextEnvironmentTexture = pmremRenderTarget.texture;

      const previousBackground = hdriBackgroundTexture;
      const previousEnvironment = hdriEnvironmentTexture;
      const previousObjectUrl = hdriObjectUrl;

      hdriBackgroundTexture = nextBackgroundTexture;
      hdriEnvironmentTexture = nextEnvironmentTexture;
      hdriObjectUrl = nextObjectUrl;
      hdriSettings = {
        ...hdriSettings,
        loaded: true,
        name: file.name,
        enabled: true
      };

      applyHdriToScene();

      if (previousBackground) {
        previousBackground.dispose();
      }
      if (previousEnvironment) {
        previousEnvironment.dispose();
      }
      if (previousObjectUrl) {
        URL.revokeObjectURL(previousObjectUrl);
      }
    } catch (error) {
      if (nextBackgroundTexture) {
        nextBackgroundTexture.dispose();
      }
      if (nextEnvironmentTexture) {
        nextEnvironmentTexture.dispose();
      }
      if (nextObjectUrl !== objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }

  function setEnvironmentPreset(preset: EnvironmentPreset): void {
    environmentPreset = preset;

    if (preset === "studio_clay") {
      darkMode = true;
      gridSettings = {
        ...gridSettings,
        ...STUDIO_CLAY_GRID_SETTINGS
      };

      fogSettings = { ...STUDIO_CLAY_FOG_SETTINGS };
      fogColorAuto = false;
    } else {
      darkMode = false;
      gridSettings = {
        ...gridSettings,
        ...SHOWCASE_GRID_GRID_SETTINGS
      };
      fogSettings = { ...SHOWCASE_GRID_FOG_SETTINGS };
      fogColorAuto = true;
    }

    updateThemeVisuals();
    applyGridRepeat();
  }

  function setDarkMode(enabled: boolean): void {
    darkMode = enabled;

    const palette = darkMode ? DARK_GRID_COLORS : LIGHT_GRID_COLORS;
    gridSettings = {
      ...gridSettings,
      ...palette
    };

    if (fogColorAuto) {
      fogSettings.color = darkMode ? DARK_FOG_COLOR_HEX : LIGHT_FOG_COLOR_HEX;
    }

    updateThemeVisuals();
    applyGridRepeat();
  }

  applyGridRepeat();
  updateThemeVisuals();

  return {
    getFogDensity() {
      return fogSettings.density;
    },

    setFogDensity,

    getFogSettings() {
      return { ...fogSettings };
    },

    setFogSettings,

    getEnvironmentPreset() {
      return environmentPreset;
    },

    setEnvironmentPreset,

    getHdriSettings() {
      return { ...hdriSettings };
    },

    setHdriSettings,

    loadHdri,

    getGridSettings() {
      return { ...gridSettings };
    },

    setGridSettings,

    isDarkMode() {
      return darkMode;
    },

    setDarkMode,

    dispose() {
      scene.remove(hemi);
      scene.remove(keyLight);
      scene.remove(fillLight);
      scene.remove(rimLight);
      scene.remove(topLight);
      scene.remove(floor);
      scene.remove(originDot);

      floor.geometry.dispose();
      floorMaterial.dispose();
      originDotGeometry.dispose();
      originDotMaterial.dispose();
      gridTexture.dispose();
      floorFadeTexture.dispose();
      backgroundTexture.dispose();

      if (hdriBackgroundTexture) {
        hdriBackgroundTexture.dispose();
      }
      if (hdriEnvironmentTexture) {
        hdriEnvironmentTexture.dispose();
      }
      if (hdriObjectUrl) {
        URL.revokeObjectURL(hdriObjectUrl);
      }

      scene.environment = null;
      scene.background = null;
      scene.fog = null;
      pmremGenerator.dispose();
    }
  };
}
