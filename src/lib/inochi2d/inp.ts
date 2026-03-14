/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/

import { Puppet, deserializePuppet } from "./puppet";
import * as THREE from 'three';
// @ts-expect-error binary-parser typings not resolved via exports
import { Parser } from "binary-parser";
import { decode } from "fast-png";
import { decodeTga } from "@lunapaint/tga-codec";

export async function downloadFile(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

export async function inImport(filebuffer: Uint8Array): Promise<Puppet> {
    const textureparser = new Parser()
        .uint32("payloadLength")
        .uint8("type")
        .array("data", { type: "uint8", length: "payloadLength" });

    const inpparser = new Parser()
        .string("magic", { length: 8, assert: "TRNSRTS\0" })
        .uint32("payloadLength")
        .string("payload", { length: "payloadLength" })
        .string("magic", { length: 8, assert: "TEX_SECT" })
        .uint32("textureCount")
        .array("textures", { type: textureparser, length: "textureCount" });

    const parsed = inpparser.parse(filebuffer);
    const textureLoads: Promise<THREE.DataTexture>[] = [];

    parsed.textures.forEach((texture: { type: number; data: number[] }) => {
        const t = texture.type;
        const data = new Uint8Array(texture.data);
        switch (t) {
            case 0:
                textureLoads.push(
                    new Promise((complete) => {
                        const png = decode(data);
                        const tex = new THREE.DataTexture(
                            png.data as unknown as BufferSource,
                            png.width,
                            png.height
                        );
                        tex.generateMipmaps = true;
                        tex.needsUpdate = true;
                        complete(tex);
                    })
                );
                break;
            case 1:
                textureLoads.push(
                    new Promise((complete, failure) => {
                        decodeTga(data, { detectAmbiguousAlphaChannel: true }).then(tga => {
                            const tex = new THREE.DataTexture(
                                tga.image.data as unknown as BufferSource,
                                tga.image.width,
                                tga.image.height
                            );
                            tex.generateMipmaps = true;
                            tex.needsUpdate = true;
                            complete(tex);
                        }).catch((reason) => {
                            failure(reason);
                        });
                    })
                );
                break;
            default:
                throw new Error("Could not decode texture data");
        }
    });

    const textures = await Promise.all(textureLoads);
    const puppet = deserializePuppet(JSON.parse(parsed.payload), textures);
    puppet.textures = Array.from(textures);
    return puppet;
}

export async function inImportFromURL(url: string): Promise<Puppet> {
    return await inImport(await downloadFile(url));
}

/**
 * Import a puppet from a File object (for drag & drop / file picker)
 */
export async function inImportFromFile(file: File): Promise<Puppet> {
    const buffer = await file.arrayBuffer();
    return await inImport(new Uint8Array(buffer));
}
