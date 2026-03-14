/*
    Inochi2D Parameter

    Copyright © 2022, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Speykious
 */

import { Vector2 } from 'three';

export class Binding {
    node: number = 0;
    is_set: boolean[][] = [];
    interpolate_mode: string = 'linear';
    values: BindingValues = new BindingValues();
}

export class BindingValues {
    ZSort: number[][] = [];
    TransformTX: number[][] = [];
    TransformTY: number[][] = [];
    TransformSX: number[][] = [];
    TransformSY: number[][] = [];
    TransformRX: number[][] = [];
    TransformRY: number[][] = [];
    TransformRZ: number[][] = [];
    Deform: Vector2[][] = [];
}

export class AxisPoints {
    x: number[] = [];
    y: number[] = [];
}

/**
 * Represents a parameter that can animate nodes and affect meshes.
 */
export class Param {
    uuid: number = -1;
    name: string = "";
    is_vec2: boolean = false;
    min: Vector2 = new Vector2();
    max: Vector2 = new Vector2();
    defaults: Vector2 = new Vector2();
    axis_points: AxisPoints = new AxisPoints();
    bindings: Binding[] = [];
}
