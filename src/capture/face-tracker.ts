/**
 * Face tracker using MediaPipe Face Landmarker.
 * Provides face landmark detection from webcam video for VTubing.
 */

import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

/** Simplified face tracking data extracted from landmarks */
export interface FaceTrackingData {
    /** Head rotation in radians: [pitch, yaw, roll] */
    headRotation: { pitch: number; yaw: number; roll: number };
    /** Left eye openness (0 = closed, 1 = open) */
    leftEyeOpen: number;
    /** Right eye openness (0 = closed, 1 = open) */
    rightEyeOpen: number;
    /** Mouth openness (0 = closed, 1 = fully open) */
    mouthOpen: number;
    /** Mouth width ratio */
    mouthWidth: number;
    /** Whether a face is detected */
    detected: boolean;
    /** Raw landmarks for visualization */
    landmarks: { x: number; y: number; z: number }[];
}

const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export class FaceTracker {
    private faceLandmarker: FaceLandmarker | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private stream: MediaStream | null = null;
    private running: boolean = false;
    private animFrameId: number = 0;
    private lastVideoTime: number = -1;
    private onUpdate: ((data: FaceTrackingData) => void) | null = null;

    async initialize(): Promise<void> {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: FACE_LANDMARKER_MODEL_URL,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
    }

    async startCamera(videoElement: HTMLVideoElement): Promise<void> {
        this.videoElement = videoElement;
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
        });
        videoElement.srcObject = this.stream;
        await videoElement.play();
    }

    stopCamera(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    startTracking(callback: (data: FaceTrackingData) => void): void {
        this.onUpdate = callback;
        this.running = true;
        this.lastVideoTime = -1;
        this.tick();
    }

    stopTracking(): void {
        this.running = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = 0;
        }
    }

    private tick = (): void => {
        if (!this.running || !this.faceLandmarker || !this.videoElement) return;

        const now = performance.now();
        if (this.videoElement.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.videoElement.currentTime;
            const result = this.faceLandmarker.detectForVideo(this.videoElement, now);
            const data = this.extractTrackingData(result);
            if (this.onUpdate) {
                this.onUpdate(data);
            }
        }

        this.animFrameId = requestAnimationFrame(this.tick);
    };

    private extractTrackingData(result: FaceLandmarkerResult): FaceTrackingData {
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            return {
                headRotation: { pitch: 0, yaw: 0, roll: 0 },
                leftEyeOpen: 1,
                rightEyeOpen: 1,
                mouthOpen: 0,
                mouthWidth: 0.3,
                detected: false,
                landmarks: []
            };
        }

        const landmarks = result.faceLandmarks[0];

        // Extract head rotation from facial transformation matrix if available
        let headRotation = { pitch: 0, yaw: 0, roll: 0 };
        if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
            const matrix = result.facialTransformationMatrixes[0];
            headRotation = this.matrixToEuler(matrix.data as unknown as number[]);
        }

        // Extract blendshape values if available
        let leftEyeOpen = 1;
        let rightEyeOpen = 1;
        let mouthOpen = 0;
        let mouthWidth = 0.3;

        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
            const blendshapes = result.faceBlendshapes[0].categories;
            for (const shape of blendshapes) {
                switch (shape.categoryName) {
                    case "eyeBlinkLeft":
                        leftEyeOpen = 1 - shape.score;
                        break;
                    case "eyeBlinkRight":
                        rightEyeOpen = 1 - shape.score;
                        break;
                    case "jawOpen":
                        mouthOpen = shape.score;
                        break;
                    case "mouthSmileLeft":
                    case "mouthSmileRight":
                        mouthWidth = 0.3 + shape.score * 0.4;
                        break;
                }
            }
        } else {
            // Fallback: estimate from landmarks
            const leftEyeTop = landmarks[159];
            const leftEyeBot = landmarks[145];
            const rightEyeTop = landmarks[386];
            const rightEyeBot = landmarks[374];
            const mouthTop = landmarks[13];
            const mouthBot = landmarks[14];
            const mouthLeft = landmarks[61];
            const mouthRight = landmarks[291];

            const leftEyeDist = Math.abs(leftEyeTop.y - leftEyeBot.y);
            const rightEyeDist = Math.abs(rightEyeTop.y - rightEyeBot.y);
            leftEyeOpen = Math.min(1, leftEyeDist / 0.02);
            rightEyeOpen = Math.min(1, rightEyeDist / 0.02);
            mouthOpen = Math.min(1, Math.abs(mouthTop.y - mouthBot.y) / 0.05);
            mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
        }

        return {
            headRotation,
            leftEyeOpen,
            rightEyeOpen,
            mouthOpen,
            mouthWidth,
            detected: true,
            landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z }))
        };
    }

    private matrixToEuler(m: number[]): { pitch: number; yaw: number; roll: number } {
        // Extract rotation from 4x4 transformation matrix (column-major)
        const sy = Math.sqrt(m[0] * m[0] + m[4] * m[4]);
        const singular = sy < 1e-6;

        let pitch: number, yaw: number, roll: number;
        if (!singular) {
            pitch = Math.atan2(m[9], m[10]);
            yaw = Math.atan2(-m[8], sy);
            roll = Math.atan2(m[4], m[0]);
        } else {
            pitch = Math.atan2(-m[6], m[5]);
            yaw = Math.atan2(-m[8], sy);
            roll = 0;
        }

        return { pitch, yaw, roll };
    }

    destroy(): void {
        this.stopTracking();
        this.stopCamera();
        if (this.faceLandmarker) {
            this.faceLandmarker.close();
            this.faceLandmarker = null;
        }
    }
}
