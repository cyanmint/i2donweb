/**
    RenderingDevice shader abstraction.

    Copyright © 2025, Inochi2D Project
    Distributed under the 2-Clause BSD License, see LICENSE file.
    
    Authors: Luna Nielsen
*/
module inochi2d.godot.render.shader;
import inochi2d.godot.render;
import godot.rendering_device;
import godot.variant;
import godot;
import numem;

public import godot.rd_shader_source;
public import godot.rd_shaderspirv;

/**
    A shader.
*/
class RDShader : RDObject {
public:
@nogc:

    /**
        Constructs a new shader.

        Params:
            device =    The device that owns the shader.
            name =      The name of the shader.
            vertex =    The GLSL source of the vertex shader.
            fragment =  The GLSL source of the fragment shader.
    */
    this(RenderingDevice device, string name, string vertex, string fragment) {
        RDShaderSource p_source = gd_new!RDShaderSource();
        p_source.language = RenderingDevice.SHADER_LANGUAGE_GLSL;
        p_source.sourceVertex = String(vertex);
        p_source.sourceFragment = String(fragment);

        RDShaderSPIRV p_spirv = device.shaderCompileSpirvFromSource(p_source, true);
        super(device, device.shaderCreateFromSpirv(p_spirv, String(name)));

        gde_unref(p_spirv);
        gde_unref(p_source);
    }
}