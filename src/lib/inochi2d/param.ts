/*
    Inochi2D Parameter

    Translated from the Inochi2D (https://github.com/Inochi2D/inochi2d) and
    Inochi Creator (https://github.com/Inochi2D/inochi-creator) parameter
    binding data model & interpolation algorithm.

    Copyright © 2020-2026, Inochi2D Project
    Distributed under the 2-Clause BSD License, see THIRD_PARTY_NOTICES.md.
*/

import { Vector2 } from 'three';
import { Drawable } from './nodes/drawable';
import type { Puppet } from './puppet';

/** Interpolation mode used between two keypoints of a binding. */
export type InterpolateMode = 'Linear' | 'Smooth' | string;

/**
 * A single parameter -> node/mesh binding.
 *
 * `values` is a 2D grid (indexed [xAxisIndex][yAxisIndex]) matching the
 * parameter's `axis_points`. For every binding except `deform`, each cell
 * holds a single number. For `deform` bindings, each cell holds one
 * `[dx, dy]` pair per mesh vertex (in vertex order).
 */
export class Binding {
    node: number = 0;
    param_name: string = '';
    values: unknown[][] = [];
    isSet: boolean[][] = [];
    interpolate_mode: InterpolateMode = 'Linear';

    static deserialize(data: {
        node: number;
        param_name: string;
        values: unknown[][];
        isSet?: boolean[][];
        interpolate_mode?: string;
    }): Binding {
        const binding = new Binding();
        binding.node = data.node;
        binding.param_name = data.param_name;
        binding.values = data.values ?? [];
        binding.isSet = data.isSet ?? [];
        binding.interpolate_mode = data.interpolate_mode ?? 'Linear';
        return binding;
    }

    /**
     * Serializes this binding back into the plain JSON shape used by
     * `deserialize()` / the `.inx` puppet format.
     */
    serialize(): { node: number; param_name: string; values: unknown[][]; isSet: boolean[][]; interpolate_mode: string } {
        return {
            node: this.node,
            param_name: this.param_name,
            values: this.values,
            isSet: this.isSet,
            interpolate_mode: this.interpolate_mode,
        };
    }
}

/**
 * Represents a parameter that can animate nodes and deform meshes.
 *
 * A parameter has a value in the range [min, max] (per axis, if 2D). Its
 * current value is normalised to 0..1 per axis and used to interpolate
 * between the keypoint values of each of its bindings, whose interpolated
 * result is then applied (additively) to the bound node's transform,
 * z-sort, or mesh deformation.
 */
export class Param {
    uuid: number = -1;
    name: string = '';
    is_vec2: boolean = false;
    min: Vector2 = new Vector2();
    max: Vector2 = new Vector2();
    defaults: Vector2 = new Vector2();
    /** Normalised (0..1) keypoint positions per axis: axis_points[0] = x, axis_points[1] = y. */
    axis_points: number[][] = [[0, 1], [0, 1]];
    bindings: Binding[] = [];

    /** Current value of the parameter (runtime state, not serialised). */
    value: Vector2 = new Vector2();

    static deserialize(data: {
        uuid: number;
        name: string;
        is_vec2?: boolean;
        min: number[];
        max: number[];
        defaults: number[];
        axis_points: number[][];
        bindings: {
            node: number;
            param_name: string;
            values: unknown[][];
            isSet?: boolean[][];
            interpolate_mode?: string;
        }[];
    }): Param {
        const param = new Param();
        param.uuid = data.uuid;
        param.name = data.name;
        param.is_vec2 = data.is_vec2 ?? false;
        param.min.fromArray(data.min);
        param.max.fromArray(data.max);
        param.defaults.fromArray(data.defaults);
        param.axis_points = data.axis_points ?? [[0, 1], [0, 1]];
        param.bindings = (data.bindings ?? []).map(Binding.deserialize);
        param.value = param.defaults.clone();
        return param;
    }

    /**
     * Serializes this parameter back into the plain JSON shape used by
     * `deserialize()` / the `.inx` puppet format.
     */
    serialize(): {
        uuid: number;
        name: string;
        is_vec2: boolean;
        min: number[];
        max: number[];
        defaults: number[];
        axis_points: number[][];
        bindings: ReturnType<Binding['serialize']>[];
    } {
        return {
            uuid: this.uuid,
            name: this.name,
            is_vec2: this.is_vec2,
            min: this.min.toArray(),
            max: this.max.toArray(),
            defaults: this.defaults.toArray(),
            axis_points: this.axis_points,
            bindings: this.bindings.map((binding) => binding.serialize()),
        };
    }

    /** Normalises a raw value between min and max to the 0..1 range. */
    private normalizeAxis(raw: number, min: number, max: number): number {
        if (max === min) return 0;
        const n = (raw - min) / (max - min);
        return Math.min(1, Math.max(0, n));
    }

    /**
     * Finds the bracketing keypoint indices for a normalised (0..1) axis
     * position, along with the interpolation fraction between them.
     */
    private findKeypoints(norm: number, points: number[]): { i0: number; i1: number; t: number } {
        if (points.length <= 1) return { i0: 0, i1: 0, t: 0 };

        for (let i = 0; i < points.length - 1; i++) {
            if (norm >= points[i] && norm <= points[i + 1]) {
                const span = points[i + 1] - points[i];
                const t = span === 0 ? 0 : (norm - points[i]) / span;
                return { i0: i, i1: i + 1, t };
            }
        }

        // Outside the range (clamp to closest edge).
        if (norm < points[0]) return { i0: 0, i1: 0, t: 0 };
        return { i0: points.length - 1, i1: points.length - 1, t: 0 };
    }

