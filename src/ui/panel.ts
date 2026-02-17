import type { SlotState, VisibleCount } from "../types/assets";
import type {
  LightingPresetOption,
  LightingRigSettings,
  RigLightSlotIndex,
  RigLightType
} from "../scene/stage";

export type StatusLevel = "info" | "warning" | "error";

export interface SelectOption {
  id: string;
  label: string;
}

export interface ModelInfoRow {
  label: string;
  value: string;
}

type TransformAxis = "x" | "y" | "z";
type TabId = "models" | "environment" | "light" | "ui_config";

interface ShowcasePanelCallbacks {
  onVisibleCountChange: (count: VisibleCount) => void;
  onModelChange: (modelPackId: string) => void | Promise<void>;
  onAnimationChange: (animationId: string) => void | Promise<void>;
  onUploadZip: (file: File) => void | Promise<void>;
  onUploadZipFromUrl: (url: string) => void | Promise<void>;
  onTransformPositionChange: (axis: TransformAxis, value: number) => void;
  onTransformRotationChange: (axis: TransformAxis, valueDeg: number) => void;
  onTransformScaleChange: (axis: TransformAxis, value: number) => void;
  onTransformUniformScaleChange: (value: number) => void;
  onResetTransform: () => void;
  onModelStatisticsVisibilityChange: (enabled: boolean) => void;
  onModelStatisticsColorChange: (color: string) => void;
  onSelectSlot: (slotIndex: number) => void;
  onEnvironmentPresetChange: (preset: "showcase_grid" | "studio_clay") => void;
  onSaveEnvironmentPreset: () => void | Promise<void>;
  onLoadEnvironmentPreset: () => void | Promise<void>;
  onHdriUpload: (file: File) => void | Promise<void>;
  onHdriEnabledChange: (enabled: boolean) => void;
  onHdriBackgroundVisibilityChange: (enabled: boolean) => void;
  onHdriRotationChange: (rotationDeg: number) => void;
  onHdriIntensityChange: (intensity: number) => void;
  onHdriBackgroundIntensityChange: (intensity: number) => void;
  onHdriBackgroundBlurChange: (blur: number) => void;
  onLightingRigEnabledChange: (enabled: boolean) => void;
  onLightingPresetApply: (presetId: string) => void;
  onLightingSlotSelect: (slotIndex: RigLightSlotIndex) => void;
  onLightingSlotEnabledChange: (slotIndex: RigLightSlotIndex, enabled: boolean) => void;
  onLightingSlotTypeChange: (slotIndex: RigLightSlotIndex, type: RigLightType) => void;
  onLightingSlotColorChange: (slotIndex: RigLightSlotIndex, color: string) => void;
  onLightingSlotIntensityChange: (slotIndex: RigLightSlotIndex, intensity: number) => void;
  onLightingSlotPositionChange: (
    slotIndex: RigLightSlotIndex,
    axis: "x" | "y" | "z",
    value: number
  ) => void;
  onLightingSlotShadowChange: (slotIndex: RigLightSlotIndex, castShadow: boolean) => void;
  onFogEnabledChange: (enabled: boolean) => void;
  onFogColorChange: (color: string) => void;
  onFogDensityChange: (density: number) => void;
  onFogFalloffChange: (falloff: number) => void;
  onGridCellSizeChange: (cellSize: number) => void;
  onGridLineWidthChange: (lineWidth: number) => void;
  onGridLineStrengthChange: (lineStrength: number) => void;
  onGridRoughnessChange: (roughness: number) => void;
  onGridEdgeTransparencyChange: (edgeTransparency: number) => void;
  onBackgroundColorChange: (color: string) => void;
  onBackgroundAlphaChange: (alpha: number) => void;
  onGridBaseColorChange: (color: string) => void;
  onGridBaseAlphaChange: (alpha: number) => void;
  onGridMajorColorChange: (color: string) => void;
  onGridMajorAlphaChange: (alpha: number) => void;
  onGridMinorColorChange: (color: string) => void;
  onGridMinorAlphaChange: (alpha: number) => void;
  onWireframeColorChange: (color: string) => void;
  onWireframeThicknessChange: (thickness: number) => void;
  onFlipNormalsChange: (enabled: boolean) => void;
  onFlatShadingChange: (enabled: boolean) => void;
  onWireframeOverlayChange: (enabled: boolean) => void;
}

export interface ShowcasePanel {
  setVisibleCount: (count: VisibleCount) => void;
  setSlotButtons: (
    slots: SlotState[],
    selectedSlot: number | null,
    visibleCount: VisibleCount
  ) => void;
  setModelOptions: (options: SelectOption[], selectedId: string) => void;
  setAnimationOptions: (options: SelectOption[], selectedId: string) => void;
  setActiveLabel: (label: string) => void;
  setTransformValues: (values: {
    enabled: boolean;
    position: { x: number; y: number; z: number };
    rotationDeg: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    uniformScale: number;
  }) => void;
  setEnvironmentPreset: (preset: "showcase_grid" | "studio_clay") => void;
  setSavedPresetState: (values: { hasSaved: boolean; label: string }) => void;
  setHdriSettings: (values: {
    loaded: boolean;
    name: string;
    enabled: boolean;
    showBackground: boolean;
    rotationDeg: number;
    intensity: number;
    backgroundIntensity: number;
    backgroundBlur: number;
  }) => void;
  setLightingRigSettings: (values: LightingRigSettings) => void;
  setLightingPresetOptions: (values: LightingPresetOption[]) => void;
  setLightingShadowUsage: (values: { activeShadowLights: number; maxShadowLights: number }) => void;
  setFogDensity: (density: number) => void;
  setFogSettings: (values: {
    enabled: boolean;
    color: string;
    density: number;
    falloff: number;
  }) => void;
  setGridValues: (values: {
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
  }) => void;
  setNormalOptions: (values: { flipNormals: boolean; flatShading: boolean }) => void;
  setWireframeOverlay: (enabled: boolean) => void;
  setWireframeStyle: (values: { color: string; thickness: number }) => void;
  setModelStatisticsOptions: (values: { visible: boolean; color: string }) => void;
  setModelInfo: (title: string, rows: ModelInfoRow[]) => void;
  showStatus: (message: string, level?: StatusLevel) => void;
  dispose: () => void;
}

function replaceSelectOptions(
  select: HTMLSelectElement,
  options: SelectOption[],
  selectedId: string,
  emptyLabel: string
): void {
  select.innerHTML = "";
  if (options.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = emptyLabel;
    select.appendChild(option);
    select.value = "";
    select.disabled = true;
    return;
  }

  for (const item of options) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    select.appendChild(option);
  }

  select.disabled = false;
  select.value = options.some((item) => item.id === selectedId) ? selectedId : options[0].id;
}

