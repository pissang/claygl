/**
 * @export{Object} library
 */
define(function(require) {

    var Shader = require('../Shader');
    var util = require('../core/util');

    var _library = {};

    /**
     * @export qtek.shader.library~Libaray
     */
    function ShaderLibrary () {
        this._pool = {};
    }

    /** 
     * ### Builin shaders
     * + buildin.standard
     * + buildin.basic
     * + buildin.lambert
     * + buildin.phong
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
     * @example
     *     qtek.shader.library.get('buildin.phong', 'diffuseMap', 'normalMap');
     *     qtek.shader.library.get('buildin.phong', ['diffuseMap', 'normalMap']);
     *     qtek.shader.library.get('buildin.phong', {
     *         textures: ['diffuseMap'],
     *         vertexDefines: {},
     *         fragmentDefines: {}
     */
    ShaderLibrary.prototype.get = function(name, option) {
        var enabledTextures = [];
        var vertexDefines = {};
        var fragmentDefines = {};
        if (typeof(option) === 'string') {
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

        if (this._pool[key]) {
            return this._pool[key];
        } else {
            var source = _library[name];
            if (!source) {
                console.error('Shader "' + name + '"' + ' is not in the library');
                return;
            }
            var shader = new Shader({
                'vertex': source.vertex,
                'fragment': source.fragment
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
            this._pool[key] = shader;
            return shader;
        }
    };

    /**
     * Clear shaders
     */
    ShaderLibrary.prototype.clear = function() {
        this._pool = {};
    };

    /**
     * @memberOf qtek.shader.library
     * @param  {string} name
     * @param  {string} vertex - Vertex shader code
     * @param  {string} fragment - Fragment shader code
     */
    function template(name, vertex, fragment) {
        _library[name] = {
            vertex: vertex,
            fragment: fragment
        };
    }

    var defaultLibrary = new ShaderLibrary();

    return {
        createLibrary: function () {
            return new ShaderLibrary();
        },
        get: function () {
            return defaultLibrary.get.apply(defaultLibrary, arguments);
        },
        template: template,
        clear: function () {
            return defaultLibrary.clear();
        }
    };
});