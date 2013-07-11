/**
 *
 * @export{object} mesh
 */
define(function(require) {
    
    var Geometry = require("../geometry");
    var Mesh = require("../mesh");
    var glMatrix = require("glmatrix");
    var _ = require("_");
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;

    var ret = {
        /**
         * Merge multiple meshes to one.
         * Note that these meshes must have the same material
         */
        merge : function(meshes, clone) {

            if (! meshes.length) {
                return;
            }
            var clone = typeof(clone) === "undefined" ? true : clone;

            var templateMesh = meshes[0];
            var templateGeo = templateMesh.geometry;
            var material = templateMesh.material;

            if (_.any(meshes, function(mesh) {
                return mesh.material !== material;  
            })) {
                console.warn("Material of meshes to merge is not the same, program will use the material of first mesh by default");
            }

            var geometry = new Geometry,
                faces = geometry.faces;

            for (var name in templateGeo.attributes) {
                var attr = templateGeo.attributes[name];
                // Extend custom attributes
                if (! geometry.attributes[name]) {
                    geometry.attributes[name] = {
                        value : [],
                        type : attr.type
                    }
                }
            }


            var faceOffset = 0,
                useFaces = templateGeo.faces.length !== 0;
                
            for (var k = 0; k < meshes.length; k++) {
                var mesh = meshes[k];  
                var currentGeo = mesh.geometry;

                mesh.updateMatrix();
                var vertexCount = currentGeo.getVerticesNumber();

                for (var name in currentGeo.attributes) {

                    var currentAttr = currentGeo.attributes[name];
                    var targetAttr = geometry.attributes[name];
                    // Skip the unused attributes;
                    if (!currentAttr.value.length) {
                        continue;
                    }
                    for (var i = 0; i < vertexCount; i++) {

                        // Transform position, normal and tangent
                        if (name === "position") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            vec3.transformMat4(newValue, newValue, mesh.matrix._array);
                            targetAttr.value.push(newValue);   
                        }
                        else if (name === "normal") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            targetAttr.value.push(newValue);
                        }
                        else if (name === "tangent") {
                            var newValue = cloneValue(currentAttr.value[i]);
                            targetAttr.value.push(newValue);
                        }else{
                            targetAttr.value.push(cloneValue(currentAttr.value[i]));
                        }

                    }
                }

                if (useFaces) {
                    var len = currentGeo.faces.length;
                    for (i =0; i < len; i++) {
                        var newFace = [];
                        var face = currentGeo.faces[i];
                        newFace[0] = face[0] + faceOffset;
                        newFace[1] = face[1] + faceOffset;
                        newFace[2] = face[2] + faceOffset;

                        faces.push(newFace);
                    }
                }

                faceOffset += vertexCount;
            }

            function cloneValue(val) {
                if (! clone) {
                    return val;
                }
                return val && Array.prototype.slice.call(val);
            }

            return new Mesh({
                material : material,
                geometry : geometry
            });
        }
    }

    return ret;
})