function formatSliderValue(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatRigLightTypeShort(type: RigLightType): string {
  switch (type) {
    case "directional":
      return "Dir";
    case "point":
      return "Point";
    case "spot":
      return "Spot";
    case "hemisphere":
      return "Hemi";
    default:
      return "None";
  }
}

function formatRigLightTypeOption(type: RigLightType): string {
  switch (type) {
    case "directional":
      return "Direction";
    case "point":
      return "Point";
    case "spot":
      return "Spot";
    case "hemisphere":
      return "Hemi";
    default:
      return "None";
  }
}

function makeDefaultLightingRigSettings(): LightingRigSettings {
  return {
    enabled: true,
    presetId: "default_neutral",
    followSelected: true,
    lights: [
      {
        slotIndex: 0,
        enabled: false,
        type: "none",
        color: "#ffffff",
        intensity: 1,
        position: { x: 0, y: 5, z: 0 },
        castShadow: false
      },
      {
        slotIndex: 1,
        enabled: false,
        type: "none",
        color: "#ffffff",
        intensity: 1,
        position: { x: 0, y: 5, z: 0 },
        castShadow: false
      },
      {
        slotIndex: 2,
        enabled: false,
        type: "none",
        color: "#ffffff",
        intensity: 1,
        position: { x: 0, y: 5, z: 0 },
        castShadow: false
      },
      {
        slotIndex: 3,
        enabled: false,
        type: "none",
        color: "#ffffff",
        intensity: 1,
        position: { x: 0, y: 5, z: 0 },
        castShadow: false
      },
      {
        slotIndex: 4,
        enabled: false,
        type: "none",
        color: "#ffffff",
        intensity: 1,
        position: { x: 0, y: 5, z: 0 },
        castShadow: false
      }
    ]
  };
}

export function createShowcasePanel(
  container: HTMLElement,
  callbacks: ShowcasePanelCallbacks
): ShowcasePanel {
  const overlay = document.createElement("div");
  overlay.className = "panel-overlay";

  const panel = document.createElement("section");
  panel.className = "control-panel";
  overlay.appendChild(panel);

  const header = document.createElement("h1");
  header.className = "panel-title";
  header.textContent = "MESH STAGE";
  panel.appendChild(header);

  const subtitle = document.createElement("p");
  subtitle.className = "panel-subtitle";
  subtitle.textContent = "Click a character to focus. Orbit, pan, and zoom freely.";
  panel.appendChild(subtitle);

  const activeLabel = document.createElement("div");
  activeLabel.className = "active-label";
  activeLabel.textContent = "No active slot";
  panel.appendChild(activeLabel);

  const tabsRow = document.createElement("div");
  tabsRow.className = "tab-row";
  panel.appendChild(tabsRow);

  function makeTabButton(label: string, tabId: TabId): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-button";
    button.textContent = label;
    button.dataset.tab = tabId;
    return button;
  }

  const modelsTabButton = makeTabButton("MODELS", "models");
  const environmentTabButton = makeTabButton("STAGE", "environment");
  const lightTabButton = makeTabButton("LIGHT", "light");
  const uiConfigTabButton = makeTabButton("UI CONFIG", "ui_config");
  tabsRow.appendChild(modelsTabButton);
  tabsRow.appendChild(environmentTabButton);
  tabsRow.appendChild(lightTabButton);
  tabsRow.appendChild(uiConfigTabButton);

  const tabsContent = document.createElement("div");
  tabsContent.className = "tabs-content";
  panel.appendChild(tabsContent);

  const modelsTabPanel = document.createElement("div");
  modelsTabPanel.className = "tab-panel";
  tabsContent.appendChild(modelsTabPanel);

  const environmentTabPanel = document.createElement("div");
  environmentTabPanel.className = "tab-panel";
  tabsContent.appendChild(environmentTabPanel);

  const lightTabPanel = document.createElement("div");
  lightTabPanel.className = "tab-panel";
  tabsContent.appendChild(lightTabPanel);

  const uiConfigTabPanel = document.createElement("div");
  uiConfigTabPanel.className = "tab-panel";
  tabsContent.appendChild(uiConfigTabPanel);

  const tabButtons: Record<TabId, HTMLButtonElement> = {
    models: modelsTabButton,
    environment: environmentTabButton,
    light: lightTabButton,
    ui_config: uiConfigTabButton
  };

  const tabPanels: Record<TabId, HTMLDivElement> = {
    models: modelsTabPanel,
    environment: environmentTabPanel,
    light: lightTabPanel,
    ui_config: uiConfigTabPanel
  };

  function setActiveTab(tabId: TabId): void {
    const ids: TabId[] = ["models", "environment", "light", "ui_config"];
    for (const id of ids) {
      tabButtons[id].classList.toggle("active", id === tabId);
      tabPanels[id].classList.toggle("active", id === tabId);
    }
  }

  modelsTabButton.addEventListener("click", () => {
    setActiveTab("models");
  });
  environmentTabButton.addEventListener("click", () => {
    setActiveTab("environment");
  });
  lightTabButton.addEventListener("click", () => {
    setActiveTab("light");
  });
  uiConfigTabButton.addEventListener("click", () => {
    setActiveTab("ui_config");
  });

  function makeSliderRow(
    label: string,
    min: number,
    max: number,
    step: number,
    digits: number,
    onInput: (value: number) => void
  ): { row: HTMLLabelElement; input: HTMLInputElement; valueLabel: HTMLSpanElement } {
    const row = document.createElement("label");
    row.className = "control-row slider-row";
    row.textContent = label;

    const valueLabel = document.createElement("span");
    valueLabel.className = "slider-value";
    valueLabel.textContent = formatSliderValue(min, digits);
    row.appendChild(valueLabel);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(min);
    input.addEventListener("input", () => {
      const value = Number(input.value);
      valueLabel.textContent = formatSliderValue(value, digits);
      onInput(value);
    });
    row.appendChild(input);
    return { row, input, valueLabel };
  }

  function makeColorRow(
    label: string,
    onInput: (value: string) => void
  ): { row: HTMLLabelElement; input: HTMLInputElement } {
    const row = document.createElement("label");
    row.className = "control-row color-row";

    const labelText = document.createElement("span");
    labelText.className = "color-row-label";
    labelText.textContent = label;
    row.appendChild(labelText);

    const input = document.createElement("input");
    input.type = "color";
    input.value = "#ffffff";
    input.title = label;
    input.addEventListener("input", () => {
      onInput(input.value);
    });

    row.appendChild(input);
    return { row, input };
  }

  function makeToggleRow(
    label: string,
    onChange: (enabled: boolean) => void
  ): { row: HTMLLabelElement; input: HTMLInputElement } {
    const row = document.createElement("label");
    row.className = "toggle-row";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.addEventListener("change", () => {
      onChange(input.checked);
    });
    row.appendChild(input);

    const text = document.createElement("span");
    text.textContent = label;
    row.appendChild(text);

    return { row, input };
  }

  function makeTransformVectorRow(
    label: string,
    step: number,
    onChange: (axis: TransformAxis, value: number) => void
  ): { row: HTMLDivElement; inputs: Record<TransformAxis, HTMLInputElement> } {
    const row = document.createElement("div");
    row.className = "transform-row";

    const rowLabel = document.createElement("span");
    rowLabel.className = "transform-label";
    rowLabel.textContent = label;
    row.appendChild(rowLabel);

    const inputs: Record<TransformAxis, HTMLInputElement> = {
      x: document.createElement("input"),
      y: document.createElement("input"),
      z: document.createElement("input")
    };
    const axes: TransformAxis[] = ["x", "y", "z"];
    for (const axis of axes) {
      const input = inputs[axis];
      input.type = "number";
      input.step = String(step);
      input.value = "0";
      input.className = `transform-input axis-${axis}`;
      input.inputMode = "decimal";
      input.addEventListener("change", () => {
        const value = Number(input.value);
        if (!Number.isFinite(value)) {
          return;
        }
        onChange(axis, value);
      });
      row.appendChild(input);
    }

    return { row, inputs };
  }

  const uiGlassConfig = {
    blurPx: 13,
    opacity: 0.72,
    borderStrength: 0.34,
    shadowStrength: 0.52,
    sheenStrength: 0.3,
    noiseStrength: 0.08,
    radiusPx: 20
  };
  const uiTextConfig = {
    primaryColor: "#e6effa",
    secondaryColor: "#c4d5e7",
    mutedColor: "#9db2c9"
  };
  let lightingRigState: LightingRigSettings = makeDefaultLightingRigSettings();
  let selectedLightingSlotIndex: RigLightSlotIndex = 0;

  function applyUiGlassConfig(): void {
    const blur = `${uiGlassConfig.blurPx.toFixed(1)}px`;
    const opacity = uiGlassConfig.opacity.toFixed(2);
    const border = uiGlassConfig.borderStrength.toFixed(2);
    const shadow = uiGlassConfig.shadowStrength.toFixed(2);
    const sheen = uiGlassConfig.sheenStrength.toFixed(2);
    const noise = uiGlassConfig.noiseStrength.toFixed(2);
    const radius = `${uiGlassConfig.radiusPx.toFixed(1)}px`;

    panel.style.setProperty("--ui-glass-blur", blur);
    panel.style.setProperty("--ui-glass-opacity", opacity);
    panel.style.setProperty("--ui-glass-border", border);
    panel.style.setProperty("--ui-glass-shadow", shadow);
    panel.style.setProperty("--ui-glass-sheen", sheen);
    panel.style.setProperty("--ui-glass-noise", noise);
    panel.style.setProperty("--ui-glass-radius", radius);

    container.style.setProperty("--ui-glass-blur", blur);
    container.style.setProperty("--ui-glass-opacity", opacity);
    container.style.setProperty("--ui-glass-border", border);
    container.style.setProperty("--ui-glass-shadow", shadow);
    container.style.setProperty("--ui-glass-sheen", sheen);
    container.style.setProperty("--ui-glass-noise", noise);
    container.style.setProperty("--ui-glass-radius", radius);
  }

  function applyUiTextConfig(): void {
    container.style.setProperty("--ui-text-primary", uiTextConfig.primaryColor);
    container.style.setProperty("--ui-text-secondary", uiTextConfig.secondaryColor);
    container.style.setProperty("--ui-text-muted", uiTextConfig.mutedColor);
  }

  const visibleRow = document.createElement("label");
  visibleRow.className = "control-row";
  visibleRow.textContent = "Visible Characters";
  const visibleSelect = document.createElement("select");
  visibleSelect.innerHTML =
    '<option value="3">3</option><option value="4">4</option><option value="5">5</option>';
  visibleRow.appendChild(visibleSelect);
  modelsTabPanel.appendChild(visibleRow);

  const slotRow = document.createElement("div");
  slotRow.className = "slot-row";
  modelsTabPanel.appendChild(slotRow);

  const slotButtons: HTMLButtonElement[] = [];
  for (let i = 0; i < 5; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot-button";
    button.textContent = `S${i + 1}`;
    const slotIndex = i;
    button.addEventListener("click", () => {
      callbacks.onSelectSlot(slotIndex);
    });
    slotButtons.push(button);
    slotRow.appendChild(button);
  }

  const modelRow = document.createElement("label");
  modelRow.className = "control-row";
  modelRow.textContent = "Model";
  const modelSelect = document.createElement("select");
  modelRow.appendChild(modelSelect);
  modelsTabPanel.appendChild(modelRow);

  const animationRow = document.createElement("label");
  animationRow.className = "control-row";
  animationRow.textContent = "Animation";
  const animationSelect = document.createElement("select");
  animationRow.appendChild(animationSelect);
  modelsTabPanel.appendChild(animationRow);

  const transformSection = document.createElement("div");
  transformSection.className = "env-section";
  modelsTabPanel.appendChild(transformSection);

  const transformSectionTitle = document.createElement("h3");
  transformSectionTitle.className = "section-title";
  transformSectionTitle.textContent = "Transform";
  transformSection.appendChild(transformSectionTitle);

  const transformTranslateRow = makeTransformVectorRow("Translate", 0.01, (axis, value) => {
    callbacks.onTransformPositionChange(axis, value);
  });
  transformSection.appendChild(transformTranslateRow.row);

  const transformRotateRow = makeTransformVectorRow("Rotate", 0.1, (axis, value) => {
    callbacks.onTransformRotationChange(axis, value);
  });
  transformSection.appendChild(transformRotateRow.row);

  const transformScaleRow = makeTransformVectorRow("Scale", 0.01, (axis, value) => {
    callbacks.onTransformScaleChange(axis, value);
  });
  transformSection.appendChild(transformScaleRow.row);

  const uniformScaleSlider = makeSliderRow("Uniform Scale", 0.01, 8, 0.01, 2, (value) => {
    callbacks.onTransformUniformScaleChange(value);
  });
  transformSection.appendChild(uniformScaleSlider.row);

  const transformActions = document.createElement("div");
  transformActions.className = "transform-actions";
  const resetTransformButton = document.createElement("button");
  resetTransformButton.type = "button";
  resetTransformButton.className = "reset-transform-button";
  resetTransformButton.textContent = "Reset Transform";
  transformActions.appendChild(resetTransformButton);
  transformSection.appendChild(transformActions);

  function setTransformInputsEnabled(enabled: boolean): void {
    const groups = [
      transformTranslateRow.inputs,
      transformRotateRow.inputs,
      transformScaleRow.inputs
    ];
    const axes: TransformAxis[] = ["x", "y", "z"];
    for (const group of groups) {
      for (const axis of axes) {
        group[axis].disabled = !enabled;
      }
    }
    uniformScaleSlider.input.disabled = !enabled;
    resetTransformButton.disabled = !enabled;
  }

  function setTransformRowValues(
    inputs: Record<TransformAxis, HTMLInputElement>,
    values: { x: number; y: number; z: number },
    digits: number
  ): void {
    inputs.x.value = values.x.toFixed(digits);
    inputs.y.value = values.y.toFixed(digits);
    inputs.z.value = values.z.toFixed(digits);
  }

  const uploadRow = document.createElement("div");
  uploadRow.className = "upload-row";
  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.className = "upload-button";
  uploadButton.textContent = "Upload ZIP to Selected Slot";
  uploadRow.appendChild(uploadButton);
  modelsTabPanel.appendChild(uploadRow);

  const urlUploadRow = document.createElement("div");
  urlUploadRow.className = "url-upload-row";
  const urlUploadInput = document.createElement("input");
  urlUploadInput.type = "url";
  urlUploadInput.className = "url-upload-input";
  urlUploadInput.placeholder = "Paste Google Drive or direct ZIP URL";
  urlUploadInput.spellcheck = false;
  urlUploadRow.appendChild(urlUploadInput);

  const urlUploadButton = document.createElement("button");
  urlUploadButton.type = "button";
  urlUploadButton.className = "url-upload-button";
  urlUploadButton.textContent = "Load ZIP from URL";
  urlUploadRow.appendChild(urlUploadButton);
  modelsTabPanel.appendChild(urlUploadRow);

  const modelStatsSection = document.createElement("div");
  modelStatsSection.className = "env-section";
  modelsTabPanel.appendChild(modelStatsSection);

  const modelStatsTitle = document.createElement("h3");
  modelStatsTitle.className = "section-title";
  modelStatsTitle.textContent = "Model Statistics";
  modelStatsSection.appendChild(modelStatsTitle);

  const modelStatsToggle = makeToggleRow("Show Model Statistics", (enabled) => {
    callbacks.onModelStatisticsVisibilityChange(enabled);
  });
  modelStatsSection.appendChild(modelStatsToggle.row);

  const modelStatsColorRow = makeColorRow("Statistics Color", (value) => {
    callbacks.onModelStatisticsColorChange(value);
  });
  modelStatsSection.appendChild(modelStatsColorRow.row);

  const shadingSection = document.createElement("div");
  shadingSection.className = "env-section";
  modelsTabPanel.appendChild(shadingSection);

  const shadingSectionTitle = document.createElement("h3");
  shadingSectionTitle.className = "section-title";
  shadingSectionTitle.textContent = "Shading";
  shadingSection.appendChild(shadingSectionTitle);

  const environmentPresetRow = document.createElement("label");
  environmentPresetRow.className = "control-row";
  environmentPresetRow.textContent = "Stage Preset";
  const environmentPresetSelect = document.createElement("select");
  environmentPresetSelect.innerHTML =
    '<option value="showcase_grid">Light</option><option value="studio_clay">Dark</option>';
  environmentPresetRow.appendChild(environmentPresetSelect);
  environmentTabPanel.appendChild(environmentPresetRow);

  const customPresetSection = document.createElement("div");
  customPresetSection.className = "env-section";
  environmentTabPanel.appendChild(customPresetSection);

  const customPresetTitle = document.createElement("h3");
  customPresetTitle.className = "section-title";
  customPresetTitle.textContent = "Custom Preset";
  customPresetSection.appendChild(customPresetTitle);

  const presetActions = document.createElement("div");
  presetActions.className = "preset-actions";
  customPresetSection.appendChild(presetActions);

  const savePresetButton = document.createElement("button");
  savePresetButton.type = "button";
  savePresetButton.className = "preset-button";
  savePresetButton.textContent = "Save Current";
  presetActions.appendChild(savePresetButton);

  const loadPresetButton = document.createElement("button");
  loadPresetButton.type = "button";
  loadPresetButton.className = "preset-button";
  loadPresetButton.textContent = "Load Saved";
  loadPresetButton.disabled = true;
  presetActions.appendChild(loadPresetButton);

  const presetStatusLabel = document.createElement("div");
  presetStatusLabel.className = "mini-status";
  presetStatusLabel.textContent = "No saved preset";
  customPresetSection.appendChild(presetStatusLabel);

  const hdriSection = document.createElement("div");
  hdriSection.className = "env-section";
  lightTabPanel.appendChild(hdriSection);

  const hdriSectionTitle = document.createElement("h3");
  hdriSectionTitle.className = "section-title";
  hdriSectionTitle.textContent = "HDRI Lighting";
  hdriSection.appendChild(hdriSectionTitle);

  const hdriUploadRow = document.createElement("div");
  hdriUploadRow.className = "upload-row";
  const hdriUploadButton = document.createElement("button");
  hdriUploadButton.type = "button";
  hdriUploadButton.className = "upload-button hdri-upload-button";
  hdriUploadButton.textContent = "Load HDRI (.hdr/.exr)";
  hdriUploadRow.appendChild(hdriUploadButton);
  hdriSection.appendChild(hdriUploadRow);

  const hdriFileLabel = document.createElement("div");
  hdriFileLabel.className = "mini-status";
  hdriFileLabel.textContent = "No HDRI loaded";
  hdriSection.appendChild(hdriFileLabel);

  const hdriEnabledToggle = makeToggleRow("Use HDRI Lighting", (enabled) => {
    callbacks.onHdriEnabledChange(enabled);
  });
  hdriSection.appendChild(hdriEnabledToggle.row);

  const hdriBackgroundToggle = makeToggleRow("Show HDRI Background", (enabled) => {
    callbacks.onHdriBackgroundVisibilityChange(enabled);
  });
  hdriSection.appendChild(hdriBackgroundToggle.row);

  const hdriRotationSlider = makeSliderRow("HDRI Rotation", -180, 180, 1, 0, (value) => {
    callbacks.onHdriRotationChange(value);
  });
  hdriSection.appendChild(hdriRotationSlider.row);

  const hdriIntensitySlider = makeSliderRow("HDRI Intensity", 0, 8, 0.01, 2, (value) => {
    callbacks.onHdriIntensityChange(value);
  });
  hdriSection.appendChild(hdriIntensitySlider.row);

  const hdriBackgroundIntensitySlider = makeSliderRow(
    "HDRI Background Intensity",
    0,
    8,
    0.01,
    2,
    (value) => {
      callbacks.onHdriBackgroundIntensityChange(value);
    }
  );
  hdriSection.appendChild(hdriBackgroundIntensitySlider.row);

  const hdriBackgroundBlurSlider = makeSliderRow(
    "HDRI Blur (Low -> Very High)",
    0,
    1,
    0.01,
    2,
    (value) => {
      callbacks.onHdriBackgroundBlurChange(value);
    }
  );
  hdriSection.appendChild(hdriBackgroundBlurSlider.row);

  const lightRigSection = document.createElement("div");
  lightRigSection.className = "env-section";
  lightTabPanel.appendChild(lightRigSection);

  const lightRigTitle = document.createElement("h3");
  lightRigTitle.className = "section-title";
  lightRigTitle.textContent = "Light Rig";
  lightRigSection.appendChild(lightRigTitle);

  const lightRigEnabledToggle = makeToggleRow("Enable Light Rig", (enabled) => {
    callbacks.onLightingRigEnabledChange(enabled);
  });
  lightRigSection.appendChild(lightRigEnabledToggle.row);

  const lightingPresetRow = document.createElement("label");
  lightingPresetRow.className = "control-row";
  lightingPresetRow.textContent = "Lighting Preset";
  const lightingPresetSelect = document.createElement("select");
  lightingPresetRow.appendChild(lightingPresetSelect);
  lightRigSection.appendChild(lightingPresetRow);

  const applyLightingPresetButton = document.createElement("button");
  applyLightingPresetButton.type = "button";
  applyLightingPresetButton.className = "preset-button";
  applyLightingPresetButton.textContent = "Apply Preset";
  lightRigSection.appendChild(applyLightingPresetButton);

  const lightSlotRow = document.createElement("div");
  lightSlotRow.className = "slot-row";
  lightRigSection.appendChild(lightSlotRow);

  const lightSlotButtons: HTMLButtonElement[] = [];
  for (let i = 0; i < 5; i += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot-button";
    button.textContent = `L${i + 1}`;
    const slotIndex = i as RigLightSlotIndex;
    button.addEventListener("click", () => {
      selectedLightingSlotIndex = slotIndex;
      callbacks.onLightingSlotSelect(slotIndex);
      syncLightSlotButtons();
      syncSelectedLightSlotControls();
    });
    lightSlotButtons.push(button);
    lightSlotRow.appendChild(button);
  }

  const lightSlotEnabledToggle = makeToggleRow("Slot Enabled", (enabled) => {
    callbacks.onLightingSlotEnabledChange(selectedLightingSlotIndex, enabled);
  });
  lightRigSection.appendChild(lightSlotEnabledToggle.row);

  const lightSlotTypeRow = document.createElement("label");
  lightSlotTypeRow.className = "control-row";
  lightSlotTypeRow.textContent = "Light Type";
  const lightSlotTypeSelect = document.createElement("select");
  lightSlotTypeSelect.innerHTML = `
    <option value="none">${formatRigLightTypeOption("none")}</option>
    <option value="directional">${formatRigLightTypeOption("directional")}</option>
    <option value="point">${formatRigLightTypeOption("point")}</option>
    <option value="spot">${formatRigLightTypeOption("spot")}</option>
    <option value="hemisphere">${formatRigLightTypeOption("hemisphere")}</option>
  `;
  lightSlotTypeRow.appendChild(lightSlotTypeSelect);
  lightRigSection.appendChild(lightSlotTypeRow);

  const lightSlotColorRow = makeColorRow("Light Color", (value) => {
    callbacks.onLightingSlotColorChange(selectedLightingSlotIndex, value);
  });
  lightRigSection.appendChild(lightSlotColorRow.row);

  const lightSlotIntensitySlider = makeSliderRow("Light Intensity", 0, 8, 0.01, 2, (value) => {
    callbacks.onLightingSlotIntensityChange(selectedLightingSlotIndex, value);
  });
  lightRigSection.appendChild(lightSlotIntensitySlider.row);

  const lightSlotPositionRow = makeTransformVectorRow("Light Position", 0.1, (axis, value) => {
    callbacks.onLightingSlotPositionChange(selectedLightingSlotIndex, axis, value);
  });
  lightRigSection.appendChild(lightSlotPositionRow.row);

  const lightSlotShadowToggle = makeToggleRow("Cast Shadows", (enabled) => {
    callbacks.onLightingSlotShadowChange(selectedLightingSlotIndex, enabled);
  });
  lightRigSection.appendChild(lightSlotShadowToggle.row);

  const lightShadowUsageLabel = document.createElement("div");
  lightShadowUsageLabel.className = "mini-status";
  lightShadowUsageLabel.textContent = "Shadow lights active: 0 / 2";
  lightRigSection.appendChild(lightShadowUsageLabel);

  function getSelectedLightSlot() {
    return lightingRigState.lights[selectedLightingSlotIndex];
  }

  function syncLightSlotButtons(): void {
    for (let i = 0; i < lightSlotButtons.length; i += 1) {
      const button = lightSlotButtons[i];
      const slot = lightingRigState.lights[i as RigLightSlotIndex];
      const enabled = slot.enabled && slot.type !== "none";
      const typeLabel = enabled ? formatRigLightTypeShort(slot.type) : "None";
      button.classList.toggle("active", selectedLightingSlotIndex === i);
      button.textContent = `L${i + 1} ${typeLabel}`;
    }
  }

  function syncSelectedLightSlotControls(): void {
    const slot = getSelectedLightSlot();
    lightSlotEnabledToggle.input.checked = slot.enabled;
    lightSlotTypeSelect.value = slot.type;
    lightSlotColorRow.input.value = slot.color;
    lightSlotIntensitySlider.input.value = String(slot.intensity);
    lightSlotIntensitySlider.valueLabel.textContent = formatSliderValue(slot.intensity, 2);
    lightSlotPositionRow.inputs.x.value = slot.position.x.toFixed(2);
    lightSlotPositionRow.inputs.y.value = slot.position.y.toFixed(2);
    lightSlotPositionRow.inputs.z.value = slot.position.z.toFixed(2);
    lightSlotShadowToggle.input.checked = slot.castShadow;
  }

  const fogEnabledToggle = makeToggleRow("Enable Fog", (enabled) => {
    callbacks.onFogEnabledChange(enabled);
  });
  environmentTabPanel.appendChild(fogEnabledToggle.row);

  const fogColorRow = makeColorRow("Fog Color", (value) => {
    callbacks.onFogColorChange(value);
  });
  environmentTabPanel.appendChild(fogColorRow.row);

  const fogSlider = makeSliderRow("Fog Density", 0, 0.6, 0.001, 3, (value) => {
    callbacks.onFogDensityChange(value);
  });
  environmentTabPanel.appendChild(fogSlider.row);

  const fogFalloffSlider = makeSliderRow("Fog Falloff", 0.2, 4, 0.01, 2, (value) => {
    callbacks.onFogFalloffChange(value);
  });
  environmentTabPanel.appendChild(fogFalloffSlider.row);

  const gridCellSlider = makeSliderRow("Grid Cell Size", 0.25, 4.5, 0.01, 2, (value) => {
    callbacks.onGridCellSizeChange(value);
  });
  environmentTabPanel.appendChild(gridCellSlider.row);

  const gridLineWidthSlider = makeSliderRow("Grid Line Width", 0.002, 0.09, 0.001, 3, (value) => {
    callbacks.onGridLineWidthChange(value);
  });
  environmentTabPanel.appendChild(gridLineWidthSlider.row);

  const gridLineStrengthSlider = makeSliderRow("Grid Line Strength", 0, 1, 0.01, 2, (value) => {
    callbacks.onGridLineStrengthChange(value);
  });
  environmentTabPanel.appendChild(gridLineStrengthSlider.row);

  const gridRoughnessSlider = makeSliderRow("Grid Roughness", 0.2, 1, 0.01, 2, (value) => {
    callbacks.onGridRoughnessChange(value);
  });
  environmentTabPanel.appendChild(gridRoughnessSlider.row);

  const gridEdgeTransparencySlider = makeSliderRow(
    "Grid Edge Transparency",
    1,
    20,
    0.1,
    1,
    (value) => {
      callbacks.onGridEdgeTransparencyChange(value);
    }
  );
  environmentTabPanel.appendChild(gridEdgeTransparencySlider.row);

  const backgroundColorRow = makeColorRow("Background Color", (value) => {
    callbacks.onBackgroundColorChange(value);
  });
  environmentTabPanel.appendChild(backgroundColorRow.row);

  const backgroundAlphaSlider = makeSliderRow("Background Alpha", 0, 1, 0.01, 2, (value) => {
    callbacks.onBackgroundAlphaChange(value);
  });
  environmentTabPanel.appendChild(backgroundAlphaSlider.row);

  const gridBaseColorRow = makeColorRow("Grid Base Color", (value) => {
    callbacks.onGridBaseColorChange(value);
  });
  environmentTabPanel.appendChild(gridBaseColorRow.row);

  const gridBaseAlphaSlider = makeSliderRow("Grid Base Alpha", 0, 1, 0.01, 2, (value) => {
    callbacks.onGridBaseAlphaChange(value);
  });
  environmentTabPanel.appendChild(gridBaseAlphaSlider.row);

  const gridMajorColorRow = makeColorRow("Grid Major Color", (value) => {
    callbacks.onGridMajorColorChange(value);
  });
  environmentTabPanel.appendChild(gridMajorColorRow.row);

  const gridMajorAlphaSlider = makeSliderRow("Grid Major Alpha", 0, 1, 0.01, 2, (value) => {
    callbacks.onGridMajorAlphaChange(value);
  });
  environmentTabPanel.appendChild(gridMajorAlphaSlider.row);

  const gridMinorColorRow = makeColorRow("Grid Minor Color", (value) => {
    callbacks.onGridMinorColorChange(value);
  });
  environmentTabPanel.appendChild(gridMinorColorRow.row);

  const gridMinorAlphaSlider = makeSliderRow("Grid Minor Alpha", 0, 1, 0.01, 2, (value) => {
    callbacks.onGridMinorAlphaChange(value);
  });
  environmentTabPanel.appendChild(gridMinorAlphaSlider.row);

  const wireframeToggle = makeToggleRow("Wireframe Overlay", (enabled) => {
    callbacks.onWireframeOverlayChange(enabled);
  });
  shadingSection.appendChild(wireframeToggle.row);

  const wireframeColorRow = makeColorRow("Wireframe Color", (value) => {
    callbacks.onWireframeColorChange(value);
  });
  shadingSection.appendChild(wireframeColorRow.row);

  const wireframeThicknessSlider = makeSliderRow(
    "Wireframe Thickness",
    0.01,
    0.5,
    0.01,
    2,
    (value) => {
      callbacks.onWireframeThicknessChange(value);
    }
  );
  shadingSection.appendChild(wireframeThicknessSlider.row);

  const flipNormalsToggle = makeToggleRow("Flip Model Normals", (enabled) => {
    callbacks.onFlipNormalsChange(enabled);
  });
  shadingSection.appendChild(flipNormalsToggle.row);

  const flatShadingToggle = makeToggleRow("Flat Normals (Smooth Off)", (enabled) => {
    callbacks.onFlatShadingChange(enabled);
  });
  shadingSection.appendChild(flatShadingToggle.row);

  const uiBlurSlider = makeSliderRow("Panel Blur", 0, 26, 0.5, 1, (value) => {
    uiGlassConfig.blurPx = clamp(value, 0, 26);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiBlurSlider.row);

  const uiOpacitySlider = makeSliderRow("Panel Opacity", 0.2, 0.96, 0.01, 2, (value) => {
    uiGlassConfig.opacity = clamp(value, 0.2, 0.96);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiOpacitySlider.row);

  const uiBorderSlider = makeSliderRow("Border Strength", 0, 1, 0.01, 2, (value) => {
    uiGlassConfig.borderStrength = clamp(value, 0, 1);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiBorderSlider.row);

  const uiShadowSlider = makeSliderRow("Shadow Depth", 0, 1, 0.01, 2, (value) => {
    uiGlassConfig.shadowStrength = clamp(value, 0, 1);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiShadowSlider.row);

  const uiSheenSlider = makeSliderRow("Sheen Strength", 0, 1, 0.01, 2, (value) => {
    uiGlassConfig.sheenStrength = clamp(value, 0, 1);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiSheenSlider.row);

  const uiNoiseSlider = makeSliderRow("Matte Noise", 0, 0.35, 0.01, 2, (value) => {
    uiGlassConfig.noiseStrength = clamp(value, 0, 0.35);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiNoiseSlider.row);

  const uiRadiusSlider = makeSliderRow("Corner Radius", 10, 30, 0.5, 1, (value) => {
    uiGlassConfig.radiusPx = clamp(value, 10, 30);
    applyUiGlassConfig();
  });
  uiConfigTabPanel.appendChild(uiRadiusSlider.row);

  const uiPrimaryTextColorRow = makeColorRow("Text Primary Color", (value) => {
    uiTextConfig.primaryColor = value;
    applyUiTextConfig();
  });
  uiConfigTabPanel.appendChild(uiPrimaryTextColorRow.row);

  const uiSecondaryTextColorRow = makeColorRow("Text Secondary Color", (value) => {
    uiTextConfig.secondaryColor = value;
    applyUiTextConfig();
  });
  uiConfigTabPanel.appendChild(uiSecondaryTextColorRow.row);

  const uiMutedTextColorRow = makeColorRow("Text Muted Color", (value) => {
    uiTextConfig.mutedColor = value;
    applyUiTextConfig();
  });
  uiConfigTabPanel.appendChild(uiMutedTextColorRow.row);

  const statusLine = document.createElement("div");
  statusLine.className = "status-line";
  statusLine.textContent = "Ready";
  panel.appendChild(statusLine);

  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  overlay.appendChild(toastContainer);

  const modelInfoFrame = document.createElement("section");
  modelInfoFrame.className = "model-info-frame";
  const modelInfoTitle = document.createElement("h2");
  modelInfoTitle.className = "model-info-title";
  modelInfoTitle.textContent = "Selected Model";
  modelInfoFrame.appendChild(modelInfoTitle);
  const modelInfoRows = document.createElement("div");
  modelInfoRows.className = "model-info-rows";
  modelInfoFrame.appendChild(modelInfoRows);
  overlay.appendChild(modelInfoFrame);

  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.accept = ".zip,application/zip,application/x-zip-compressed";
  uploadInput.style.display = "none";
  panel.appendChild(uploadInput);

  const hdriInput = document.createElement("input");
  hdriInput.type = "file";
  hdriInput.accept = ".hdr,.exr,image/vnd.radiance";
  hdriInput.style.display = "none";
  panel.appendChild(hdriInput);

  container.appendChild(overlay);

  setActiveTab("models");
  uiBlurSlider.input.value = String(uiGlassConfig.blurPx);
  uiBlurSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.blurPx, 1);
  uiOpacitySlider.input.value = String(uiGlassConfig.opacity);
  uiOpacitySlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.opacity, 2);
  uiBorderSlider.input.value = String(uiGlassConfig.borderStrength);
  uiBorderSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.borderStrength, 2);
  uiShadowSlider.input.value = String(uiGlassConfig.shadowStrength);
  uiShadowSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.shadowStrength, 2);
  uiSheenSlider.input.value = String(uiGlassConfig.sheenStrength);
  uiSheenSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.sheenStrength, 2);
  uiNoiseSlider.input.value = String(uiGlassConfig.noiseStrength);
  uiNoiseSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.noiseStrength, 2);
  uiRadiusSlider.input.value = String(uiGlassConfig.radiusPx);
  uiRadiusSlider.valueLabel.textContent = formatSliderValue(uiGlassConfig.radiusPx, 1);
  uiPrimaryTextColorRow.input.value = uiTextConfig.primaryColor;
  uiSecondaryTextColorRow.input.value = uiTextConfig.secondaryColor;
  uiMutedTextColorRow.input.value = uiTextConfig.mutedColor;
  applyUiGlassConfig();
  applyUiTextConfig();

  function setHdriControlsEnabled(enabled: boolean): void {
    hdriEnabledToggle.input.disabled = !enabled;
    hdriBackgroundToggle.input.disabled = !enabled;
    hdriRotationSlider.input.disabled = !enabled;
    hdriIntensitySlider.input.disabled = !enabled;
    hdriBackgroundIntensitySlider.input.disabled = !enabled;
    hdriBackgroundBlurSlider.input.disabled = !enabled;
  }

  setHdriControlsEnabled(false);
  syncLightSlotButtons();
  syncSelectedLightSlotControls();

  visibleSelect.addEventListener("change", () => {
    const value = Number(visibleSelect.value);
    if (value === 3 || value === 4 || value === 5) {
      callbacks.onVisibleCountChange(value);
    }
  });

  environmentPresetSelect.addEventListener("change", () => {
    if (
      environmentPresetSelect.value === "showcase_grid" ||
      environmentPresetSelect.value === "studio_clay"
    ) {
      callbacks.onEnvironmentPresetChange(environmentPresetSelect.value);
    }
  });

  applyLightingPresetButton.addEventListener("click", () => {
    const presetId = lightingPresetSelect.value.trim();
    if (!presetId) {
      return;
    }
    callbacks.onLightingPresetApply(presetId);
  });

  lightSlotTypeSelect.addEventListener("change", () => {
    const value = lightSlotTypeSelect.value;
    if (
      value === "none" ||
      value === "directional" ||
      value === "point" ||
      value === "spot" ||
      value === "hemisphere"
    ) {
      callbacks.onLightingSlotTypeChange(selectedLightingSlotIndex, value);
    }
  });

  savePresetButton.addEventListener("click", () => {
    void callbacks.onSaveEnvironmentPreset();
  });

  loadPresetButton.addEventListener("click", () => {
    void callbacks.onLoadEnvironmentPreset();
  });

  resetTransformButton.addEventListener("click", () => {
    callbacks.onResetTransform();
  });

  modelSelect.addEventListener("change", () => {
    if (!modelSelect.value) {
      return;
    }
    void callbacks.onModelChange(modelSelect.value);
  });

  animationSelect.addEventListener("change", () => {
    if (!animationSelect.value) {
      return;
    }
    void callbacks.onAnimationChange(animationSelect.value);
  });

  uploadButton.addEventListener("click", () => {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = "";
    if (!file) {
      return;
    }
    void callbacks.onUploadZip(file);
  });

  function submitUrlUpload(): void {
    const value = urlUploadInput.value.trim();
    if (!value) {
      return;
    }
    void callbacks.onUploadZipFromUrl(value);
  }

  urlUploadButton.addEventListener("click", () => {
    submitUrlUpload();
  });

  urlUploadInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    submitUrlUpload();
  });

  urlUploadInput.addEventListener("dragover", (event) => {
    event.preventDefault();
    urlUploadInput.classList.add("is-drop-target");
  });

  urlUploadInput.addEventListener("dragleave", () => {
    urlUploadInput.classList.remove("is-drop-target");
  });

  urlUploadInput.addEventListener("drop", (event) => {
    event.preventDefault();
    urlUploadInput.classList.remove("is-drop-target");
    const droppedUrl =
      event.dataTransfer?.getData("text/uri-list") ||
      event.dataTransfer?.getData("text/plain") ||
      "";
    if (!droppedUrl) {
      return;
    }
    const firstLine = droppedUrl
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) {
      return;
    }
    urlUploadInput.value = firstLine;
  });

  hdriUploadButton.addEventListener("click", () => {
    hdriInput.click();
  });

  hdriInput.addEventListener("change", () => {
    const file = hdriInput.files?.[0];
    hdriInput.value = "";
    if (!file) {
      return;
    }
    void callbacks.onHdriUpload(file);
  });

  setTransformInputsEnabled(false);

  function showToast(message: string, level: StatusLevel): void {
    const toast = document.createElement("div");
    toast.className = `toast toast-${level}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    while (toastContainer.childElementCount > 4) {
      toastContainer.firstElementChild?.remove();
    }

    window.setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  return {
    setVisibleCount(count) {
      visibleSelect.value = String(count);
    },

    setSlotButtons(slots, selectedSlot, visibleCount) {
      for (let i = 0; i < slotButtons.length; i += 1) {
        const button = slotButtons[i];
        const slotState = slots[i];
        const isVisible = i < visibleCount;
        const hasModel = Boolean(slotState?.modelPackId);

        button.disabled = !isVisible;
        button.classList.toggle("active", selectedSlot === i);
        button.classList.toggle("hidden-slot", !isVisible);
        button.textContent = hasModel ? `S${i + 1}` : `S${i + 1} Empty`;
      }
    },

    setModelOptions(options, selectedId) {
      replaceSelectOptions(modelSelect, options, selectedId, "No models loaded");
    },

    setAnimationOptions(options, selectedId) {
      replaceSelectOptions(animationSelect, options, selectedId, "No animations available");
    },

    setActiveLabel(label) {
      activeLabel.textContent = label;
    },

    setTransformValues(values) {
      setTransformInputsEnabled(values.enabled);
      setTransformRowValues(transformTranslateRow.inputs, values.position, 2);
      setTransformRowValues(transformRotateRow.inputs, values.rotationDeg, 1);
      setTransformRowValues(transformScaleRow.inputs, values.scale, 3);
      uniformScaleSlider.input.value = String(values.uniformScale);
      uniformScaleSlider.valueLabel.textContent = formatSliderValue(values.uniformScale, 2);
    },

    setEnvironmentPreset(preset) {
      environmentPresetSelect.value = preset;
    },

    setSavedPresetState(values) {
      loadPresetButton.disabled = !values.hasSaved;
      presetStatusLabel.textContent = values.label;
    },

    setHdriSettings(values) {
      hdriFileLabel.textContent = values.loaded
        ? `Loaded HDRI: ${values.name}`
        : "No HDRI loaded";
      setHdriControlsEnabled(values.loaded);

      hdriEnabledToggle.input.checked = values.enabled;
      hdriBackgroundToggle.input.checked = values.showBackground;

      hdriRotationSlider.input.value = String(values.rotationDeg);
      hdriRotationSlider.valueLabel.textContent = formatSliderValue(values.rotationDeg, 0);

      hdriIntensitySlider.input.value = String(values.intensity);
      hdriIntensitySlider.valueLabel.textContent = formatSliderValue(values.intensity, 2);

      hdriBackgroundIntensitySlider.input.value = String(values.backgroundIntensity);
      hdriBackgroundIntensitySlider.valueLabel.textContent = formatSliderValue(
        values.backgroundIntensity,
        2
      );

      hdriBackgroundBlurSlider.input.value = String(values.backgroundBlur);
      hdriBackgroundBlurSlider.valueLabel.textContent = formatSliderValue(values.backgroundBlur, 2);
    },

    setLightingRigSettings(values) {
      lightingRigState = {
        enabled: values.enabled,
        presetId: values.presetId,
        followSelected: values.followSelected,
        lights: [
          {
            slotIndex: values.lights[0].slotIndex,
            enabled: values.lights[0].enabled,
            type: values.lights[0].type,
            color: values.lights[0].color,
            intensity: values.lights[0].intensity,
            position: { ...values.lights[0].position },
            castShadow: values.lights[0].castShadow
          },
          {
            slotIndex: values.lights[1].slotIndex,
            enabled: values.lights[1].enabled,
            type: values.lights[1].type,
            color: values.lights[1].color,
            intensity: values.lights[1].intensity,
            position: { ...values.lights[1].position },
            castShadow: values.lights[1].castShadow
          },
          {
            slotIndex: values.lights[2].slotIndex,
            enabled: values.lights[2].enabled,
            type: values.lights[2].type,
            color: values.lights[2].color,
            intensity: values.lights[2].intensity,
            position: { ...values.lights[2].position },
            castShadow: values.lights[2].castShadow
          },
          {
            slotIndex: values.lights[3].slotIndex,
            enabled: values.lights[3].enabled,
            type: values.lights[3].type,
            color: values.lights[3].color,
            intensity: values.lights[3].intensity,
            position: { ...values.lights[3].position },
            castShadow: values.lights[3].castShadow
          },
          {
            slotIndex: values.lights[4].slotIndex,
            enabled: values.lights[4].enabled,
            type: values.lights[4].type,
            color: values.lights[4].color,
            intensity: values.lights[4].intensity,
            position: { ...values.lights[4].position },
            castShadow: values.lights[4].castShadow
          }
        ]
      };

      lightRigEnabledToggle.input.checked = values.enabled;
      if (lightingPresetSelect.options.length > 0) {
        const selectedValue = Array.from(lightingPresetSelect.options).some(
          (option) => option.value === values.presetId
        )
          ? values.presetId
          : lightingPresetSelect.options[0].value;
        lightingPresetSelect.value = selectedValue;
      }

      if (selectedLightingSlotIndex > 4) {
        selectedLightingSlotIndex = 0;
      }
      syncLightSlotButtons();
      syncSelectedLightSlotControls();
    },

    setLightingPresetOptions(values) {
      lightingPresetSelect.innerHTML = "";
      for (const optionData of values) {
        const option = document.createElement("option");
        option.value = optionData.id;
        option.textContent = `${optionData.label} (${optionData.lightCount})`;
        lightingPresetSelect.appendChild(option);
      }
      if (lightingPresetSelect.options.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No presets";
        lightingPresetSelect.appendChild(option);
        lightingPresetSelect.disabled = true;
        applyLightingPresetButton.disabled = true;
      } else {
        lightingPresetSelect.disabled = false;
        applyLightingPresetButton.disabled = false;
      }
      if (
        lightingPresetSelect.options.length > 0 &&
        Array.from(lightingPresetSelect.options).some(
          (option) => option.value === lightingRigState.presetId
        )
      ) {
        lightingPresetSelect.value = lightingRigState.presetId;
      }
    },

    setLightingShadowUsage(values) {
      lightShadowUsageLabel.textContent = `Shadow lights active: ${values.activeShadowLights} / ${values.maxShadowLights}`;
    },

    setFogDensity(density) {
      fogSlider.input.value = String(density);
      fogSlider.valueLabel.textContent = formatSliderValue(density, 3);
    },

    setFogSettings(values) {
      fogEnabledToggle.input.checked = values.enabled;
      fogColorRow.input.value = values.color;
      fogSlider.input.value = String(values.density);
      fogSlider.valueLabel.textContent = formatSliderValue(values.density, 3);
      fogFalloffSlider.input.value = String(values.falloff);
      fogFalloffSlider.valueLabel.textContent = formatSliderValue(values.falloff, 2);
    },

    setGridValues(values) {
      gridCellSlider.input.value = String(values.cellSize);
      gridCellSlider.valueLabel.textContent = formatSliderValue(values.cellSize, 2);

      gridLineWidthSlider.input.value = String(values.lineWidth);
      gridLineWidthSlider.valueLabel.textContent = formatSliderValue(values.lineWidth, 3);

      gridLineStrengthSlider.input.value = String(values.lineStrength);
      gridLineStrengthSlider.valueLabel.textContent = formatSliderValue(values.lineStrength, 2);

      gridRoughnessSlider.input.value = String(values.roughness);
      gridRoughnessSlider.valueLabel.textContent = formatSliderValue(values.roughness, 2);

      gridEdgeTransparencySlider.input.value = String(values.edgeTransparency);
      gridEdgeTransparencySlider.valueLabel.textContent = formatSliderValue(
        values.edgeTransparency,
        1
      );

      backgroundColorRow.input.value = values.backgroundColor;
      backgroundAlphaSlider.input.value = String(values.backgroundAlpha);
      backgroundAlphaSlider.valueLabel.textContent = formatSliderValue(values.backgroundAlpha, 2);
      gridBaseColorRow.input.value = values.gridBaseColor;
      gridBaseAlphaSlider.input.value = String(values.gridBaseAlpha);
      gridBaseAlphaSlider.valueLabel.textContent = formatSliderValue(values.gridBaseAlpha, 2);
      gridMajorColorRow.input.value = values.gridMajorColor;
      gridMajorAlphaSlider.input.value = String(values.gridMajorAlpha);
      gridMajorAlphaSlider.valueLabel.textContent = formatSliderValue(values.gridMajorAlpha, 2);
      gridMinorColorRow.input.value = values.gridMinorColor;
      gridMinorAlphaSlider.input.value = String(values.gridMinorAlpha);
      gridMinorAlphaSlider.valueLabel.textContent = formatSliderValue(values.gridMinorAlpha, 2);
    },

    setNormalOptions(values) {
      flipNormalsToggle.input.checked = values.flipNormals;
      flatShadingToggle.input.checked = values.flatShading;
    },

    setWireframeOverlay(enabled) {
      wireframeToggle.input.checked = enabled;
    },

    setWireframeStyle(values) {
      wireframeColorRow.input.value = values.color;
      wireframeThicknessSlider.input.value = String(values.thickness);
      wireframeThicknessSlider.valueLabel.textContent = formatSliderValue(values.thickness, 2);
    },

    setModelStatisticsOptions(values) {
      modelStatsToggle.input.checked = values.visible;
      modelStatsColorRow.input.value = values.color;
    },

    setModelInfo(title, rows) {
      modelInfoTitle.textContent = title;
      modelInfoRows.innerHTML = "";
      for (const row of rows) {
        const item = document.createElement("div");
        item.className = "model-info-row";

        const label = document.createElement("span");
        label.className = "model-info-label";
        label.textContent = row.label;

        const value = document.createElement("span");
        value.className = "model-info-value";
        value.textContent = row.value;

        item.appendChild(label);
        item.appendChild(value);
        modelInfoRows.appendChild(item);
      }
    },

    showStatus(message, level = "info") {
      statusLine.textContent = message;
      statusLine.className = `status-line status-${level}`;
      showToast(message, level);
    },

    dispose() {
      overlay.remove();
    }
  };
}
