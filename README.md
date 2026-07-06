# i2donweb

Web-based VTubing application with face capture and a simple Inochi2D model editor, built on [inochi2d-ts](https://github.com/Inochi2D/inochi2d-ts).

## Features

- **VTubing Mode**: Use your webcam to capture face movements via MediaPipe Face Landmarker and animate an Inochi2D puppet in real time
- **Model Editor**: Load, inspect, and edit Inochi2D (.inx) model properties including node transforms, metadata, and hierarchy
- **Face Tracking**: Real-time face landmark detection with head rotation, eye blink, and mouth tracking
- **Three.js Rendering**: Inochi2D puppets rendered via Three.js with proper blending modes and stencil masking

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Usage

### VTubing
1. Navigate to the **VTubing** tab
2. Load an `.inx` model file
3. Click **Start Camera** to enable webcam
4. Click **Start Tracking** to begin face tracking
5. Adjust smoothing and sensitivity settings as needed

### Model Editor
1. Navigate to the **Editor** tab
2. Drag & drop or select an `.inx` model file
3. View puppet metadata and node tree
4. Select nodes to view and edit their properties (transforms, visibility, etc.)

## Tech Stack

- [Vite](https://vite.dev/) + TypeScript
- [Three.js](https://threejs.org/) for 3D rendering
- [inochi2d-ts](https://github.com/Inochi2D/inochi2d-ts) (vendored) for Inochi2D model loading
- [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker) for face tracking

## Credits

The Inochi2D model loading/rendering code and puppet editor in this project are
translated from and/or based on [Inochi2D](https://github.com/Inochi2D/inochi2d)
and [Inochi Creator](https://github.com/Inochi2D/inochi-creator), both created by
the Inochi2D Project and distributed under the BSD 2-Clause License. See
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for full attribution.