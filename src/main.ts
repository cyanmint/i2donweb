/**
 * i2donweb - Web-based VTubing and Inochi2D Model Editor
 *
 * Main entry point that sets up the application UI with:
 * - Home page with navigation
 * - VTubing mode (webcam face capture + puppet rendering)
 * - Model Editor (load, view, and edit inochi2d models)
 *
 * Based on inochi2d-ts (https://github.com/Inochi2D/inochi2d-ts)
 */

import './styles.css';
import { FaceTracker, FaceTrackingData } from './capture/face-tracker';
import { SceneManager } from './vtubing/scene';
import { PuppetController } from './vtubing/puppet-controller';
import { ModelEditor } from './editor/model-editor';
import { inImportFromFile, inImportFromURL } from './lib/inochi2d/inp';

const EXAMPLE_MODEL_URL =
    'https://raw.githubusercontent.com/Inochi2D/inochi2d-ts/main/public/Aka.inx';

// === Application State ===
let faceTracker: FaceTracker | null = null;
let vtubingScene: SceneManager | null = null;
let puppetController: PuppetController | null = null;
let isTracking = false;
let isCameraOn = false;

// === Initialize Application ===
function initApp(): void {
    const app = document.getElementById('app')!;

    app.innerHTML = `
        <nav class="nav-bar">
            <span class="nav-brand">i2donweb</span>
            <div class="nav-tabs">
                <button class="nav-tab active" data-page="home">🏠 Home</button>
                <button class="nav-tab" data-page="vtubing">🎭 VTubing</button>
                <button class="nav-tab" data-page="editor">✏️ Editor</button>
            </div>
        </nav>
        <div class="page-container">
            <div id="page-home" class="page active"></div>
            <div id="page-vtubing" class="page"></div>
            <div id="page-editor" class="page"></div>
        </div>
    `;

    // Set up navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = (tab as HTMLElement).dataset.page!;
            switchPage(page);
        });
    });

    // Render initial pages
    renderHomePage();
    renderVTubingPage();
    renderEditorPage();
}

function switchPage(page: string): void {
    // Update tab active state
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', (tab as HTMLElement).dataset.page === page);
    });

    // Update page visibility
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });
}

