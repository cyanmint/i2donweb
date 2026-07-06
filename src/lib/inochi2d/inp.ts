/*
    Copyright © 2020, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.

    Authors: Luna Nielsen
*/

import { Puppet, deserializePuppet } from "./puppet";
import * as THREE from 'three';
// @ts-expect-error binary-parser typings not resolved via exports
import { Parser } from "binary-parser";
import { decode, encode } from "fast-png";
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

/**
 * Exports a puppet to the `.inx`/`.inp` `TRNSRTS` container format: an
 * 8-byte magic, the JSON payload (this puppet's serialized data, length
 * prefixed), followed by an `TEX_SECT` texture section (each texture
 * re-encoded as a length + encoding-type prefixed PNG blob).
 *
 * Translated from `inp.format.inp1.writer.writeINP1`
 * (vendor/inochi2d/modules/inp/source/inp/format/inp1/writer.d).
 */
export function inExport(puppet: Puppet): Uint8Array {
    const encoder = new TextEncoder();
    const magic = encoder.encode("TRNSRTS\0");
    const texSectMagic = encoder.encode("TEX_SECT");
    const payload = encoder.encode(JSON.stringify(puppet.serialize()));

    const textureBlobs: Uint8Array[] = puppet.textures.map((texture) => {
        const image = texture.image as { width: number; height: number; data: unknown };
        const raw = image.data;
        const data = raw instanceof Uint8Array
            ? raw
            : Uint8Array.from(raw as ArrayLike<number>);
        return encode({ width: image.width, height: image.height, data, depth: 8, channels: 4 });
    });

    let totalLength = magic.length + 4 + payload.length + texSectMagic.length + 4;
    for (const blob of textureBlobs) totalLength += 4 + 1 + blob.length;

    const buffer = new Uint8Array(totalLength);
    const view = new DataView(buffer.buffer);
    let offset = 0;

    buffer.set(magic, offset);
    offset += magic.length;
    view.setUint32(offset, payload.length);
    offset += 4;
    buffer.set(payload, offset);
    offset += payload.length;

    buffer.set(texSectMagic, offset);
    offset += texSectMagic.length;
    view.setUint32(offset, textureBlobs.length);
    offset += 4;
    for (const blob of textureBlobs) {
        view.setUint32(offset, blob.length);
        offset += 4;
        buffer[offset] = 0; // encoding type 0 = PNG
        offset += 1;
        buffer.set(blob, offset);
        offset += blob.length;
    }

    return buffer;
}

/**
 * Exports a puppet and triggers a browser download of the resulting `.inx`
 * file (mirrors Inochi Creator's "Export" action, `creator.io.inpexport`).
 */
export function inExportToFile(puppet: Puppet, filename: string): void {
    const data = inExport(puppet);
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.inx') || filename.endsWith('.inp') ? filename : `${filename}.inx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        URL.revokeObjectURL(url);
    }
}
