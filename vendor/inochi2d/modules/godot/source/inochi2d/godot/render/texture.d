/**
    RenderingDevice texture abstraction.

    Copyright © 2025, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
    
    Authors: Luna Nielsen
*/
module inochi2d.godot.render.texture;
import inochi2d.godot.render;
import godot.rendering_device;
import godot.variant;
import godot;
import numem;

public import godot.rd_texture_format;
public import godot.rd_texture_view;

/**
    Texture type
*/
alias TextureType = RenderingDevice.TextureType;

/**
    Texture swizzle
*/
alias TextureSwizzle = RenderingDevice.TextureSwizzle;

/**
    Texture usage flags
*/
alias TextureUsageFlags = RenderingDevice.TextureUsageBits;

/**
    Texture samples
*/
alias TextureSamples = RenderingDevice.TextureSamples;

/**
    Texture format.
*/
alias TextureDataFormat = RenderingDevice.DataFormat;

/**
    A 2D texture
*/
class RDTexture : RDObject {
private:
@nogc:

public:

    /**
        The format of this texture.
    */
    final @property RDTextureFormat format() => device.textureGetFormat(rid);

    /**
        Creates a new RDTexture2D.

        Params:
            device =    The owning device
            format =    The format of the texture
            view =      The texture view of the texture
            data =      The data to set for the texture's 0th mip-level.
    */
    this(RenderingDevice device, RDTextureFormat format, RDTextureView view, ubyte[] data) {
        auto p_data_array = TypedArray!(PackedArray!ubyte)(1);
        p_data_array[0] = PackedArray!ubyte(data.nu_dup());
        super(device, device.textureCreate(format, view, p_data_array));
    }

    /**
        Updates the data in the texture.

        Params:
            layer = The layer to update
            data =  The data to write to the layer.
    */
    void update(int layer, void[] data) {
        auto p_data = gde_to_packed_array(cast(ubyte[])data);
        device.textureUpdate(rid, layer, p_data);
        gd_delete(p_data);
    }
}