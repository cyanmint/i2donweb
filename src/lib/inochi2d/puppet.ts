/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/

import { Texture } from 'three';
import { Node } from './nodes/node';
import { deserializeNode, serializeNode } from "./nodes/serialiser";
import { SimplePhysics } from './nodes/simplephysics';
import { Param } from './param';

export const NO_THUMBNAIL = 4294967295;

export enum PuppetAllowedUsers {
    OnlyAuthor = "onlyAuthor",
    OnlyLicensee = "onlyLicensee",
    Everyone = "everyone"
}

export enum PuppetAllowedRedistribution {
    Prohibited = "prohibited",
    ViralLicense = "viralLicense",
    CopyleftLicense = "copyleftLicense"
}

export enum PuppetAllowedModification {
    Prohibited = "prohibited",
    AllowPersonal = "allowPersonal",
    AllowRedistribute = "allowRedistribute",
}

export class PuppetUsageRights {
    allowedUsers: PuppetAllowedUsers = PuppetAllowedUsers.OnlyAuthor;
    allowViolence: boolean = false;
    allowSexual: boolean = false;
    allowCommercial: boolean = false;
    allowRedistribution: PuppetAllowedRedistribution = PuppetAllowedRedistribution.Prohibited;
    allowModification: PuppetAllowedModification = PuppetAllowedModification.Prohibited;
    requireAttribution: boolean = false;
}

export class PuppetMeta {
    name: string = "";
    version: string = "1.0-alpha";
    rigger: string = "";
    artist: string = "";
    rights: PuppetUsageRights = new PuppetUsageRights();
    copyright: string = "";
    licenseURL: string = "";
    contact: string = "";
    reference: string = "";
    thumbnailId: number = NO_THUMBNAIL;
    preservePixels: boolean = false;
}

export class Puppet {
    meta: PuppetMeta = new PuppetMeta();
    textures: Texture[] = [];
    rootNode: Node = new Node();
    nodes: Node[] = [];
    params: Param[] = [];

    /** Global gravity scale used by `SimplePhysics` nodes (from the puppet's `physics.gravity`). */
    physicsGravity: number = 9.8;
    /** Pixels-per-meter scale used by `SimplePhysics` nodes (from the puppet's `physics.pixelsPerMeter`). */
    physicsPixelsPerMeter: number = 1000;

    /**
     * Re-applies all of this puppet's parameters to their bound nodes/meshes
     * and refreshes the puppet's transforms & mesh deformations accordingly.
     * Should be called whenever a parameter's value changes.
     */
    updateParameters(): void {
        for (const node of this.nodes) {
            node.resetParamOffset();
        }

        for (const param of this.params) {
            param.apply(this);
        }

        this.rootNode.updateRecursive();
    }

    /**
     * Advances all `SimplePhysics` driver nodes by `deltaSeconds`, pushing
     * their simulated output into their target parameters, and then
     * re-applies all parameters (see `updateParameters()`). Should be
     * called once per rendered frame.
     */
    updatePhysics(deltaSeconds: number): void {
        let hasPhysics = false;
        for (const node of this.nodes) {
            if (node instanceof SimplePhysics) {
                node.updateDriver(deltaSeconds, this);
                hasPhysics = true;
            }
        }
        if (hasPhysics) this.updateParameters();
    }

    /**
     * Serializes this puppet back into the plain JSON payload shape used by
     * `deserializePuppet` / the `.inx` puppet format (the same shape stored
     * inside the `TRNSRTS` container's JSON payload).
     */
    serialize(): { meta: PuppetMeta; physics: { pixelsPerMeter: number; gravity: number }; nodes: Record<string, unknown>; param: unknown[] } {
        const nodes = serializeNode(this.rootNode);
        // Import applies `rootNode.transform.scale.y *= -1` once after
        // deserialization; undo that here so the raw scale round-trips.
        const transform = nodes.transform as { scale: number[] };
        transform.scale = [transform.scale[0], transform.scale[1] * -1];

        return {
            meta: this.meta,
            physics: {
                pixelsPerMeter: this.physicsPixelsPerMeter,
                gravity: this.physicsGravity,
            },
            nodes,
            param: this.params.map((param) => param.serialize()),
        };
    }
}

export function deserializePuppet(json: { meta: PuppetMeta; nodes: Record<string, unknown>; param?: unknown[]; physics?: { pixelsPerMeter?: number; gravity?: number } }, textures: Texture[]): Puppet {
    const puppet = new Puppet();
    puppet.meta = json.meta;
    puppet.textures = textures;
    if (json.physics) {
        if (typeof json.physics.pixelsPerMeter === 'number') puppet.physicsPixelsPerMeter = json.physics.pixelsPerMeter;
        if (typeof json.physics.gravity === 'number') puppet.physicsGravity = json.physics.gravity;
    }
    puppet.rootNode = deserializeNode(puppet, json.nodes);
    puppet.rootNode.transform.scale.y *= -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    puppet.params = Array.isArray(json.param) ? json.param.map((p) => Param.deserialize(p as any)) : [];
    puppet.rootNode.update();
    return puppet;
}
