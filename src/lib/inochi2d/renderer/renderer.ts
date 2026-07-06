/*
    THREE.JS-based renderer

    Copyright © 2023, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: FartDraws
*/

import * as THREE from "three";
import { BlendMode, Node } from "../nodes/node";
import { Drawable } from "../nodes/drawable";
import { Puppet } from "../puppet";

export const blend_modes = [
    { _blendmode: BlendMode.Normal, _constant: THREE.NormalBlending },
    { _blendmode: BlendMode.Screen, _constant: THREE.MultiplyBlending },
    { _blendmode: BlendMode.ColorDodge, _constant: THREE.MultiplyBlending },
    { _blendmode: BlendMode.Multiply, _constant: THREE.MultiplyBlending }
];

function createNode(node: Node | Drawable, _scene: THREE.Object3D, parent: THREE.Object3D, _textures: THREE.Texture[]) {
    node.create();
    node.update();
    parent.add(node.threeObj);

    for (const child of node.children) {
        createNode(child, _scene, node.threeObj, _textures);
    }

    return node.threeObj;
}

/**
 * Renders a Puppet into a Three.js scene
 */
export function renderPuppet(puppet: Puppet, scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.Renderer) {
    const rootNode = createNode(puppet.rootNode, scene, scene, puppet.textures);
    scene.add(rootNode);

    let lastTime: number | null = null;

    const animate = function (time?: number) {
        requestAnimationFrame(animate);

        if (typeof time === 'number') {
            const deltaSeconds = lastTime !== null ? (time - lastTime) / 1000 : 0;
            lastTime = time;
            puppet.updatePhysics(deltaSeconds);
        }

        renderer.render(scene, camera);
    };

    animate();

    return {
        rootNode: rootNode,
        animate: animate
    };
}
