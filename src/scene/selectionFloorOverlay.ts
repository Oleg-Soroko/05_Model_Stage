import * as THREE from "three";

export interface FloorInfoRow {
  label: string;
  value: string;
}

const INFO_CANVAS_WIDTH = 1024;
const INFO_CANVAS_HEIGHT = 384;
const INFO_ASPECT = INFO_CANVAS_WIDTH / INFO_CANVAS_HEIGHT;
const DEFAULT_STATS_COLOR = "#aeb7c2";
const OUTLINE_CORNER_SEGMENTS = 10;
const OUTLINE_POINT_CAPACITY = 5 + OUTLINE_CORNER_SEGMENTS * 4;
const FRAME_DASH_SIZE = 0.12;
const FRAME_GAP_SIZE = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function colorToRgbaString(color: THREE.Color, alpha: number): string {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class SelectionFloorOverlay {
  private readonly group: THREE.Group;

  private readonly outlineGeometry: THREE.BufferGeometry;
  private readonly outlineLine: THREE.LineLoop;
  private readonly outlinePositions = new Float32Array(OUTLINE_POINT_CAPACITY * 3);
  private readonly outlineMaterial: THREE.LineDashedMaterial;

  private readonly infoCanvas: HTMLCanvasElement;
  private readonly infoContext: CanvasRenderingContext2D;
  private readonly infoTexture: THREE.CanvasTexture;
  private readonly infoMaterial: THREE.MeshBasicMaterial;
  private readonly infoMesh: THREE.Mesh;

  private contentKey = "";
  private currentTitle = "MODEL STATS";
  private currentRows: FloorInfoRow[] = [{ label: "Status", value: "Select a model" }];
  private accentHex = DEFAULT_STATS_COLOR;
  private readonly accentColor = new THREE.Color(DEFAULT_STATS_COLOR);
  private statsVisible = true;

  public constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.outlineGeometry = new THREE.BufferGeometry();
    this.outlineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.outlinePositions, 3)
    );

    this.outlineMaterial = new THREE.LineDashedMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.72,
      dashSize: FRAME_DASH_SIZE,
      gapSize: FRAME_GAP_SIZE
    });
    this.outlineLine = new THREE.LineLoop(this.outlineGeometry, this.outlineMaterial);
    this.outlineLine.renderOrder = 2400;
    this.outlineLine.frustumCulled = false;
    this.group.add(this.outlineLine);

    this.infoCanvas = document.createElement("canvas");
    this.infoCanvas.width = INFO_CANVAS_WIDTH;
    this.infoCanvas.height = INFO_CANVAS_HEIGHT;

    const ctx = this.infoCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create 2D context for selection floor overlay.");
    }
    this.infoContext = ctx;

    this.infoTexture = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTexture.colorSpace = THREE.SRGBColorSpace;
    this.infoTexture.minFilter = THREE.LinearFilter;
    this.infoTexture.magFilter = THREE.LinearFilter;
    this.infoTexture.generateMipmaps = false;
    this.infoTexture.premultiplyAlpha = true;
    this.infoTexture.needsUpdate = true;

    this.infoMaterial = new THREE.MeshBasicMaterial({
      map: this.infoTexture,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      toneMapped: false,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    this.infoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.infoMaterial);
    this.infoMesh.renderOrder = 2410;
    this.infoMesh.frustumCulled = false;
    this.group.add(this.infoMesh);

    this.setInfo(this.currentTitle, this.currentRows);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    this.infoMesh.visible = this.statsVisible;
  }

  public setStatsVisible(visible: boolean): void {
    this.statsVisible = visible;
    this.infoMesh.visible = visible;
  }

  public setAccentColor(colorHex: string): void {
    const nextHex = sanitizeHexColor(colorHex, this.accentHex);
    if (nextHex === this.accentHex) {
      return;
    }

    this.accentHex = nextHex;
    this.accentColor.set(nextHex);
    this.outlineMaterial.color.copy(this.accentColor);
    this.outlineMaterial.needsUpdate = true;

    this.contentKey = "";
    this.redrawInfo();
  }

  public setInfo(title: string, rows: FloorInfoRow[]): void {
    this.currentTitle = title;
    this.currentRows = rows.slice(0, 8);
    this.redrawInfo();
  }

  public updatePlacement(center: THREE.Vector3, footprintSize: THREE.Vector2): void {
    this.group.position.set(center.x, 0, center.z);

    const halfX = Math.max(footprintSize.x * 0.58 + 0.25, 0.52);
    const halfZ = Math.max(footprintSize.y * 0.58 + 0.25, 0.52);
    const y = 0.009;

    this.updateOutline(halfX, halfZ, y);

    const panelWidth = clamp(halfX * 2.0, 1.25, 2.6);
    const panelHeight = panelWidth / INFO_ASPECT;
    this.infoMesh.scale.set(panelWidth, panelHeight, 1);

    const panelDistance = halfZ + panelHeight * 0.64 + 0.12;
    this.infoMesh.position.set(0, y + 0.004, panelDistance);
    this.infoMesh.rotation.set(-Math.PI * 0.5, 0, 0);
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.group);

    this.outlineGeometry.dispose();
    this.outlineMaterial.dispose();

    (this.infoMesh.geometry as THREE.PlaneGeometry).dispose();
    this.infoMaterial.dispose();
    this.infoTexture.dispose();
  }

  private redrawInfo(): void {
    const normalizedRows = this.currentRows.slice(0, 8);
    const key = `${this.currentTitle}|${this.accentHex}|${normalizedRows
      .map((row) => `${row.label}:${row.value}`)
      .join("|")}`;
    if (key === this.contentKey) {
      return;
    }
    this.contentKey = key;

    const ctx = this.infoContext;
    const width = this.infoCanvas.width;
    const height = this.infoCanvas.height;
    const solidAccent = colorToRgbaString(this.accentColor, 1);
    ctx.clearRect(0, 0, width, height);

    const rectX = 8;
    const rectY = 8;
    const rectW = width - 16;
    const rectH = height - 16;
    const cornerRadius = 28;
    drawRoundedRect(ctx, rectX, rectY, rectW, rectH, cornerRadius);
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = solidAccent;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0, 0, 0, 0)";

    ctx.fillStyle = solidAccent;
    ctx.font = '700 42px "Trebuchet MS", "Verdana", sans-serif';
    ctx.fillText(this.currentTitle.toUpperCase(), 34, 68);

    ctx.strokeStyle = solidAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, 98);
    ctx.lineTo(width * 0.5, height - 22);
    ctx.stroke();

    const splitIndex = Math.ceil(this.currentRows.length * 0.5);
    const leftRows = normalizedRows.slice(0, splitIndex);
    const rightRows = normalizedRows.slice(splitIndex);

    const rowStartY = 136;
    const rowStep = 54;

    ctx.font = '600 30px "Trebuchet MS", "Verdana", sans-serif';
    for (let i = 0; i < leftRows.length; i += 1) {
      const row = leftRows[i];
      const y = rowStartY + i * rowStep;
      ctx.fillStyle = solidAccent;
      ctx.fillText(row.label, 36, y);
      ctx.fillStyle = solidAccent;
      ctx.fillText(row.value, 246, y);
    }

    for (let i = 0; i < rightRows.length; i += 1) {
      const row = rightRows[i];
      const y = rowStartY + i * rowStep;
      ctx.fillStyle = solidAccent;
      ctx.fillText(row.label, 548, y);
      ctx.fillStyle = solidAccent;
      ctx.fillText(row.value, 758, y);
    }

    this.infoTexture.needsUpdate = true;
  }

  private updateOutline(halfX: number, halfZ: number, y: number): void {
    const radius = clamp(Math.min(halfX, halfZ) * 0.24, 0.14, 0.44);
    const writePoint = (index: number, x: number, z: number): number => {
      const base = index * 3;
      this.outlinePositions[base] = x;
      this.outlinePositions[base + 1] = y;
      this.outlinePositions[base + 2] = z;
      return index + 1;
    };

    let pointCount = 0;
    pointCount = writePoint(pointCount, -halfX + radius, -halfZ);
    pointCount = writePoint(pointCount, halfX - radius, -halfZ);

    const trCx = halfX - radius;
    const trCz = -halfZ + radius;
    for (let i = 1; i <= OUTLINE_CORNER_SEGMENTS; i += 1) {
      const angle = -Math.PI * 0.5 + (i / OUTLINE_CORNER_SEGMENTS) * (Math.PI * 0.5);
      pointCount = writePoint(
        pointCount,
        trCx + Math.cos(angle) * radius,
        trCz + Math.sin(angle) * radius
      );
    }

    pointCount = writePoint(pointCount, halfX, halfZ - radius);
    const brCx = halfX - radius;
    const brCz = halfZ - radius;
    for (let i = 1; i <= OUTLINE_CORNER_SEGMENTS; i += 1) {
      const angle = (i / OUTLINE_CORNER_SEGMENTS) * (Math.PI * 0.5);
      pointCount = writePoint(
        pointCount,
        brCx + Math.cos(angle) * radius,
        brCz + Math.sin(angle) * radius
      );
    }

    pointCount = writePoint(pointCount, -halfX + radius, halfZ);
    const blCx = -halfX + radius;
    const blCz = halfZ - radius;
    for (let i = 1; i <= OUTLINE_CORNER_SEGMENTS; i += 1) {
      const angle = Math.PI * 0.5 + (i / OUTLINE_CORNER_SEGMENTS) * (Math.PI * 0.5);
      pointCount = writePoint(
        pointCount,
        blCx + Math.cos(angle) * radius,
        blCz + Math.sin(angle) * radius
      );
    }

    pointCount = writePoint(pointCount, -halfX, -halfZ + radius);
    const tlCx = -halfX + radius;
    const tlCz = -halfZ + radius;
    for (let i = 1; i <= OUTLINE_CORNER_SEGMENTS; i += 1) {
      const angle = Math.PI + (i / OUTLINE_CORNER_SEGMENTS) * (Math.PI * 0.5);
      pointCount = writePoint(
        pointCount,
        tlCx + Math.cos(angle) * radius,
        tlCz + Math.sin(angle) * radius
      );
    }

    const position = this.outlineGeometry.getAttribute("position") as THREE.BufferAttribute;
    position.needsUpdate = true;
    this.outlineGeometry.setDrawRange(0, pointCount);
    this.outlineLine.computeLineDistances();
  }
}
