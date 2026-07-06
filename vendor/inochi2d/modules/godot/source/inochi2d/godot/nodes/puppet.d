module inochi2d.godot.nodes.puppet;
import inochi2d.godot.resources.puppet;
import inochi2d.godot.render;
import inochi2d.core.render;
import inochi2d.core.mesh;
import inochi2d.puppet;
import godot.rendering_server;
import godot.rendering_device;
import godot.viewport;
import godot.node2d;
import godot.image;
import godot.world2d;
import godot;
import numem;

/**
    An Inochi2D Puppet in the godot scene tree.
*/
@class_name("Inochi2DPuppet")
class Puppet2D : Node2D {
private:
@nogc:
    Viewport viewport_;
    Puppet2DState state_;
    PuppetResource resource_;
    Puppet puppet_;

protected:

    /**
        Updates and renders the puppet to its internal draw list.
    */
    override void process_(double delta) {
        state_.update(delta);
    }

public:

    /// Destructor
    ~this() {
        if (resource_)
            gd_delete(resource_);

        if (state_)
            nogc_delete(state_);
    }

    /**
        Name of the loaded puppet.
    */
    @gd_export_custom(PROPERTY_HINT_ONESHOT, "", PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY)
    final @property String name() => String(puppet_ ? puppet_.properties.name : null);

    /**
        Author of the loaded puppet.
    */
    @gd_export_custom(PROPERTY_HINT_ONESHOT, "", PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY)
    final @property String author() => String(puppet_ ? puppet_.properties.author : null);

    /**
        The puppet resource
    */
    @gd_export final @property PuppetResource puppet() => resource_;
    @gd_export final @property void puppet(PuppetResource value) {
        if (state_)
            nogc_delete(state_);

        if (puppet_)
            nogc_delete(puppet_);

        this.resource_ = gde_refswap(resource_, value);
        if (resource_) {
            this.puppet_ = resource_.realize();
            this.state_ = nogc_new!Puppet2DState(this);
        }
    }

    /**
        The actual loaded puppet instance.
    */
    @gd_hide final @property Puppet instance() => puppet_;
}
mixin GodotClass!Puppet2D;

/**
    The internal rendering state of the puppet.

    This wraps all the memory managment needed from godot.
*/
class Puppet2DState : NuObject {
private:
@nogc:
    //
    //              VARIABLES
    //
    Puppet2D puppet;
    RenderingDevice device;




    //
    //              TEXTURE MANAGMENT
    //
    RDTexture[] textures;

    void loadTextures() {
        import godot.core.gdextension;
        import core.stdc.stdio : printf;
        printf("%p %p\n", device, device.ptr);

        TextureCache cache = puppet.instance.textureCache;
        this.textures = nu_malloca!RDTexture(cache.cache.length);
        foreach(i, Texture texture; cache.cache) {

            // Only load formats that Godot understands.
            if (texture.format.toGodotFormat() != TextureDataFormat.DATA_FORMAT_MAX) {

                // Create texture format info.
                RDTextureFormat p_format = gd_new!RDTextureFormat();
                p_format.textureType = TextureType.TEXTURE_TYPE_2D;
                p_format.format = texture.format.toGodotFormat();
                p_format.samples = TextureSamples.TEXTURE_SAMPLES_1;
                p_format.usageBits = TextureUsageFlags.TEXTURE_USAGE_SAMPLING_BIT;
                p_format.width = texture.width;
                p_format.height = texture.height;
                p_format.depth = 1;
                p_format.arrayLayers = 1;
                p_format.mipmaps = 1;
                p_format.addShareableFormat(texture.format.toGodotFormat());

                // Create texture view with default settings.
                RDTextureView p_view = gd_new!RDTextureView();
                gde_ref(p_view);

                // Create texture.
                this.textures[i] = nogc_new!RDTexture(device, p_format, p_view, cast(ubyte[])texture.data.data);
            }
        }
    }
    
