/**
 * @export{object} library
 */
define(function(require) {

    var Shader = require("../Shader");
    var _ = require("_");

    _library = {};

    _pool = {};

    // Example
    // ShaderLibrary.get("buildin.phong", "diffuseMap", "normalMap");
    // Or
    // ShaderLibrary.get("buildin.phong", ["diffuseMap", "normalMap"]);
    // Or
    // ShaderLibrary.get("buildin.phong", {
    //      textures : ["diffuseMap"],
    //      vertexDefines : {},
    //      fragmentDefines : {}
    // })
    function get(name, config) {
        var enabledTextures = [];
        var vertexDefines = {};
        var fragmentDefines = {};
        if (typeof(config) === "string") {
            enabledTextures = Array.prototype.slice.call(arguments, 1);
        }
        else if (toString.call(config) == '[object Object]') {
            enabledTextures = config.textures || [];
            vertexDefines = config.vertexDefines || {};
            fragmentDefines = config.fragmentDefines || {};
        } 
        else if(config instanceof Array) {
            enabledTextures = config;
        }
        var vertexDefineKeys = Object.keys(vertexDefines);
        var fragmentDefineKeys = Object.keys(fragmentDefines);
        enabledTextures.sort(); 
        vertexDefineKeys.sort();
        fragmentDefineKeys.sort();

        var keyArr = [];
        keyArr = keyArr.concat(enabledTextures);
        for (var i = 0; i < vertexDefineKeys.length; i++) {
            keyArr.push(vertexDefines[vertexDefineKeys[i]]);
        }
        for (var i = 0; i < fragmentDefineKeys.length; i++) {
            keyArr.push(fragmentDefines[fragmentDefineKeys[i]]);
        }
        var key = keyArr.join('_');

        if (_pool[key]) {
            return _pool[key];
        } else {
            var source = _library[name];
            if (!source) {
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
            for (var name in vertexDefines) {
                shader.define('vertex', name, vertexDefines[name]);
            }
            for (var name in fragmentDefines) {
                shader.define('fragment', name, fragmentDefines[name]);
            }
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
    Shader.import(require('text!./source/skybox.essl'));
    Shader.import(require('text!./source/util.essl'));
    // Shader.import(require('text!3d/shader/source/depth.essl'));

    put("buildin.basic", Shader.source("buildin.basic.vertex"), Shader.source("buildin.basic.fragment"));
    put("buildin.lambert", Shader.source("buildin.lambert.vertex"), Shader.source("buildin.lambert.fragment"));
    put("buildin.phong", Shader.source("buildin.phong.vertex"), Shader.source("buildin.phong.fragment"));
    put("buildin.wireframe", Shader.source("buildin.wireframe.vertex"), Shader.source("buildin.wireframe.fragment"));
    put("buildin.skybox", Shader.source("buildin.skybox.vertex"), Shader.source("buildin.skybox.fragment"));
    // put("buildin.depth", Shader.source("buildin.depth.vertex"), Shader.source("buildin.depth.fragment"));

    return {
        get : get,
        put : put
    }
})