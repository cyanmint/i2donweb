/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
*/

import { MeshData } from "../meshdata";
import * as THREE from "three";
import { Node, MaskingMode, NodeUuid, BlendMode } from "./node";
import { blend_modes } from "../renderer/renderer";
import { Puppet } from "../puppet";

/**
 * Representation of Mask Data
 */
export class MaskData {
    source: NodeUuid = -1;
    mode: BlendMode = BlendMode.ClipToLower;
}

/**
 * Represents the drawable properties.
 */
export class Drawable extends Node {
    mesh: MeshData = new MeshData();
    masks: MaskData[] = [];

    protected onCreateMesh() {
        super.onCreateMesh();

        const geometry = new THREE.BufferGeometry();

        const vertices: number[] = [];
        for (const vertex of this.mesh.vertices) {
            const offset = this.mesh.origin ? this.mesh.origin : new THREE.Vector2(0, 0);
            vertices.push(vertex.x + offset.x, vertex.y + offset.y, 0);
        }
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(vertices), 3)
        );

        if (this.mesh.uvs) {
            const uvs: number[] = [];
            this.mesh.uvs.map((uv) => { uvs.push(uv.x, uv.y); });
            geometry.setAttribute(
                'uv',
                new THREE.BufferAttribute(new Float32Array(uvs), 2)
            );
        }

        geometry.setIndex(this.mesh.indices);
        this.threeObj = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
    }

    protected onCreateMaterials() {
        if (this.threeObj instanceof THREE.Mesh && this.threeObj.material) {
            const mat = this.threeObj.material as THREE.MeshNormalMaterial;
            if (!this.enabled) mat.opacity = 0;
            mat.alphaTest = 0.7;
        }
        super.onCreateMaterials();
    }
}

/**
 * Represents a mask with the same properties as a drawable.
 */
export class Mask extends Drawable {
    protected onCreateMaterials(): void {
        if (this.threeObj instanceof THREE.Mesh) {
            const material = new THREE.MeshPhongMaterial({ color: 'white' });
            material.depthWrite = false;
            material.stencilWrite = true;
            material.stencilRef = this.uuid;
            material.stencilFunc = THREE.AlwaysStencilFunc;
            material.stencilZPass = THREE.ReplaceStencilOp;
            this.threeObj.material = material;
        }
        super.onCreateMaterials();
    }
}

/**
 * Represents a part with additional properties.
 */
export class Part extends Drawable {
    textures: number[] = [];
    opacity: number = 1;
    mask_mode: MaskingMode = MaskingMode.Mask;
    mask_threshold: number = 0;
    masked_by: NodeUuid[] = [];
    blend_mode: BlendMode = BlendMode.Normal;

    protected onCreateMaterials() {
        const partTextures = this.textures.map((idx) => {
            return (this.puppet as Puppet).textures[idx];
        });

        if (this.threeObj instanceof THREE.Mesh) {
            let blendModeData = blend_modes.find(modeData => modeData._blendmode === this.blend_mode);
            if (blendModeData === undefined) blendModeData = { _blendmode: BlendMode.Normal, _constant: THREE.NormalBlending };
            const { _constant } = blendModeData;

            let material: THREE.Material;

            if (partTextures && partTextures.length > 0) {
                const texture = partTextures[0];
                const basicMaterial = new THREE.MeshBasicMaterial({
                    transparent: true,
                    blending: _constant,
                    map: texture,
                    depthWrite: false
                });

                basicMaterial.stencilWrite = true;
                if (this.masks.length > 0) {
                    basicMaterial.stencilRef = this.masks[0].source;
                    basicMaterial.stencilFunc = THREE.EqualStencilFunc;
                    basicMaterial.stencilFail = THREE.KeepStencilOp;
                    basicMaterial.stencilZFail = THREE.KeepStencilOp;
                    basicMaterial.stencilZPass = THREE.KeepStencilOp;
                } else {
                    basicMaterial.depthWrite = false;
                    basicMaterial.stencilWrite = true;
                    basicMaterial.stencilRef = this.uuid;
                    basicMaterial.stencilFunc = THREE.AlwaysStencilFunc;
                    basicMaterial.stencilZPass = THREE.ReplaceStencilOp;
                    basicMaterial.stencilFail = THREE.ReplaceStencilOp;
                    basicMaterial.stencilZFail = THREE.ReplaceStencilOp;
                }
                material = basicMaterial;
            } else {
                material = new THREE.MeshBasicMaterial({
                    color: "pink",
                    transparent: true,
                    blending: _constant
                });
            }

            this.threeObj.material = material;
        }

        super.onCreateMaterials();
    }
}
