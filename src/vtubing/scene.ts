/**
 * Three.js scene manager for rendering Inochi2D puppets.
 */

import * as THREE from 'three';
import { Puppet } from '../lib/inochi2d/puppet';
import { renderPuppet } from '../lib/inochi2d/renderer/renderer';

export class SceneManager {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    rootNode: THREE.Object3D | null = null;
    puppet: Puppet | null = null;
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Create orthographic camera
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const aspect = width / height;
        const frustumSize = 3000;

        this.camera = new THREE.OrthographicCamera(
            -frustumSize,
            frustumSize,
            frustumSize / aspect,
            -frustumSize / aspect,
            0.01,
            10000
        );
        this.camera.position.set(0, 1, 500);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // Handle resize
        window.addEventListener('resize', this.onResize);

        // Add ambient light
        const light = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(light);
    }

    loadPuppet(puppet: Puppet): void {
        // Clear existing puppet
        if (this.rootNode) {
            this.scene.remove(this.rootNode);
        }

        this.puppet = puppet;
        const result = renderPuppet(puppet, this.scene, this.camera, this.renderer);
        this.rootNode = result.rootNode;
    }

    /**
     * Apply head rotation to the puppet root node
     */
    setHeadRotation(pitch: number, yaw: number, roll: number): void {
        if (!this.rootNode) return;

        // Apply smoothed rotation to the puppet
        const sensitivity = 0.5;
        this.rootNode.rotation.x = pitch * sensitivity;
        this.rootNode.rotation.y = yaw * sensitivity;
        this.rootNode.rotation.z = roll * sensitivity;
    }

    /**
     * Apply head position offset
     */
    setHeadPosition(x: number, y: number): void {
        if (!this.rootNode) return;
        this.rootNode.position.x += x * 10;
        this.rootNode.position.y += y * 10;
    }

    private onResize = (): void => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const frustumSize = 3000;

        this.camera.left = -frustumSize;
        this.camera.right = frustumSize;
        this.camera.top = frustumSize / aspect;
        this.camera.bottom = -frustumSize / aspect;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    };

    destroy(): void {
        window.removeEventListener('resize', this.onResize);
        if (this.rootNode) {
            this.scene.remove(this.rootNode);
        }
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
