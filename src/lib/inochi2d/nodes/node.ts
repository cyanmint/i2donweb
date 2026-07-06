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
    /** Additive offset applied on top of a drawable/composite's base opacity. */
    opacity: number = 0;

    reset(): void {
        this.trans.set(0, 0, 0);
        this.rot.set(0, 0, 0);
        this.scale.set(0, 0);
        this.zsort = 0;
        this.opacity = 0;
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

    /**
     * Multiplies together the effective opacity (base + parameter offset,
     * clamped to 0..1) of every ancestor `Composite` node, so that
     * descendant drawables can factor it into their own rendered opacity.
     * Returns `1` if there are no `Composite` ancestors.
     */
    getAncestorCompositeOpacity(): number {
        let opacity = 1;
        let current = this.parent;
        while (current !== null) {
            if (current instanceof Composite) {
                opacity *= Math.min(1, Math.max(0, current.opacity + current.paramOffset.opacity));
            }
            current = current.parent;
        }
        return opacity;
    }
}

/**
 * Represents a path deform node.
 */
export class PathDeform extends Node {
    joints: THREE.Vector2[] = [];
    bindings: { bound_to: number; bind_data: number[][] }[] = [];
}

/**
 * Represents a Composite node: a group of `Part`/`Drawable` children that
 * are conceptually rendered to an offscreen buffer and then composited as a
 * single unit using `blend_mode`/`opacity`/masking, instead of each child
 * being blended individually against the layers below.
 *
 * Three.js has no built-in equivalent to Inochi2D's offscreen composite
 * buffer, so this is approximated here: the composite's effective opacity
 * (see `Node.getAncestorCompositeOpacity`) is multiplied into each
 * descendant `Part`'s own rendered opacity (see `Part.update`).
 */
export class Composite extends Node {
    opacity: number = 1;
    mask_mode: MaskingMode = MaskingMode.Mask;
    mask_threshold: number = 0;
    masked_by: NodeUuid[] = [];
    blend_mode: BlendMode = BlendMode.Normal;
}