// === Home Page ===
function renderHomePage(): void {
    const page = document.getElementById('page-home')!;
    page.innerHTML = `
        <div class="home-layout">
            <h1 class="home-title">i2donweb</h1>
            <p class="home-subtitle">
                Web-based VTubing application with face capture and a simple Inochi2D model editor.
                Load your .inx puppet files and bring them to life using your webcam.
            </p>
            <div class="home-cards">
                <div class="home-card" id="card-vtubing">
                    <div class="card-icon">🎭</div>
                    <h3>VTubing</h3>
                    <p>Use your webcam to capture face movements and animate an Inochi2D puppet in real time.</p>
                </div>
                <div class="home-card" id="card-editor">
                    <div class="card-icon">✏️</div>
                    <h3>Model Editor</h3>
                    <p>Load, inspect, and edit Inochi2D model properties including node transforms and metadata.</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('card-vtubing')!.addEventListener('click', () => switchPage('vtubing'));
    document.getElementById('card-editor')!.addEventListener('click', () => switchPage('editor'));
}

// === VTubing Page ===
function renderVTubingPage(): void {
    const page = document.getElementById('page-vtubing')!;
    page.innerHTML = `
        <div class="vtubing-layout">
            <div class="vtubing-sidebar">
                <div class="sidebar-section">
                    <h3>📷 Camera</h3>
                    <div class="webcam-preview" id="webcam-preview">
                        <video id="webcam-video" playsinline muted></video>
                        <canvas id="landmark-canvas"></canvas>
                    </div>
                    <div class="controls-row">
                        <button class="btn btn-primary btn-sm" id="btn-camera">Start Camera</button>
                        <button class="btn btn-secondary btn-sm" id="btn-track" disabled>Start Tracking</button>
                    </div>
                    <div style="margin-top:0.5rem">
                        <span class="status-indicator">
                            <span class="status-dot" id="camera-status"></span>
                            <span id="camera-status-text">Camera Off</span>
                        </span>
                    </div>
                </div>
                <div class="sidebar-section">
                    <h3>📊 Tracking Data</h3>
                    <div class="tracking-stats" id="tracking-stats">
                        <span class="stat-label">Face</span>
                        <span class="stat-value" id="stat-face">--</span>
                        <span class="stat-label">Pitch</span>
                        <span class="stat-value" id="stat-pitch">--</span>
                        <span class="stat-label">Yaw</span>
                        <span class="stat-value" id="stat-yaw">--</span>
                        <span class="stat-label">Roll</span>
                        <span class="stat-value" id="stat-roll">--</span>
                        <span class="stat-label">L Eye</span>
                        <span class="stat-value" id="stat-leye">--</span>
                        <span class="stat-label">R Eye</span>
                        <span class="stat-value" id="stat-reye">--</span>
                        <span class="stat-label">Mouth</span>
                        <span class="stat-value" id="stat-mouth">--</span>
                    </div>
                </div>
                <div class="sidebar-section">
                    <h3>⚙️ Settings</h3>
                    <div class="slider-row">
                        <label>Smoothing</label>
                        <input type="range" id="slider-smoothing" min="0" max="90" value="30" />
                        <span class="slider-value" id="val-smoothing">0.30</span>
                    </div>
                    <div class="slider-row">
                        <label>Sensitivity</label>
                        <input type="range" id="slider-sensitivity" min="10" max="200" value="50" />
                        <span class="slider-value" id="val-sensitivity">0.50</span>
                    </div>
                </div>
                <div class="sidebar-section">
                    <h3>📁 Load Model</h3>
                    <input type="file" id="vtubing-file-input" accept=".inx" style="display:none" />
                    <button class="btn btn-secondary btn-block btn-sm" id="btn-load-model">Choose .inx File</button>
                    <button class="btn btn-primary btn-block btn-sm" id="btn-load-example" style="margin-top:0.5rem">Load Example (Aka)</button>
                    <p id="vtubing-model-status" style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-secondary)">No model loaded</p>
                </div>
            </div>
            <div class="vtubing-viewport">
                <div id="vtubing-canvas-container" class="canvas-container">
                    <div class="placeholder-text">Load a model and start your camera</div>
                </div>
            </div>
        </div>
    `;

    setupVTubingControls();
}

function setupVTubingControls(): void {
    const btnCamera = document.getElementById('btn-camera')!;
    const btnTrack = document.getElementById('btn-track')!;
    const btnLoadModel = document.getElementById('btn-load-model')!;
    const fileInput = document.getElementById('vtubing-file-input') as HTMLInputElement;
    const smoothingSlider = document.getElementById('slider-smoothing') as HTMLInputElement;
    const sensitivitySlider = document.getElementById('slider-sensitivity') as HTMLInputElement;

    btnCamera.addEventListener('click', async () => {
        if (!isCameraOn) {
            await startCamera();
        } else {
            stopCamera();
        }
    });

    btnTrack.addEventListener('click', () => {
        if (!isTracking) {
            startTracking();
        } else {
            stopTracking();
        }
    });

    btnLoadModel.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        if (fileInput.files && fileInput.files.length > 0) {
            await loadVTubingModel(fileInput.files[0]);
        }
    });

    const btnLoadExample = document.getElementById('btn-load-example')!;
    btnLoadExample.addEventListener('click', () => loadVTubingExampleModel());

    smoothingSlider.addEventListener('input', () => {
        const value = parseInt(smoothingSlider.value) / 100;
        document.getElementById('val-smoothing')!.textContent = value.toFixed(2);
        if (puppetController) {
            puppetController.setSmoothingFactor(value);
        }
    });

    sensitivitySlider.addEventListener('input', () => {
        const value = parseInt(sensitivitySlider.value) / 100;
        document.getElementById('val-sensitivity')!.textContent = value.toFixed(2);
    });
}

async function startCamera(): Promise<void> {
    const btnCamera = document.getElementById('btn-camera')!;
    const btnTrack = document.getElementById('btn-track') as HTMLButtonElement;
    const statusDot = document.getElementById('camera-status')!;
    const statusText = document.getElementById('camera-status-text')!;

    try {
        btnCamera.textContent = 'Starting...';

        if (!faceTracker) {
            faceTracker = new FaceTracker();
            statusText.textContent = 'Loading AI model...';
            await faceTracker.initialize();
        }

        const video = document.getElementById('webcam-video') as HTMLVideoElement;
        await faceTracker.startCamera(video);

        isCameraOn = true;
        btnCamera.textContent = 'Stop Camera';
        btnCamera.classList.remove('btn-primary');
        btnCamera.classList.add('btn-danger');
        btnTrack.disabled = false;
        statusDot.classList.add('active');
        statusText.textContent = 'Camera Active';
    } catch (err) {
        console.error('Failed to start camera:', err);
        btnCamera.textContent = 'Start Camera';
        statusText.textContent = `Error: ${err instanceof Error ? err.message : 'Failed to start camera'}`;
    }
}

function stopCamera(): void {
    const btnCamera = document.getElementById('btn-camera')!;
    const btnTrack = document.getElementById('btn-track') as HTMLButtonElement;
    const statusDot = document.getElementById('camera-status')!;
    const statusText = document.getElementById('camera-status-text')!;

    stopTracking();

    if (faceTracker) {
        faceTracker.stopCamera();
    }

    isCameraOn = false;
    btnCamera.textContent = 'Start Camera';
    btnCamera.classList.add('btn-primary');
    btnCamera.classList.remove('btn-danger');
    btnTrack.disabled = true;
    statusDot.classList.remove('active');
    statusText.textContent = 'Camera Off';
}

function startTracking(): void {
    if (!faceTracker) return;

    const btnTrack = document.getElementById('btn-track')!;

    faceTracker.startTracking((data: FaceTrackingData) => {
        updateTrackingStats(data);
        drawLandmarks(data);

        if (puppetController) {
            puppetController.applyFaceData(data);
        }
    });

    isTracking = true;
    btnTrack.textContent = 'Stop Tracking';
    btnTrack.classList.remove('btn-secondary');
    btnTrack.classList.add('btn-danger');
}

function stopTracking(): void {
    if (!faceTracker) return;

    const btnTrack = document.getElementById('btn-track');
    if (btnTrack) {
        faceTracker.stopTracking();
        isTracking = false;
        btnTrack.textContent = 'Start Tracking';
        btnTrack.classList.add('btn-secondary');
        btnTrack.classList.remove('btn-danger');
    }
}

function updateTrackingStats(data: FaceTrackingData): void {
    document.getElementById('stat-face')!.textContent = data.detected ? '✅' : '❌';
    document.getElementById('stat-pitch')!.textContent = (data.headRotation.pitch * 180 / Math.PI).toFixed(1) + '°';
    document.getElementById('stat-yaw')!.textContent = (data.headRotation.yaw * 180 / Math.PI).toFixed(1) + '°';
    document.getElementById('stat-roll')!.textContent = (data.headRotation.roll * 180 / Math.PI).toFixed(1) + '°';
    document.getElementById('stat-leye')!.textContent = (data.leftEyeOpen * 100).toFixed(0) + '%';
    document.getElementById('stat-reye')!.textContent = (data.rightEyeOpen * 100).toFixed(0) + '%';
    document.getElementById('stat-mouth')!.textContent = (data.mouthOpen * 100).toFixed(0) + '%';
}

function drawLandmarks(data: FaceTrackingData): void {
    const canvas = document.getElementById('landmark-canvas') as HTMLCanvasElement;
    const video = document.getElementById('webcam-video') as HTMLVideoElement;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data.detected || data.landmarks.length === 0) return;

    ctx.fillStyle = '#6c63ff';
    for (const point of data.landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

async function loadVTubingModel(file: File): Promise<void> {
    const statusEl = document.getElementById('vtubing-model-status')!;
    statusEl.textContent = 'Loading...';

    try {
        const puppet = await inImportFromFile(file);

        const container = document.getElementById('vtubing-canvas-container')!;
        container.innerHTML = '';

        if (vtubingScene) {
            vtubingScene.destroy();
        }

        vtubingScene = new SceneManager(container);
        vtubingScene.loadPuppet(puppet);
        puppetController = new PuppetController(vtubingScene);

        statusEl.textContent = `✅ ${puppet.meta.name || file.name}`;
    } catch (err) {
        console.error('Failed to load model:', err);
        statusEl.textContent = `❌ Error: ${err instanceof Error ? err.message : 'Failed to load'}`;
    }
}

async function loadVTubingExampleModel(): Promise<void> {
    const statusEl = document.getElementById('vtubing-model-status')!;
    const btnExample = document.getElementById('btn-load-example') as HTMLButtonElement;
    statusEl.textContent = 'Downloading example model (Aka.inx)...';
    btnExample.disabled = true;

    try {
        const puppet = await inImportFromURL(EXAMPLE_MODEL_URL);

        const container = document.getElementById('vtubing-canvas-container')!;
        container.innerHTML = '';

        if (vtubingScene) {
            vtubingScene.destroy();
        }

        vtubingScene = new SceneManager(container);
        vtubingScene.loadPuppet(puppet);
        puppetController = new PuppetController(vtubingScene);

        statusEl.textContent = `✅ ${puppet.meta.name || 'Aka (example)'}`;
    } catch (err) {
        console.error('Failed to load example model:', err);
        statusEl.textContent = `❌ Error: ${err instanceof Error ? err.message : 'Failed to load'}`;
    } finally {
        btnExample.disabled = false;
    }
}

// === Editor Page ===
function renderEditorPage(): void {
    const page = document.getElementById('page-editor')!;
    new ModelEditor(page);
}

// === Boot ===
document.addEventListener('DOMContentLoaded', initApp);
