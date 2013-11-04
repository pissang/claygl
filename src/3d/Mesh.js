define(function(require) {

    'use strict';

    var Node = require("./Node");
    var glenum = require("./glenum");
    var Vector3 = require("core/Vector3");
    var _ = require("_");

    // Cache
    var prevDrawID = 0;
    var prevDrawIndicesBuffer = null;
    var prevDrawIsUseFace = true;

    var Mesh = Node.derive(function() {
        return {
            
            material : null,

            geometry : null,

            mode : glenum.TRIANGLES,
            // Only if mode is LINES
            lineWidth : 1,

            // Culling
            culling : true,
            cullFace : glenum.BACK,
            frontFace : glenum.CCW,
            
            receiveShadow : true,
            castShadow : true,

            // Skinned Mesh
            skeleton : null,
            // Joints indices
            // Meshes can share the one skeleton instance
            // and each mesh can use one part of joints
            // Joints indeces indicate the index of joint in the skeleton instance
            joints : []
        }
    }, {

        render : function(_gl, globalMaterial, silence) {
            var material = globalMaterial || this.material;
            var shader = material.shader;
            var geometry = this.geometry;

            var glDrawMode = this.mode;
            
            // Set pose matrices of skinned mesh
            if (this.skeleton) {
                var invMatricesArray = this.skeleton.getSubInvBindMatrices(this.__GUID__, this.joints);
                shader.setUniformBySemantic(_gl, "INV_BIND_MATRIX", invMatricesArray);
            }

            var vertexNumber = geometry.getVerticesNumber();
            var faceNumber = 0;
            var drawCallNumber = 0;
            // Draw each chunk
            var needsBindAttributes = false;
            if (vertexNumber > geometry.chunkSize) {
                needsBindAttributes = true;
            } else {
                var currentDrawID = _gl.__GUID__ + "_" + geometry.__GUID__;
                if (currentDrawID !== prevDrawID) {
                    needsBindAttributes = true;
                    prevDrawID = currentDrawID;
                }
            }
            if (!needsBindAttributes) {
                // Direct draw
                if (prevDrawIsUseFace) {
                    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, prevDrawIndicesBuffer.buffer);
                    _gl.drawElements(glDrawMode, prevDrawIndicesBuffer.count, _gl.UNSIGNED_SHORT, 0);
                    faceNumber = prevDrawIndicesBuffer.count;
                }
                else {
                    _gl.drawArrays(glDrawMode, 0, vertexNumber);
                }
                drawCallNumber = 1;
            } else {
                var chunks = geometry.getBufferChunks(_gl);
                for (var c = 0; c < chunks.length; c++) {

                    var chunk = chunks[c];
                    var attributeBuffers = chunk.attributeBuffers;
                    var indicesBuffer = chunk.indicesBuffer;

                    var availableAttributes = {};
                    for (var name in attributeBuffers) {
                        var attributeBufferInfo = attributeBuffers[name];
                        var semantic = attributeBufferInfo.semantic;

                        if (semantic) {
                            var semanticInfo = shader.attribSemantics[semantic];
                            var symbol = semanticInfo && semanticInfo.symbol;
                        } else {
                            var symbol = name;
                        }
                        if (symbol && shader.attributeTemplates[symbol]) {
                            availableAttributes[symbol] = attributeBufferInfo;
                        }
                    }
                    shader.enableAttributes(_gl, Object.keys(availableAttributes));
                    // Setting attributes;
                    for (var symbol in availableAttributes) {
                        var attributeBufferInfo = availableAttributes[symbol];
                        var buffer = attributeBufferInfo.buffer;

                        _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                        shader.setMeshAttribute(_gl, symbol, attributeBufferInfo.type, attributeBufferInfo.size);
                    }
                }
                if (glDrawMode === glenum.LINES) {
                    _gl.lineWidth(this.lineWidth);
                }
                prevDrawIsUseFace = geometry.isUseFace();
                prevDrawIndicesBuffer = indicesBuffer;
                //Do drawing
                if (prevDrawIsUseFace) {
                    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                    _gl.drawElements(glDrawMode, indicesBuffer.count, _gl.UNSIGNED_SHORT, 0);
                    faceNumber += indicesBuffer.count;
                } else {
                    _gl.drawArrays(glDrawMode, 0, vertexNumber);
                }
                drawCallNumber++;
            }

            var drawInfo = {
                faceNumber : faceNumber,
                vertexNumber : vertexNumber,
                drawCallNumber : drawCallNumber
            };
            return drawInfo;
        }
    });

    // Called when material is changed
    // In case the material changed and geometry not changed
    // And the previous material has less attributes than next material
    Mesh.materialChanged = function() {
        prevDrawID = 0;
    }

    // Enums
    Mesh.POINTS = glenum.POINTS;
    Mesh.LINES = glenum.LINES;
    Mesh.LINE_LOOP = glenum.LINE_LOOP;
    Mesh.LINE_STRIP = glenum.LINE_STRIP;
    Mesh.TRIANGLES = glenum.TRIANGLES;
    Mesh.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
    Mesh.TRIANGLE_FAN = glenum.TRIANGLE_FAN;

    Mesh.BACK = glenum.BACK;
    Mesh.FRONT = glenum.FRONT;
    Mesh.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
    Mesh.CW = glenum.CW;
    Mesh.CCW = glenum.CCW;

    return Mesh;
})