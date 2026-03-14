/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
*/

import { deserializeTransform } from "../math/transform";
import { MeshData } from "../meshdata";
import { Node, BlendMode, PathDeform } from "./node";
import { Drawable, Part, Mask, MaskData } from "./drawable";
import { Puppet } from "../puppet";

function deserializeBaseProperties(puppet: Puppet, json: Record<string, unknown>, node: Node): Node {
    node.puppet = puppet;
    node.type = json.type as string;
    node.uuid = json.uuid as number;
    node.name = json.name as string;
    node.enabled = json.enabled !== undefined ? json.enabled as boolean : node.enabled;
    node.zsort = json.zsort !== undefined ? json.zsort as number : node.zsort;
    node.transform = json.transform !== undefined
        ? deserializeTransform(json.transform as { rot: number[]; scale: number[]; trans: number[] })
        : node.transform;
    node.children = json.children !== undefined
        ? (json.children as Record<string, unknown>[]).map((child) => deserializeNode(puppet, child, node))
        : node.children;
    node.lockToRoot = json.lockToRoot !== undefined ? json.lockToRoot as boolean : node.lockToRoot;
    return node;
}

function deserializeDrawable(puppet: Puppet, json: Record<string, unknown>, drawable: Drawable): Drawable {
    drawable = deserializeBaseProperties(puppet, json, drawable) as Drawable;
    drawable.mesh = MeshData.deserialize(json.mesh as Record<string, unknown>);

    drawable.masks = json.masks !== undefined
        ? (json.masks as Record<string, unknown>[]).map((mask) => {
            const maskData = new MaskData();
            if (mask.mode) {
                switch (mask.mode as string) {
                    case "Mask":
                        maskData.mode = BlendMode.ClipToLower;
                        break;
                    case "Dodge":
                        maskData.mode = BlendMode.SliceFromLower;
                        break;
                    default:
                        maskData.mode = BlendMode.Normal;
                }
            }
            maskData.source = mask.source as number;
            return maskData;
        })
        : [];

    return drawable;
}

function deserializePart(puppet: Puppet, json: Record<string, unknown>): Part {
    let part = new Part();
    part = deserializeDrawable(puppet, json, part) as Part;

    part.textures = json.textures as number[];
    part.opacity = json.opacity as number;
    part.mask_mode = json.mask_mode as number;
    part.mask_threshold = json.mask_threshold as number;
    part.masked_by = json.masked_by as number[];

    if (json.blend_mode) {
        switch (json.blend_mode as string) {
            case "Multiply":
                part.blend_mode = BlendMode.Multiply;
                break;
            case "ColorDodge":
                part.blend_mode = BlendMode.ColorDodge;
                break;
            case "LinearDodge":
                part.blend_mode = BlendMode.LinearDodge;
                break;
            case "Screen":
                part.blend_mode = BlendMode.Screen;
                break;
            default:
                part.blend_mode = BlendMode.Normal;
        }
    }

    return part;
}

function deserializeMask(puppet: Puppet, json: Record<string, unknown>): Mask {
    let mask = new Mask();
    mask = deserializeDrawable(puppet, json, mask) as Mask;
    return mask;
}

function deserializePathDeform(puppet: Puppet, json: Record<string, unknown>): PathDeform {
    let pathDeform = new PathDeform();
    pathDeform = deserializeBaseProperties(puppet, json, pathDeform) as PathDeform;
    pathDeform.joints = json.joints as THREE.Vector2[];
    pathDeform.bindings = json.bindings as { bound_to: number; bind_data: number[][] }[];
    return pathDeform;
}

function deserializeCustomNode(puppet: Puppet, json: Record<string, unknown>): Node {
    let node = new Node();
    node = deserializeBaseProperties(puppet, json, node);
    return node;
}

/**
 * Deserializes a JSON object into the appropriate Node subclass.
 */
export function deserializeNode(puppet: Puppet, json: Record<string, unknown>, parent: Node | null = null): Node {
    let result = new Node();
    switch (json.type as string) {
        case "Part":
            result = deserializePart(puppet, json);
            break;
        case "Mask":
            result = deserializeMask(puppet, json);
            break;
        case "PathDeform":
            result = deserializePathDeform(puppet, json);
            break;
        default:
            result = deserializeCustomNode(puppet, json);
            break;
    }

    result.parent = parent;
    (puppet as Puppet).nodes.push(result);
    return result;
}
