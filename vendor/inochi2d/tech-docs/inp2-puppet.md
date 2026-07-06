# INP2 Puppet Format Specification
Inochi2D 0.9 has moved to a new custom file format for storing puppets, the base serialization format is described in
[inp2.md](./inp2.md).  
It is recommended that you read the serialization format document first.

The root of an Inochi2D Puppet is a DataNode Object, said object must contain the following keys:  
|        Key | Value Type | Usage                | Required |
| ---------: | :--------- | :------------------- | :------: |
| `INP_SECT` | Object     | Inochi2D Puppet      |    ✓    |
| `TEX_SECT` | Array      | Texture Blobs        |    ✓    |
| `EXT_SECT` | Object     | Vendor Extended Data |          |

## `INP_SECT`
This section contains the payload for the puppet, in INP1 this was encoded as JSON,
in INP2 this is encoded entirely in the INP format.

## `TEX_SECT`
This section contains the textures of the puppet, they are laid out as an array of objects.  
The objects are defined as follows:

|    Field | Type      |
| -------: | :-------- |
| `format` | `uint8_t` |
|   `data` | `blob`    |


### Texture Formats
The following texture formats are defined in the Inochi2D Specification:

|     ID | Format                                                                                                 |
| -----: | :----------------------------------------------------------------------------------------------------- |
| `0x00` | [PNG - Portable Network Graphics](https://en.wikipedia.org/wiki/Portable_Network_Graphics) (Lossless)  |
| `0x01` | [TGA - Truevision TGA](https://en.wikipedia.org/wiki/Truevision_TGA) (Lossless)                        |
| `0x02` | [BC7 - BPTC Texture Compression](https://www.khronos.org/opengl/wiki/BPTC_Texture_Compression) (Lossy) |
| `0xFF` | Reserved Invalid Texture Tag                                                                           |

## `EXT_SECT`
This section contains data which vendors can attach to a puppet to store application-specific metadata with a puppet.
The section is laid out as an object, where each key is the Reverse Domain Notation of the source application, and the value
is a blob.
