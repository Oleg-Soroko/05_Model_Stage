# AI Character Showcase

Three.js + TypeScript web showcase for Mixamo FBX assets with:

- A dynamic row of `3-5` animated characters.
- Single active selection with click highlight.
- Orbit/zoom/pan camera retargeted to selected character.
- Model + animation switching per selected slot.
- ZIP runtime upload that replaces selected slot (model pack) or adds clip options (clip pack).

## Project Paths

- App source: `PROJECTS/05_AICharacterShowcase/src`
- Web-served assets: `PROJECTS/05_AICharacterShowcase/public/packs`
- Raw source ZIP staging: `PROJECTS/05_AICharacterShowcase/assets/inbox`

## Install and Run

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Manifest Contract

Edit `public/packs/manifest.json`:

```json
{
  "defaultVisibleCount": 3,
  "modelPacks": [
    {
      "id": "hero_idle",
      "label": "Hero Idle",
      "kind": "model_with_clip",
      "fbxUrl": "./packs/hero_idle.fbx"
    }
  ],
  "clipPacks": [
    {
      "id": "hero_walk",
      "label": "Hero Walk",
      "kind": "clip_only",
      "fbxUrl": "./packs/hero_walk.fbx"
    }
  ]
}
```

Notes:

- `modelPacks` should point to model FBX files that include skinned mesh data.
- `clipPacks` should point to animation-only compatible FBX files when possible.
- All `fbxUrl` paths are relative to the Vite app root and should resolve under `public`.

## Runtime ZIP Upload

- Use the panel button `Upload ZIP to Selected Slot`.
- ZIP rules in v1:
  - exactly one `.fbx` file per ZIP
  - optional texture files included in same ZIP
- If ZIP is detected as:
  - `model_with_clip`: the selected slot model is replaced
  - `clip_only`: clip pack is added and applied only if skeleton signature is compatible

## Camera and Interaction

- `LMB`: orbit
- `RMB`: pan
- `Wheel`: zoom
- Click character mesh: select and focus camera target

