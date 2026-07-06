# INP 2 Format Specification
With Inochi2D 0.9 a new file format has been created that aims to be more robust than the prior INP1 format.  

## Format Layout
The format is a little-endian binary format, aligned to 32 bits, consisting of tagged data nodes.

All INP2 streams begin with the magic bytes `TRNSRTS2` (`0x54524E5352545332`)

Each data node in the INP2 stream are denoted with a tag, which are stored in the lower byte of the tag. Tags must be ANDed with the tag mask `0x000000FF` to get the non-metadata tag. All tags are aligned to 32 bits. This is done by appending null bytes to non-32 bit aligned types or by extending integral types to 32 bits.

Example:  
```c
if ((tag & 0x000000FF) == 0x01) {
    // Tag contains boolean value.
}
```

| Type Tag | Contents                                              |
| -------: | :---------------------------------------------------- |
|   `0x00` | nil value.                                            |
|   `0x01` | boolean value (true/false), type-cast to 32 bit uint. |
|   `0x02` | 32-bit signed integer.                                |
|   `0x03` | 32-bit unsigned integer.                              |
|   `0x04` | 32-bit floating point number.                         |
|   `0x05` | UTF-8 encoded string, padded with null to 32 bits     |
|   `0x06` | Binary data, padded to 32 bits with null bytes.       |

DataNodes can additionally be recursively complex types consisting of objects and arrays.

| Type Tag | Contents                                 | Metadata      |
| -------: | :--------------------------------------- | :------------ |
|   `0xF0` | UTF-8 key in object, max 255 characters. | Length of Key |
|   `0x10` | Array Begin Sentinel                     | Element Count |
|   `0x11` | Array End Sentinel                       |               |
|   `0x12` | Object begin sentinel                    | Element Count |
|   `0x13` | Object end sentinel                      |               |

### Nil value
If the type tag is `0x00` skip to the next 32-bit aligned word.

### Numeric and boolean types
Numeric types are denoted by their tag, followed by their 32 bit value.
The tag's metadata is ignored.

Example:  
```c
// 42, signed.
0x00 0x00 0x00 0x02
0x00 0x00 0x00 0x2A
```

### Strings
If the string is longer than `16777214` (`0x00FFFFFE`) bytes, the length is appended as a unsigned integer,
otherwise the length is stored in the metadata.

Example:  
```c
// String, length 13.
0x00 0x00 0x0D 0x05

// "Hello, world!\0\0\0"
0x48 0x65 0x6C 0x6C 
0x6F 0x2C 0x20 0x77 
0x6F 0x72 0x6C 0x64 
0x21 0x00 0x00 0x00
```

### Blobs
If the blob is longer than `16777214` (`0x00FFFFFE`) bytes, the length is appended as a unsigned integer,
otherwise the length is stored in the metadata.

Blobs are followed by a CRC-32 checksum with the ISO-3309 polynomial `0xedb88320`

Example:  
```c
// Binary blob, length 13.
0x00 0x00 0x0D 0x06

// "Hello, world!\0\0\0"
0x48 0x65 0x6C 0x6C 
0x6F 0x2C 0x20 0x77 
0x6F 0x72 0x6C 0x64 
0x21 0x00 0x00 0x00

// CRC-32
0xEB 0xE6 0xC6 0xE6
```

### Arrays
Arrays are denoted by a start sentinel tag of `0x10`, followed by the DataNode values of the array.  
The array is terminated with a `0x11` tag.

### Objects
Objects are denoted by a start sentinel tag of `0x12`, followed by key-value pairs.  
Keys are denoted with `0xF0` and values are denoted as normal tags.
The object is terminated with a `0x13`

Example:  
```c
// Object with 1 element
0x00 0x00 0x01 0x12

// Key with 3 characters.
// "abc\0"
0x00 0x00 0x03 0xF0 
0x61 0x62 0x63 0x00

// 42
0x00 0x00 0x00 0x02
0x00 0x00 0x00 0x2A

// Object end
0x00 0x00 0x00 0x13
```