/**
 * Maps face tracking data to puppet transformations for VTubing.
 */

import { FaceTrackingData } from '../capture/face-tracker';
import { SceneManager } from './scene';

export class PuppetController {
    private scene: SceneManager;
    private smoothedData: FaceTrackingData | null = null;
    private smoothingFactor: number = 0.3;

    constructor(scene: SceneManager) {
        this.scene = scene;
    }

    /**
     * Apply face tracking data to the puppet.
     */
    applyFaceData(data: FaceTrackingData): void {
        if (!data.detected) return;

        // Smooth the data
        if (this.smoothedData) {
            this.smoothedData = this.smoothData(this.smoothedData, data);
        } else {
            this.smoothedData = { ...data };
        }

        const smoothed = this.smoothedData;

        // Apply head rotation to puppet
        this.scene.setHeadRotation(
            smoothed.headRotation.pitch,
            smoothed.headRotation.yaw,
            smoothed.headRotation.roll
        );
    }

    /**
     * Set smoothing factor (0-1, higher = smoother but more latency)
     */
    setSmoothingFactor(factor: number): void {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }

    private smoothData(prev: FaceTrackingData, curr: FaceTrackingData): FaceTrackingData {
        const f = this.smoothingFactor;
        const invF = 1 - f;
        return {
            headRotation: {
                pitch: prev.headRotation.pitch * f + curr.headRotation.pitch * invF,
                yaw: prev.headRotation.yaw * f + curr.headRotation.yaw * invF,
                roll: prev.headRotation.roll * f + curr.headRotation.roll * invF,
            },
            leftEyeOpen: prev.leftEyeOpen * f + curr.leftEyeOpen * invF,
            rightEyeOpen: prev.rightEyeOpen * f + curr.rightEyeOpen * invF,
            mouthOpen: prev.mouthOpen * f + curr.mouthOpen * invF,
            mouthWidth: prev.mouthWidth * f + curr.mouthWidth * invF,
            detected: curr.detected,
            landmarks: curr.landmarks,
        };
    }
}
