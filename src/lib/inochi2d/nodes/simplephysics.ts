/*
    Inochi2D Simple Physics Node

    Translated from the Inochi2D SimplePhysics "legacy" driver
    (https://github.com/Inochi2D/inochi2d/blob/main/source/inochi2d/nodes/legacy/simplephysics.d):
    a pendulum/spring-pendulum simulation that drives a `Param`'s value
    every frame, which is then applied to the puppet like any other
    parameter (see `Param.apply` / `Puppet.updateParameters`).

    Copyright © 2020-2026, Inochi2D Project
    Distributed under the 2-Clause BSD License, see THIRD_PARTY_NOTICES.md.
*/

import { Vector2 } from 'three';
import { Node } from './node';
import type { Puppet } from '../puppet';
import type { Param } from '../param';

/** Physics model to use for a `SimplePhysics` node. */
export type PhysicsModel = 'Pendulum' | 'SpringPendulum';

/** Mapping between physics output space and the driven parameter's axes. */
export type ParamMapMode = 'AngleLength' | 'XY' | 'LengthAngle' | 'YX';

/**
 * Advances a state vector by `h` seconds using the classic 4th-order
 * Runge-Kutta method, given a function computing the derivative of the
 * state at an arbitrary point.
 */
function rk4(state: number[], h: number, deriv: (s: number[]) => number[]): number[] {
    const add = (a: number[], b: number[], scale: number): number[] => a.map((v, i) => v + b[i] * scale);

    const k1 = deriv(state);
    const k2 = deriv(add(state, k1, h / 2));
    const k3 = deriv(add(state, k2, h / 2));
    const k4 = deriv(add(state, k3, h));

    return state.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * A physics-driven parameter node: simulates a rigid or springy pendulum
 * "bob" hanging from this node's world position (the anchor), and feeds
 * the resulting angle/length back into a target `Param`'s value every
 * frame via `updateDriver()`.
 */
export class SimplePhysics extends Node {
    /** UUID of the `Param` this node drives. */
    target: number = -1;
    model_type: PhysicsModel = 'Pendulum';
    map_mode: ParamMapMode = 'AngleLength';

    /** Gravity scale (1.0 = puppet gravity, see `Puppet.physicsGravity`). */
    gravity: number = 1.0;
    /** Pendulum/spring rest length, in pixels. */
    length: number = 100;
    /** Resonant frequency (Hz), only used by the spring pendulum model. */
    frequency: number = 1;
    /** Angular damping ratio. */
    angle_damping: number = 0.5;
    /** Length damping ratio (spring pendulum only). */
    length_damping: number = 0.5;
    output_scale: Vector2 = new Vector2(1, 1);
    /** Whether the physics system reads this node's local transform instead of its world position. */
    local_only: boolean = false;

    // Runtime simulation state (not serialised).
    private anchor: Vector2 = new Vector2(0, 0);
    private output: Vector2 = new Vector2(0, 0);
    private angle: number = 0;
    private dAngle: number = 0;
    private bob: Vector2 = new Vector2(0, 0);
    private dBob: Vector2 = new Vector2(0, 0);
    private initialized: boolean = false;
    /** Effective gravity for the current frame (`gravity` scaled by the puppet's global physics settings). */
    private effectiveGravity: number = 1;

    private worldAnchor(): Vector2 {
        return this.local_only
            ? new Vector2(this.transform.trans.x, this.transform.trans.y)
            : new Vector2(this.actualTransform.trans.x, this.actualTransform.trans.y);
    }

    /** (Re-)initialises the bob position at rest, hanging straight down from the anchor. */
    reset(): void {
        this.anchor = this.worldAnchor();
        this.bob = new Vector2(this.anchor.x, this.anchor.y + this.length);
        this.dBob.set(0, 0);
        this.angle = 0;
        this.dAngle = 0;
        this.output = this.bob.clone();
        this.initialized = true;
    }

    private pendulumDerivative(state: number[]): number[] {
        const [angle, dAngle] = state;
        const lengthRatio = this.effectiveGravity / this.length;
        const critDamp = 2 * Math.sqrt(Math.max(0, lengthRatio));
        const dd = -lengthRatio * Math.sin(angle) - dAngle * this.angle_damping * critDamp;
        return [dAngle, dd];
    }

    private tickPendulum(h: number): void {
        const dBob = new Vector2().subVectors(this.bob, this.anchor);
        this.angle = Math.atan2(-dBob.x, dBob.y);

        const [angle, dAngle] = rk4([this.angle, this.dAngle], h, (s) => this.pendulumDerivative(s));
        this.angle = angle;
        this.dAngle = dAngle;

        const dir = new Vector2(-Math.sin(this.angle), Math.cos(this.angle));
        this.bob = new Vector2(this.anchor.x + dir.x * this.length, this.anchor.y + dir.y * this.length);
        this.output = this.bob.clone();
    }

    private springDerivative(state: number[]): number[] {
        const [bobX, bobY, dBobX, dBobY] = state;
        const springKsqrt = this.frequency * 2 * Math.PI;
        const springK = springKsqrt * springKsqrt;
        const g = this.effectiveGravity;
        const restLength = this.length - g / springK;

        const offPos = new Vector2(bobX - this.anchor.x, bobY - this.anchor.y);
        const dist = offPos.length();
        const offPosNorm = dist > 0 ? offPos.clone().divideScalar(dist) : new Vector2(0, 1);

        const lengthRatio = this.effectiveGravity / this.length;
        const critDampAngle = 2 * Math.sqrt(Math.max(0, lengthRatio));
        const critDampLength = 2 * springKsqrt;

        const force = new Vector2(0, g);
        force.x -= offPosNorm.x * (dist - restLength) * springK;
        force.y -= offPosNorm.y * (dist - restLength) * springK;

        const dBobRotX = dBobX * offPosNorm.y + dBobY * offPosNorm.x;
        const dBobRotY = dBobY * offPosNorm.y - dBobX * offPosNorm.x;

        const ddBobRotX = -(dBobRotX * this.angle_damping * critDampAngle);
        const ddBobRotY = -(dBobRotY * this.length_damping * critDampLength);

        const ddBobDampingX = ddBobRotX * offPosNorm.y - dBobRotY * offPosNorm.x;
        const ddBobDampingY = ddBobRotY * offPosNorm.y + dBobRotX * offPosNorm.x;

        const ddBobX = force.x + ddBobDampingX;
        const ddBobY = force.y + ddBobDampingY;

        return [dBobX, dBobY, ddBobX, ddBobY];
    }

    private tickSpring(h: number): void {
        const state = rk4([this.bob.x, this.bob.y, this.dBob.x, this.dBob.y], h, (s) => this.springDerivative(s));
        this.bob = new Vector2(state[0], state[1]);
        this.dBob = new Vector2(state[2], state[3]);
        this.output = this.bob.clone();
    }

    private tick(h: number): void {
        if (this.model_type === 'SpringPendulum') this.tickSpring(h);
        else this.tickPendulum(h);
    }

    private updateOutputs(param: Param | undefined): void {
        if (!param) return;

        const oscale = this.output_scale;

        // The engine's transform system is simplified (no full inverse
        // world-matrix), so the physics output is expressed relative to
        // the anchor directly, rather than truly transformed back into
        // the node's local space.
        const localOffset = new Vector2().subVectors(this.output, this.anchor);
        const relLength = this.length !== 0 ? localOffset.length() / this.length : 0;
        const localAngle = localOffset.length() > 0 ? localOffset.clone().normalize() : new Vector2(0, 1);

        let paramX = 0;
        let paramY = 0;

        switch (this.map_mode) {
            case 'XY':
            case 'YX': {
                let x = localAngle.x * relLength;
                let y = -(localAngle.y * relLength - 1);
                if (this.map_mode === 'YX') {
                    [x, y] = [y, x];
                }
                paramX = x;
                paramY = y;
                break;
            }
            case 'LengthAngle': {
                const a = Math.atan2(-localAngle.x, localAngle.y) / Math.PI;
                paramX = relLength;
                paramY = a;
                break;
            }
            case 'AngleLength':
            default: {
                const a = Math.atan2(-localAngle.x, localAngle.y) / Math.PI;
                paramX = a;
                paramY = relLength;
                break;
            }
        }

        param.value.x = paramX * oscale.x;
        if (param.is_vec2) param.value.y = paramY * oscale.y;
    }

    /**
     * Advances the physics simulation by `deltaSeconds` and pushes the
     * resulting value into the driven `Param`. Should be called once per
     * frame, before `Puppet.updateParameters()`.
     */
    updateDriver(deltaSeconds: number, puppet: Puppet): void {
        if (!this.initialized) this.reset();

        this.effectiveGravity = this.gravity * puppet.physicsGravity * puppet.physicsPixelsPerMeter;
        this.anchor = this.worldAnchor();

        // The timestep is clamped to a small maximum (rather than the 10s
        // used by the reference D implementation, which assumes a native,
        // non-blocking simulation loop) to bound the number of fixed 0.01s
        // sub-steps run per call and avoid a long main-thread stall after a
        // dropped frame or tab being backgrounded. 1s caps this at 100
        // sub-steps per call, which is cheap enough to run synchronously
        // while still covering typical frame-drop/resume scenarios.
        // Integrated in fixed 0.01s steps for stability, with any
        // remainder applied as a final partial step.
        let h = Math.min(deltaSeconds, 1);
        while (h > 0.01) {
            this.tick(0.01);
            h -= 0.01;
        }
        this.tick(h);

        const param = puppet.params.find((p) => p.uuid === this.target);
        this.updateOutputs(param);
    }
}
