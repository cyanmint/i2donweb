/**
    Abstractions for Godot RenderingDevice objects.

    Copyright © 2025, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
    
    Authors: Luna Nielsen
*/
module inochi2d.godot.render;
import godot.rendering_device;
import godot.variant;
import numem;

public import inochi2d.godot.render.buffer;
public import inochi2d.godot.render.texture;
public import inochi2d.godot.render.shader;


/**
    An object beloning to a rendering device.
*/
class RDObject : NuObject {
private:
@nogc:
    RenderingDevice device_;
    RID rid_;

protected:

    /**
        Constructs a new RDObject.

        Params:
            device =    The rendering device that owns this object.
            rid =       The render id of this object.
    */
    this(RenderingDevice device, RID rid) {
        this.device_ = device;
        this.rid_ = rid;
    }

public:

    // Destructor.
    ~this() {
        device_.freeRid(rid_);
    }

    /**
        The device which owns this object.
    */
    final @property RenderingDevice device() => device_;

    /**
        The RID of this object.
    */
    final @property RID rid() => rid_;
}