/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/
import { Euler, Matrix4, Vector2, Vector3 } from 'three';

/**
 * Represents a transformation in 2D space.
 */
export class Transform {
    private trs: Matrix4 = new Matrix4().identity();
    rot: Vector3 = new Vector3(0, 0, 0);
    scale: Vector2 = new Vector2(1, 1);
    trans: Vector3 = new Vector3(0, 0, 0);

    /**
     * Multiplies this transform with another transform and returns the result.
     */
    multiply(other: Transform): Transform {
        const tnew: Transform = new Transform();
        const strs: Matrix4 = other.trs.multiply(this.trs);

        tnew.trans.setFromMatrixPosition(strs);
        tnew.rot.applyMatrix4(new Matrix4().extractRotation(strs));
        const scale: Vector3 = new Vector3().setFromMatrixScale(strs);
        tnew.scale.x = scale.x;
        tnew.scale.y = scale.y;
        tnew.trs = strs;

        return tnew;
    }

    /**
     * Updates the internal transformation matrix.
     */
    update(): void {
        const mat4: Matrix4 = new Matrix4().identity();
        const translate = mat4.makeTranslation(this.trans.x, this.trans.y, this.trans.z);
        const rotation = mat4.makeRotationFromEuler(new Euler(this.rot.x, this.rot.y, this.rot.z, Euler.DefaultOrder));
        const scale = mat4.makeScale(this.scale.x, this.scale.y, 1);

        this.trs = scale.multiply(rotation).multiply(translate);
    }

    /**
     * Returns the transformation matrix.
     */
    matrix(): Matrix4 {
        return this.trs;
    }
}

/**
 * Deserializes JSON data into a Transform object.
 */
export function deserializeTransform(data: { rot: number[]; scale: number[]; trans: number[] }): Transform {
    const transform = new Transform();
    transform.rot.fromArray(data.rot);
    transform.scale.fromArray(data.scale);
    transform.trans.fromArray(data.trans);
    return transform;
}
