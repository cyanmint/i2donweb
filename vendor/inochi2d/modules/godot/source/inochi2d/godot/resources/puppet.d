module inochi2d.godot.resources.puppet;
import godot.resource_format_loader;
import godot.resource_loader;
import godot.resource;
import godot.variant;
import godot;

import inochi2d.puppet;
import numem;

/**
    A resource for an Inochi2D Puppet
*/
@class_name("Inochi2DPuppetResource")
class PuppetResource : Resource {
private:
@nogc:
    PackedArray!ubyte data_;

public:

    /**
        Data of the puppet.
    */
    final @property PackedArray!ubyte data() => data_;

    /**
        Size of the model file in bytes.
    */
    @gd_export_custom(PROPERTY_HINT_ONESHOT, "", PROPERTY_USAGE_EDITOR | PROPERTY_USAGE_READ_ONLY)
    final @property uint fileSize() => cast(uint)data_.size;

    /// Constructor
    this() { }

    /**
        Loads an Inochi2D puppet from file.
    */
    @gd_hide bool loadFile(String path) {
        import godot.file_access : FileAccess;
        import core.stdc.stdio : printf;

        // Load data from file.
        this.data_ = FileAccess.getFileAsBytes(path);
        return data_.ptrw !is null;
    }

    /**
        Realizes an instance of the puppet from the resource.
    */
    @gd_hide Puppet realize() {
        import nulib.io.stream : MemoryStream;

        // Load puppet into stream
        auto mstream = nogc_new!MemoryStream(data_[]);
        scope(exit) {
            // Yoink the ownership so we don't free the array.
            mstream.take();
            nogc_delete(mstream);
        }

        // Parse puppet
        auto puppet = Puppet.fromStream(mstream);
        if (!puppet.isOK) {
            printError(puppet.error);
            return null;
        }

        // Success!
        return puppet.get();
    }
}
mixin GodotClass!PuppetResource;

/**
    Puppet resource loader.
*/
@gd_editor
@class_name("Inochi2DPuppetResourceFormatLoader")
class PuppetResourceFormatLoader : ResourceFormatLoader {
private:
@nogc:
    __gshared PuppetResourceFormatLoader __instance;

public:

    /**
        Gets the list of extensions for files this loader is able to read.

        Returns:
            A list of file extensions that this loader supports.
    */
    override PackedArray!String getRecognizedExtensions_() {
        PackedArray!String str;
        str.resize(2);
        str.ptrw[0] = String("inp");
        str.ptrw[1] = String("inx");
        return str;
    }

    /**
        Tells Godot whether this format loader handles the given type.

        Params:
            type = The name of the resource type to query.
        
        Returns:
            $(D true) if this loader handles the given type,
            $(D false) otherwise.
    */
    override bool handlesType_(StringName type) {
        return type == classNameOf!PuppetResource;
    }

    /**
        Gets the resource type to create for a given path string.

        Params:
            path = The path to the file that is to be loaded.

        Returns:
            The name of the resource that should be loaded,
            or a nil string if that file extension is not handled.
    */
    override String getResourceType_(String path) {
        if (path.endsWith(".inp") || path.endsWith(".inx"))
            return String(classNameOf!PuppetResource);
        return String.init;
    }

    /**
        Loads the given resource from the given path.

        Params:
            path =          The path to the file to load.
            originalpath =  The original path of the file.
            usesubthreads = Whether to use sub-threads.
            cachemode =     The caching mode.
        
        Returns:
            A variant wrapping a referenced resource on success,
            $(D Variant.init) otherwise.
    */
    override Variant load_(String path, String originalpath, bool usesubthreads, long cachemode) {
        if (PuppetResource res = gd_new!PuppetResource) {
            if (res.loadFile(path))
                return Variant(gde_ref(res));
        }
        return Variant.init;
    }

    /**
        Special callback that is called by nugodot after all types have been loaded.
    */
    static void __gde_postregistration() {
        __instance = gd_new!PuppetResourceFormatLoader();
        ResourceLoader.instance.addResourceFormatLoader(__instance, true);
    }

    /**
        Special callback that is called by nugodot before all types get unloaded.
    */
    static void __gde_preunregistration() {
        ResourceLoader.instance.removeResourceFormatLoader(__instance);
        __instance = null;
    }
    
}
mixin GodotClass!PuppetResourceFormatLoader;