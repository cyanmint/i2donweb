/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/

import { Texture } from 'three';
import { Node } from './nodes/node';
import { deserializeNode } from "./nodes/serialiser";
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
}

export function deserializePuppet(json: { meta: PuppetMeta; nodes: Record<string, unknown>; param?: unknown[] }, textures: Texture[]): Puppet {
    const puppet = new Puppet();
    puppet.meta = json.meta;
    puppet.textures = textures;
    puppet.rootNode = deserializeNode(puppet, json.nodes);
    puppet.rootNode.transform.scale.y *= -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    puppet.params = Array.isArray(json.param) ? json.param.map((p) => Param.deserialize(p as any)) : [];
    puppet.rootNode.update();
    return puppet;
}