    private ease(t: number, mode: InterpolateMode): number {
        switch (mode) {
            case 'Smooth':
                return t * t * (3 - 2 * t);
            default:
                return t;
        }
    }

    /**
     * Computes the bilinearly (or linearly, for 1D params) interpolated
     * scalar value of a binding's grid at this parameter's current value.
     */
    private interpolateScalar(binding: Binding, kx: ReturnType<Param['findKeypoints']>, ky: ReturnType<Param['findKeypoints']>): number {
        const grid = binding.values as number[][];
        const get = (x: number, y: number): number => grid[x]?.[y] ?? 0;

        const tx = this.ease(kx.t, binding.interpolate_mode);
        if (!this.is_vec2) {
            return get(kx.i0, 0) * (1 - tx) + get(kx.i1, 0) * tx;
        }

        const ty = this.ease(ky.t, binding.interpolate_mode);
        const v00 = get(kx.i0, ky.i0);
        const v10 = get(kx.i1, ky.i0);
        const v01 = get(kx.i0, ky.i1);
        const v11 = get(kx.i1, ky.i1);
        const top = v00 * (1 - tx) + v10 * tx;
        const bottom = v01 * (1 - tx) + v11 * tx;
        return top * (1 - ty) + bottom * ty;
    }

    /**
     * Computes the interpolated per-vertex deform offsets of a `deform`
     * binding at this parameter's current value.
     */
    private interpolateDeform(binding: Binding, kx: ReturnType<Param['findKeypoints']>, ky: ReturnType<Param['findKeypoints']>): Vector2[] {
        const grid = binding.values as number[][][][];
        const get = (x: number, y: number): number[][] => grid[x]?.[y] ?? [];

        const tx = this.ease(kx.t, binding.interpolate_mode);
        const ty = this.is_vec2 ? this.ease(ky.t, binding.interpolate_mode) : 0;

        const a = get(kx.i0, this.is_vec2 ? ky.i0 : 0);
        const b = get(kx.i1, this.is_vec2 ? ky.i0 : 0);
        const c = this.is_vec2 ? get(kx.i0, ky.i1) : [];
        const d = this.is_vec2 ? get(kx.i1, ky.i1) : [];

        const count = Math.max(a.length, b.length, c.length, d.length);
        const result: Vector2[] = [];
        for (let i = 0; i < count; i++) {
            const av = a[i] ?? [0, 0];
            const bv = b[i] ?? [0, 0];
            if (!this.is_vec2) {
                result.push(new Vector2(
                    av[0] * (1 - tx) + bv[0] * tx,
                    av[1] * (1 - tx) + bv[1] * tx,
                ));
                continue;
            }
            const cv = c[i] ?? [0, 0];
            const dv = d[i] ?? [0, 0];
            const topX = av[0] * (1 - tx) + bv[0] * tx;
            const topY = av[1] * (1 - tx) + bv[1] * tx;
            const bottomX = cv[0] * (1 - tx) + dv[0] * tx;
            const bottomY = cv[1] * (1 - tx) + dv[1] * tx;
            result.push(new Vector2(
                topX * (1 - ty) + bottomX * ty,
                topY * (1 - ty) + bottomY * ty,
            ));
        }
        return result;
    }

    /**
     * Applies this parameter's current value to all bound nodes/meshes of
     * the given puppet. Contributions from multiple active parameters are
     * additive (see `Node.resetParamOffset`, called once per frame before
     * all parameters are applied).
     */
    apply(puppet: Puppet): void {
        const normX = this.normalizeAxis(this.value.x, this.min.x, this.max.x);
        const normY = this.is_vec2 ? this.normalizeAxis(this.value.y, this.min.y, this.max.y) : 0;
        const kx = this.findKeypoints(normX, this.axis_points[0] ?? [0, 1]);
        const ky = this.findKeypoints(normY, this.axis_points[1] ?? [0, 1]);

        for (const binding of this.bindings) {
            const node = puppet.nodes.find((n) => n.uuid === binding.node);
            if (!node) continue;

            if (binding.param_name === 'deform') {
                if (!(node instanceof Drawable)) continue;
                const offsets = this.interpolateDeform(binding, kx, ky);
                for (let i = 0; i < offsets.length && i < node.deformOffset.length; i++) {
                    node.deformOffset[i].add(offsets[i]);
                }
                continue;
            }

            const scalar = this.interpolateScalar(binding, kx, ky);
            switch (binding.param_name) {
                case 'transform.t.x': node.paramOffset.trans.x += scalar; break;
                case 'transform.t.y': node.paramOffset.trans.y += scalar; break;
                case 'transform.t.z': node.paramOffset.trans.z += scalar; break;
                case 'transform.s.x': node.paramOffset.scale.x += scalar; break;
                case 'transform.s.y': node.paramOffset.scale.y += scalar; break;
                case 'transform.r.x': node.paramOffset.rot.x += scalar; break;
                case 'transform.r.y': node.paramOffset.rot.y += scalar; break;
                case 'transform.r.z': node.paramOffset.rot.z += scalar; break;
                case 'zSort': node.paramOffset.zsort += scalar; break;
                case 'opacity': node.paramOffset.opacity += scalar; break;
                default: break;
            }
        }
    }
}
