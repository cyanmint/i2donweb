/**
    RenderingDevice buffer abstraction.

    Copyright © 2025, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
    
    Authors: Luna Nielsen
*/
module inochi2d.godot.render.buffer;
import inochi2d.godot.render;
import godot.rendering_device;
import godot.variant;
import godot.globals;
import godot;
import numem;

/**
    Buffer creation flags.
*/
alias BufferCreationFlags = RenderingDevice.BufferCreationBits;

/**
    Index buffer formats.
*/
alias IndexBufferFormat = RenderingDevice.IndexBufferFormat;

/**
    Base class for RenderingDevice buffers.
*/
abstract class RDBuffer : RDObject {
private:
@nogc:
    size_t size_;

protected:

    /**
        Constructs a new RDBuffer.

        Params:
            device =    The rendering device that owns this object.
            rid =       The render id of this object.
            size =      Size of the buffer in bytes.
    */
    this(RenderingDevice device, RID rid, size_t size) {
        super(device, rid);
        this.size_ = size;
    }

public:

    /**
        Size of the buffer in bytes.
    */
    final @property size_t size() => size_;

    /**
        Updates the contents of the buffer.

        Params:
            data =      The data to upload to the GPU
            offset =    The offset into the buffer to upload the data.
        
        Returns:
            $(D GDError.OK) on success,
            $(D GDError) status code on failure.
    */
    final GDError update(void[] data, int offset) {
        auto p_data = PackedArray!(ubyte)(cast(ubyte[])data);
        auto p_error = device.bufferUpdate(rid, offset, cast(uint)data.length, p_data);
        gd_delete(p_data);
        return p_error;
    }
}

/**
    An index buffer.
*/
class RDIndexBuffer : RDBuffer {
public:
@nogc:

    this(RenderingDevice device, IndexBufferFormat format, uint indexCount, BufferCreationFlags flags) {
        size_t p_size = (16 * (format+1))*indexCount;
        super(device, device.indexBufferCreate(indexCount, format, PackedArray!(ubyte).init, false, flags), p_size);
    }
}

/**
    A vertex buffer.
*/
class RDVertexBuffer : RDBuffer {
public:
@nogc:

    this(RenderingDevice device, size_t sizeInBytes, BufferCreationFlags flags) {
        super(device, device.vertexBufferCreate(cast(int)sizeInBytes, PackedArray!(ubyte).init, flags), sizeInBytes);
    }
}

/**
    A uniform buffer.
*/
class RDUniformBuffer : RDBuffer {
public:
@nogc:

    this(RenderingDevice device, size_t sizeInBytes, BufferCreationFlags flags) {
        super(device, device.uniformBufferCreate(cast(int)sizeInBytes, PackedArray!(ubyte).init, flags), sizeInBytes);
    }
}