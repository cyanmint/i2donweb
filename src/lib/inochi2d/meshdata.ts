/*
    Inochi2D Part Mesh Data

    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
 */

import { Vector2 } from 'three';

/**
 * Mesh data
 */
export class MeshData {
    vertices: Vector2[];
    uvs?: Vector2[];
    indices: number[];
    origin?: Vector2;
    gridAxes?: number[][];

    constructor() {
        this.vertices = [];
        this.indices = [];
        this.origin = new Vector2(0, 0);
    }

    static deserialize(data: { verts?: number[]; uvs?: number[]; indices?: number[]; origin?: number[]; grid_axes?: number[][] }): MeshData {
        const meshData = new MeshData();

        if (data.verts && Array.isArray(data.verts)) {
            for (let i = 0; i < data.verts.length; i += 2) {
                const x = data.verts[i];
                const y = data.verts[i + 1];
                if (typeof x === 'number' && typeof y === 'number') {
                    meshData.vertices.push(new Vector2(x, y));
                }
            }
        }

        if (data.uvs && Array.isArray(data.uvs)) {
            meshData.uvs = [];
            for (let i = 0; i < data.uvs.length; i += 2) {
                const x = data.uvs[i];
                const y = data.uvs[i + 1];
                if (typeof x === 'number' && typeof y === 'number') {
                    meshData.uvs.push(new Vector2(x, y));
                }
            }
        }

        if (data.indices && Array.isArray(data.indices)) {
            meshData.indices = data.indices;
        }

        if (data.origin && Array.isArray(data.origin)) {
            meshData.origin!.fromArray(data.origin);
        }

        if (data.grid_axes && Array.isArray(data.grid_axes)) {
            meshData.gridAxes = data.grid_axes;
        }

        return meshData;
    }
}