    void freeTextures() {
        if (textures.length > 0) {
            nu_freea(textures);
        }
    }




    //
    //              SHADERS
    //
    RDShader baseShader;



    //
    //              MESH MANAGMENT
    //
    RDVertexBuffer vertexBuffer;
    RDIndexBuffer indexBuffer;

    void updateVertexData() {
        auto vertices = puppet.instance.drawList.vertices;
        auto indices = puppet.instance.drawList.indices;

        // Create or resize vertex buffer if needed.
        if (!vertexBuffer || vertexBuffer.size < vertices.length*VtxData.sizeof) {
            if (vertexBuffer)
                nogc_delete(vertexBuffer);

            vertexBuffer = nogc_new!RDVertexBuffer(device, vertices.length*VtxData.sizeof, cast(BufferCreationFlags)0);
        }
        vertexBuffer.update(cast(void[])vertices, 0);

        // Create or resize index buffer if needed.
        if (!indexBuffer || indexBuffer.size < indices.length*uint.sizeof) {
            if (indexBuffer)
                nogc_delete(indexBuffer);

            indexBuffer = nogc_new!RDIndexBuffer(device, IndexBufferFormat.INDEX_BUFFER_FORMAT_UINT32, cast(uint)indices.length, cast(BufferCreationFlags)0);
        }
        indexBuffer.update(cast(void[])indices, 0);
    }




    //
    //              RENDERING
    //
    void drawToGodot() {

        // Update all vertex data mappings before rendering.
        this.updateVertexData();

        // Go through the commands
        foreach(ref DrawCmd command; puppet.instance.drawList.commands) {

        }
    }


public:

    /**
        The viewport being rendered to.
    */
    final @property Viewport viewport() => puppet.getViewport();

    // Destructor
    ~this() {
        this.freeTextures();
    }

    /**
        Constructs a puppet rendering state object.

        Params:
            puppet = The puppet to wrap state for.
    */
    this(Puppet2D puppet) {
        this.puppet = puppet;
        this.device = RenderingServer.instance.getRenderingDevice();
        this.loadTextures();
    }

    /**
        Updates and renders the puppet.

        Params:
            delta = Time since last frame.
    */
    void update(float delta) {
        puppet.instance.update(delta);
        puppet.instance.draw(delta);
        this.drawToGodot();
    }
}

/**
    A managed godot framebuffer, basically a collection of a 
    Viewport and Canvas. 
*/
struct GodotFramebuffer {
public:
@nogc:
    RID viewport;
    RID canvas;
    RID canvasItem;

    /**
        Creates a new framebuffer.
    */
    static GodotFramebuffer create() {
        GodotFramebuffer fbo;
        fbo.viewport = RenderingServer.instance.viewportCreate();
        fbo.canvas = RenderingServer.instance.canvasCreate();
        fbo.canvasItem = RenderingServer.instance.canvasItemCreate();
        RenderingServer.instance.viewportAttachCanvas(fbo.viewport, fbo.canvas);
        RenderingServer.instance.viewportSetDisable3d(fbo.viewport, true);
        return fbo;
    }

    /**
        Frees this framebuffer.
    */
    void free() {
        RenderingServer.instance.freeRid(viewport);
        RenderingServer.instance.freeRid(canvas);
    
        viewport = RID.init;
        canvas = RID.init;
    }
}

TextureDataFormat toGodotFormat(TextureFormat format) @nogc nothrow pure {
    final switch(format) with(TextureFormat) {
        case none:
            return TextureDataFormat.DATA_FORMAT_MAX;
        
        case rgba8Unorm:
            return TextureDataFormat.DATA_FORMAT_R8G8B8A8_UNORM;
        
        case r8:
            return TextureDataFormat.DATA_FORMAT_R8_UNORM;

        case depthStencil:
            return TextureDataFormat.DATA_FORMAT_D24_UNORM_S8_UINT;
    }
}