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
 * Additive offsets applied to a node by active parameter bindings.
 * Reset every frame via `resetParamOffset()` before parameters are (re-)applied.
 */
export class ParamOffset {
    trans: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    rot: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    scale: THREE.Vector2 = new THREE.Vector2(0, 0);
    zsort: number = 0;

    reset(): void {
        this.trans.set(0, 0, 0);
        this.rot.set(0, 0, 0);
        this.scale.set(0, 0);
        this.zsort = 0;
    }
}

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

    /** Additive offset accumulated from active parameter bindings (see `Param.apply`). */
    paramOffset: ParamOffset = new ParamOffset();

    /**
     * Resets this node's parameter-driven offsets. Called once per frame
     * before `Puppet.updateParameters()` (re-)applies all active parameters.
     */
    resetParamOffset(): void {
        this.paramOffset.reset();
    }

    /**
     * Calculates the transform of this node, taking into account both its
     * authored (base) transform and any offset contributed by active
     * parameter bindings.
     */
    updateTransform() {
        const trans = this.transform.trans.clone().add(this.paramOffset.trans);
        const rot = this.transform.rot.clone().add(this.paramOffset.rot);
        const scale = new THREE.Vector2(
            this.transform.scale.x + this.paramOffset.scale.x,
            this.transform.scale.y + this.paramOffset.scale.y
        );
        const zsort = this.zsort + this.paramOffset.zsort;

        this.transform.update();

        if (this.parent == null) {
            const newTransform = new Transform();
            newTransform.rot = rot;
            newTransform.trans = trans;
            newTransform.scale = scale;
            this.actualTransform = newTransform;
            this.actualZsort = zsort;
        } else {
            const newTransform = new Transform();
            newTransform.rot = this.parent.actualTransform.rot.clone().add(rot);
            newTransform.trans = this.parent.actualTransform.trans.clone().add(trans);
            newTransform.scale = new THREE.Vector2(
                this.parent.actualTransform.scale.x * scale.x,
                this.parent.actualTransform.scale.y * scale.y
            );
            this.actualTransform = newTransform;
            this.actualZsort = this.parent.actualZsort + zsort;
        }

        this.threeObj.position.set(trans.x, trans.y, trans.z);
        this.threeObj.scale.set(scale.x, scale.y, 1);
        this.threeObj.rotation.x = rot.x;
        this.threeObj.rotation.y = rot.y;
        this.threeObj.rotation.z = rot.z;
        this.threeObj.renderOrder = -this.actualZsort;
    }

    protected onCreateMesh() {}
    protected onCreateMaterials() {}

    update() {
        this.updateTransform();
    }

    /**
     * Recursively updates this node and all its descendants, in
     * parent-to-child order (required so that `actualTransform` propagation
     * is correct).
     */
    updateRecursive(): void {
        this.update();
        for (const child of this.children) {
            child.updateRecursive();
        }
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
