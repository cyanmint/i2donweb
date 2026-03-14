/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/

import { Transform } from "../math/transform";
import * as THREE from "three";
import { blend_modes } from "../renderer/renderer";

/**
 * Blending mode.
 */
export enum BlendMode {
    Normal,
    Multiply,
    ColorDodge,
    LinearDodge,
    Screen,
    ClipToLower,
    SliceFromLower,
}

/**
 * Represents the masking mode.
 */
export enum MaskingMode {
    Mask,
    Dodge,
}

/**
 * Represents the Inox Node UUID.
 */
export type NodeUuid = number;

/**
 * Base type for all nodes.
 */
export class Node {
    type: string = "";
    uuid: NodeUuid = -1;
    name?: string;
    enabled: boolean = true;
    zsort: number = 0;
    transform: Transform = new Transform();
    children: Node[] = [];

    // Non-serialisables
    puppet: unknown = null;
    threeObj: THREE.Object3D | THREE.Mesh = new THREE.Object3D();
    parent: Node | null = null;
    lockToRoot: boolean = false;
    actualTransform: Transform = new Transform();
    actualZsort: number = 0;

    /**
     * Calculates the transform of this node.
     */
    updateTransform() {
        this.transform.update();

        if (this.parent == null) {
            this.actualTransform = this.transform;
            this.actualZsort = this.zsort;
        } else {
            const newTransform = new Transform();
            newTransform.rot = this.parent.actualTransform.rot.clone().add(this.transform.rot);
            newTransform.trans = this.parent.actualTransform.trans.clone().add(this.transform.trans);
            newTransform.scale = new THREE.Vector2(
                this.parent.actualTransform.scale.x * this.transform.scale.x,
                this.parent.actualTransform.scale.y * this.transform.scale.y
            );
            this.actualTransform = newTransform;
            this.actualZsort = this.parent.actualZsort + this.zsort;
        }

        this.threeObj.position.set(this.transform.trans.x, this.transform.trans.y, this.transform.trans.z);
        this.threeObj.scale.set(this.transform.scale.x, this.transform.scale.y, 1);
        this.threeObj.rotation.x = this.transform.rot.x;
        this.threeObj.rotation.y = this.transform.rot.y;
        this.threeObj.rotation.z = this.transform.rot.z;
        this.threeObj.renderOrder = -this.actualZsort;
    }

    protected onCreateMesh() {}
    protected onCreateMaterials() {}

    update() {
        this.updateTransform();
    }

    create() {
        this.onCreateMesh();
        this.onCreateMaterials();
    }
}

/**
 * Represents a path deform node.
 */
export class PathDeform extends Node {
    joints: THREE.Vector2[] = [];
    bindings: { bound_to: number; bind_data: number[][] }[] = [];
}
