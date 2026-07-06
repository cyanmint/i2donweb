/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
*/

import { deserializeTransform } from "../math/transform";
import { MeshData } from "../meshdata";
import { Node, BlendMode, PathDeform, Composite, MaskingMode } from "./node";
import { Drawable, Part, Mask, MaskData } from "./drawable";
import { SimplePhysics, PhysicsModel, ParamMapMode } from "./simplephysics";
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

function deserializeComposite(puppet: Puppet, json: Record<string, unknown>): Composite {
    let composite = new Composite();
    composite = deserializeBaseProperties(puppet, json, composite) as Composite;

    composite.opacity = json.opacity !== undefined ? json.opacity as number : composite.opacity;
    composite.mask_mode = json.mask_mode !== undefined ? json.mask_mode as MaskingMode : composite.mask_mode;
    composite.mask_threshold = json.mask_threshold !== undefined ? json.mask_threshold as number : composite.mask_threshold;
    composite.masked_by = json.masked_by !== undefined ? json.masked_by as number[] : composite.masked_by;

    if (json.blend_mode) {
        switch (json.blend_mode as string) {
            case "Multiply":
                composite.blend_mode = BlendMode.Multiply;
                break;
            case "ColorDodge":
                composite.blend_mode = BlendMode.ColorDodge;
                break;
            case "LinearDodge":
                composite.blend_mode = BlendMode.LinearDodge;
                break;
            case "Screen":
                composite.blend_mode = BlendMode.Screen;
                break;
            default:
                composite.blend_mode = BlendMode.Normal;
        }
    }

    return composite;
}

function deserializeCustomNode(puppet: Puppet, json: Record<string, unknown>): Node {
    let node = new Node();
    node = deserializeBaseProperties(puppet, json, node);
    return node;
}

function deserializeSimplePhysics(puppet: Puppet, json: Record<string, unknown>): SimplePhysics {
    let physics = new SimplePhysics();
    physics = deserializeBaseProperties(puppet, json, physics) as SimplePhysics;

    physics.target = (json.param ?? json.target) as number;
    physics.model_type = json.model_type !== undefined ? json.model_type as PhysicsModel : physics.model_type;
    physics.map_mode = json.map_mode !== undefined ? json.map_mode as ParamMapMode : physics.map_mode;
    physics.gravity = json.gravity !== undefined ? json.gravity as number : physics.gravity;
    physics.length = json.length !== undefined ? json.length as number : physics.length;
    physics.frequency = json.frequency !== undefined ? json.frequency as number : physics.frequency;
    physics.angle_damping = json.angle_damping !== undefined ? json.angle_damping as number : physics.angle_damping;
    physics.length_damping = json.length_damping !== undefined ? json.length_damping as number : physics.length_damping;
    physics.local_only = json.local_only !== undefined ? json.local_only as boolean : physics.local_only;
    if (Array.isArray(json.output_scale)) {
        physics.output_scale.fromArray(json.output_scale as number[]);
    }

    return physics;
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
        case "Composite":
            result = deserializeComposite(puppet, json);
            break;
        case "SimplePhysics":
            result = deserializeSimplePhysics(puppet, json);
            break;
        default:
            result = deserializeCustomNode(puppet, json);
            break;
    }

    result.parent = parent;
    (puppet as Puppet).nodes.push(result);
    return result;
}
