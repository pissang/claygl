/**
 * @export{object} library
 */
define(function(require) {

    var Shader = require("../shader");
    var _ = require("_");

    _library = {};

    _pool = {};

    // Example
    // ShaderLibrary.get("buildin.phong", "diffuse", "normal");
    // Or
    // ShaderLibrary.get("buildin.phong", ["diffuse", "normal"]);
    function get(name, enabledTextures) {
        if (!enabledTextures) {
            enabledTextures = [];
        } 
        else if (typeof(enabledTextures) === "string") {
            enabledTextures = Array.prototype.slice.call(arguments, 1);
        }
        // Sort as first letter in increase order
        // And merge with name as a key string
        var key = name + "_" + enabledTextures.sort().join(",");
        if (_pool[key]) {
            return _pool[key];
        } else {
            var source = _library[name];
            if (! source) {
                console.error('Shader "'+name+'"'+' is not in the library');
                return;
            }
            var shader = new Shader({
                "vertex" : source.vertex,
                "fragment" : source.fragment
            })
            _.each(enabledTextures, function(symbol) {
                shader.enableTexture(symbol);
            });
            _pool[key] = shader;
            return shader;
        }
    }

    function put(name, vertex, fragment) {
        _library[name] = {
            vertex : vertex,
            fragment : fragment
        }
    }

    // Some build in shaders
    Shader.import(require('text!./source/basic.essl'));
    Shader.import(require('text!./source/lambert.essl'));
    Shader.import(require('text!./source/phong.essl'));
    Shader.import(require('text!./source/wireframe.essl'));
    Shader.import(require('text!./source/util.essl'));
    // Shader.import(require('text!3d/shader/source/depth.essl'));

    put("buildin.basic", Shader.source("buildin.basic.vertex"), Shader.source("buildin.basic.fragment"));
    put("buildin.lambert", Shader.source("buildin.lambert.vertex"), Shader.source("buildin.lambert.fragment"));
    put("buildin.phong", Shader.source("buildin.phong.vertex"), Shader.source("buildin.phong.fragment"));
    put("buildin.wireframe", Shader.source("buildin.wireframe.vertex"), Shader.source("buildin.wireframe.fragment"));
    // put("buildin.depth", Shader.source("buildin.depth.vertex"), Shader.source("buildin.depth.fragment"));

    return {
        get : get,
        put : put
    }
})