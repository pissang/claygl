/**
 * glTF Loader
 * Specification : https://github.com/KhronosGroup/glTF/blob/master/specification/README.md
 * @export{class} GLTF
 */
define(function(require) {

    var Base = require('core/base');

    var request = require("core/request");
    var Shader = require("3d/shader");
    var Material = require("3d/material");
    var Geometry = require("3d/geometry");
    var Mesh = require("3d/mesh");
    var Node = require("3d/node");
    var Texture2D = require("3d/texture/texture2d");
    var TextureCube = require("3d/texture/texturecube");
    var shaderLibrary = require("3d/shader/library");
    var Skeleton = require("3d/skeleton");
    var Bone = require("3d/bone");
    var Vector3 = require("core/vector3");
    var Quaternion = require("core/quaternion");
    var _ = require("_");

    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;

    var Loader = Base.derive(function() {
        return {

        };
    }, {
        
    })
});