/**
 * @export{Object} library
 */
define(function(require) {

    var Shader = require("../Shader");
    var util = require('../core/util');

    _library = {};

    _pool = {};

    /** 
     * ### Builin shaders
     * + buildin.basic
     * + buildin.lambert
     * + buildin.phong
     * + buildin.physical
     * + buildin.wireframe
     * 
     * @namespace qtek.shader.library
     */
    /**
     *
     * Get shader from library. use shader name and option as hash key.
     * 
     * @param {string} name
     * @param {Object|string|Array.<string>} [option]
     * @return {qtek.Shader}
     * 
     * @memberOf qtek.shader.library
     * @example
     *     qtek.shader.library.get("buildin.phong", "diffuseMap", "normalMap");
     *     qtek.shader.library.get("buildin.phong", ["diffuseMap", "normalMap"]);
     *     qtek.shader.library.get("buildin.phong", {
     *         textures : ["diffuseMap"],
     *         vertexDefines : {},
     *         fragmentDefines : {}
     *     });
     */
    function get(name, option) {
        var enabledTextures = [];
        var vertexDefines = {};
        var fragmentDefines = {};
        if (typeof(option) === "string") {
            enabledTextures = Array.prototype.slice.call(arguments, 1);
        }
        else if (Object.prototype.toString.call(option) == '[object Object]') {
            enabledTextures = option.textures || [];
            vertexDefines = option.vertexDefines || {};
            fragmentDefines = option.fragmentDefines || {};
        } 
        else if(option instanceof Array) {
            enabledTextures = option;
        }
        var vertexDefineKeys = Object.keys(vertexDefines);
        var fragmentDefineKeys = Object.keys(fragmentDefines);
        enabledTextures.sort(); 
        vertexDefineKeys.sort();
        fragmentDefineKeys.sort();

        var keyArr = [name];
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
            });
            for (var i = 0; i < enabledTextures.length; i++) {
                shader.enableTexture(enabledTextures[i]);
            }
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

    /**
     * @memberOf qtek.shader.library
     * @param  {string} name
     * @param  {string} vertex - Vertex shader code
     * @param  {string} fragment - Fragment shader code
     */
    function put(name, vertex, fragment) {
        _library[name] = {
            vertex : vertex,
            fragment : fragment
        }
    }

    // Some build in shaders
    Shader['import'](require('text!./source/basic.essl'));
    Shader['import'](require('text!./source/lambert.essl'));
    Shader['import'](require('text!./source/phong.essl'));
    Shader['import'](require('text!./source/physical.essl'));
    Shader['import'](require('text!./source/wireframe.essl'));
    Shader['import'](require('text!./source/skybox.essl'));
    Shader['import'](require('text!./source/util.essl'));
    Shader['import'](require('text!./source/prez.essl'));

    Shader['import'](require('text!./source/shadowmap.essl'));

    put("buildin.basic", Shader.source("buildin.basic.vertex"), Shader.source("buildin.basic.fragment"));
    put("buildin.lambert", Shader.source("buildin.lambert.vertex"), Shader.source("buildin.lambert.fragment"));
    put("buildin.phong", Shader.source("buildin.phong.vertex"), Shader.source("buildin.phong.fragment"));
    put("buildin.wireframe", Shader.source("buildin.wireframe.vertex"), Shader.source("buildin.wireframe.fragment"));
    put("buildin.skybox", Shader.source("buildin.skybox.vertex"), Shader.source("buildin.skybox.fragment"));
    put("buildin.prez", Shader.source("buildin.prez.vertex"), Shader.source("buildin.prez.fragment"));
    put("buildin.physical", Shader.source("buildin.physical.vertex"), Shader.source("buildin.physical.fragment"));

    // Some build in shaders
    Shader['import'](require('text!./source/compositor/vertex.essl'));
    Shader['import'](require('text!./source/compositor/coloradjust.essl'));
    Shader['import'](require('text!./source/compositor/blur.essl'));
    Shader['import'](require('text!./source/compositor/lum.essl'));
    Shader['import'](require('text!./source/compositor/lut.essl'));
    Shader['import'](require('text!./source/compositor/output.essl'));
    Shader['import'](require('text!./source/compositor/hdr.essl'));
    Shader['import'](require('text!./source/compositor/lensflare.essl'));
    Shader['import'](require('text!./source/compositor/blend.essl'));
    Shader['import'](require('text!./source/compositor/fxaa.essl'));

    return {
        get : get,
        put : put
    }
})