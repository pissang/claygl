import vendor from './core/vendor';
import vec3 from './glmatrix/vec3';
import mat4 from './glmatrix/mat4';
import BoundingBox from './math/BoundingBox';
import GeometryBase from './GeometryBase';

var vec3Create = vec3.create;
var vec3Add = vec3.add;
var vec3Set = vec3.set;

var Attribute = GeometryBase.Attribute;

/**
 * Geometry in ClayGL contains vertex attributes of mesh. These vertex attributes will be finally provided to the {@link clay.Shader}.
 * Different {@link clay.Shader} needs different attributes. Here is a list of attributes used in the builtin shaders.
 *
 * + position: `clay.basic`, `clay.lambert`, `clay.standard`
 * + texcoord0: `clay.basic`, `clay.lambert`, `clay.standard`
 * + color: `clay.basic`, `clay.lambert`, `clay.standard`
 * + weight: `clay.basic`, `clay.lambert`, `clay.standard`
 * + joint: `clay.basic`, `clay.lambert`, `clay.standard`
 * + normal: `clay.lambert`, `clay.standard`
 * + tangent: `clay.standard`
 *
 * #### Create a procedural geometry
 *
 * ClayGL provides a couple of builtin procedural geometries. Inlcuding:
 *
 *  + {@link clay.geometry.Cube}
 *  + {@link clay.geometry.Sphere}
 *  + {@link clay.geometry.Plane}
 *  + {@link clay.geometry.Cylinder}
 *  + {@link clay.geometry.Cone}
 *  + {@link clay.geometry.ParametricSurface}
 *
 * It's simple to create a basic geometry with these classes.
 *
```js
var sphere = new clay.geometry.Sphere({
    radius: 2
});
```
 *
 * #### Create the geometry data by yourself
 *
 * Usually the vertex attributes data are created by the {@link clay.loader.GLTF} or procedural geometries like {@link clay.geometry.Sphere}.
 * Besides these, you can create the data manually. Here is a simple example to create a triangle.
```js
var TRIANGLE_POSITIONS = [
    [-0.5, -0.5, 0],
    [0.5, -0.5, 0],
    [0, 0.5, 0]
];
var geometry = new clay.StaticGeometryBase();
// Add triangle vertices to position attribute.
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);
```
 * Then you can use the utility methods like `generateVertexNormals`, `generateTangents` to create the remaining necessary attributes.
 *
 *
 * #### Use with custom shaders
 *
 * If you wan't to write custom shaders. Don't forget to add SEMANTICS to these attributes. For example
 *
 ```glsl
uniform mat4 worldViewProjection : WORLDVIEWPROJECTION;
uniform mat4 worldInverseTranspose : WORLDINVERSETRANSPOSE;
uniform mat4 world : WORLD;

attribute vec3 position : POSITION;
attribute vec2 texcoord : TEXCOORD_0;
attribute vec3 normal : NORMAL;
```
 * These `POSITION`, `TEXCOORD_0`, `NORMAL` are SEMANTICS which will map the attributes in shader to the attributes in the GeometryBase
 *
 * Available attributes SEMANTICS includes `POSITION`, `TEXCOORD_0`, `TEXCOORD_1` `NORMAL`, `TANGENT`, `COLOR`, `WEIGHT`, `JOINT`.
 *
 *
 * @constructor clay.Geometry
 * @extends clay.GeometryBase
 */
var Geometry = GeometryBase.extend(function () {
    return /** @lends clay.Geometry# */ {
        /**
         * Attributes of geometry. Including:
         *  + `position`
         *  + `texcoord0`
         *  + `texcoord1`
         *  + `normal`
         *  + `tangent`
         *  + `color`
         *  + `weight`
         *  + `joint`
         *  + `barycentric`
         *
         * @type {Object.<string, clay.Geometry.Attribute>}
         */
        attributes: {
            position: new Attribute('position', 'float', 3, 'POSITION'),
            texcoord0: new Attribute('texcoord0', 'float', 2, 'TEXCOORD_0'),
            texcoord1: new Attribute('texcoord1', 'float', 2, 'TEXCOORD_1'),
            normal: new Attribute('normal', 'float', 3, 'NORMAL'),
            tangent: new Attribute('tangent', 'float', 4, 'TANGENT'),
            color: new Attribute('color', 'float', 4, 'COLOR'),
            // Skinning attributes
            // Each vertex can be bind to 4 bones, because the
            // sum of weights is 1, so the weights is stored in vec3 and the last
            // can be calculated by 1-w.x-w.y-w.z
            weight: new Attribute('weight', 'float', 3, 'WEIGHT'),
            joint: new Attribute('joint', 'float', 4, 'JOINT'),
            // For wireframe display
            // http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
            barycentric: new Attribute('barycentric', 'float', 3, null),
        },
        /**
         * Calculated bounding box of geometry.
         * @type {clay.BoundingBox}
         */
        boundingBox: null
    };
},
/** @lends clay.Geometry.prototype */
{

    mainAttribute: 'position',

    /**
     * Update boundingBox of Geometry
     */
    updateBoundingBox: function () {
        var bbox = this.boundingBox;
        if (!bbox) {
            bbox = this.boundingBox = new BoundingBox();
        }
        var posArr = this.attributes.position.value;
        if (posArr && posArr.length) {
            var min = bbox.min;
            var max = bbox.max;
            var minArr = min.array;
            var maxArr = max.array;
            vec3.set(minArr, posArr[0], posArr[1], posArr[2]);
            vec3.set(maxArr, posArr[0], posArr[1], posArr[2]);
            for (var i = 3; i < posArr.length;) {
                var x = posArr[i++];
                var y = posArr[i++];
                var z = posArr[i++];
                if (x < minArr[0]) { minArr[0] = x; }
                if (y < minArr[1]) { minArr[1] = y; }
                if (z < minArr[2]) { minArr[2] = z; }

                if (x > maxArr[0]) { maxArr[0] = x; }
                if (y > maxArr[1]) { maxArr[1] = y; }
                if (z > maxArr[2]) { maxArr[2] = z; }
            }
            min._dirty = true;
            max._dirty = true;
        }
    },

    /**
     * Generate normals per vertex.
     */
    generateVertexNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        if (!normals || normals.length !== positions.length) {
            normals = attributes.normal.value = new vendor.Float32Array(positions.length);
        }
        else {
            // Reset
            for (var i = 0; i < normals.length; i++) {
                normals[i] = 0;
            }
        }

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();

        var n = vec3Create();

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3.sub(v21, p1, p2);
            vec3.sub(v32, p2, p3);
            vec3.cross(n, v21, v32);
            // Already be weighted by the triangle area
            for (var i = 0; i < 3; i++) {
                normals[i1*3+i] = normals[i1*3+i] + n[i];
                normals[i2*3+i] = normals[i2*3+i] + n[i];
                normals[i3*3+i] = normals[i3*3+i] + n[i];
            }
        }

        for (var i = 0; i < normals.length;) {
            vec3Set(n, normals[i], normals[i+1], normals[i+2]);
            vec3.normalize(n, n);
            normals[i++] = n[0];
            normals[i++] = n[1];
            normals[i++] = n[2];
        }
        this.dirty();
    },

    /**
     * Generate normals per face.
     */
    generateFaceNormals: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var indices = this.indices;
        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;

        var p1 = vec3Create();
        var p2 = vec3Create();
        var p3 = vec3Create();

        var v21 = vec3Create();
        var v32 = vec3Create();
        var n = vec3Create();

        if (!normals) {
            normals = attributes.normal.value = new Float32Array(positions.length);
        }
        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var f = 0; f < len;) {
            if (indices) {
                i1 = indices[f++];
                i2 = indices[f++];
                i3 = indices[f++];
            }
            else {
                i1 = f++;
                i2 = f++;
                i3 = f++;
            }

            vec3Set(p1, positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            vec3Set(p2, positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
            vec3Set(p3, positions[i3*3], positions[i3*3+1], positions[i3*3+2]);

            vec3.sub(v21, p1, p2);
            vec3.sub(v32, p2, p3);
            vec3.cross(n, v21, v32);

            vec3.normalize(n, n);

            for (var i = 0; i < 3; i++) {
                normals[i1*3 + i] = n[i];
                normals[i2*3 + i] = n[i];
                normals[i3*3 + i] = n[i];
            }
        }
        this.dirty();
    },

    /**
     * Generate tangents attributes.
     */
    generateTangents: function () {
        if (!this.vertexCount) {
            return;
        }

        var nVertex = this.vertexCount;
        var attributes = this.attributes;
        if (!attributes.tangent.value) {
            attributes.tangent.value = new Float32Array(nVertex * 4);
        }
        var texcoords = attributes.texcoord0.value;
        var positions = attributes.position.value;
        var tangents = attributes.tangent.value;
        var normals = attributes.normal.value;

        if (!texcoords) {
            console.warn('Geometry without texcoords can\'t generate tangents.');
            return;
        }

        var tan1 = [];
        var tan2 = [];
        for (var i = 0; i < nVertex; i++) {
            tan1[i] = [0.0, 0.0, 0.0];
            tan2[i] = [0.0, 0.0, 0.0];
        }

        var sdir = [0.0, 0.0, 0.0];
        var tdir = [0.0, 0.0, 0.0];
        var indices = this.indices;

        var len = indices ? indices.length : this.vertexCount;
        var i1, i2, i3;
        for (var i = 0; i < len;) {
            if (indices) {
                i1 = indices[i++];
                i2 = indices[i++];
                i3 = indices[i++];
            }
            else {
                i1 = i++;
                i2 = i++;
                i3 = i++;
            }

            var st1s = texcoords[i1 * 2],
                st2s = texcoords[i2 * 2],
                st3s = texcoords[i3 * 2],
                st1t = texcoords[i1 * 2 + 1],
                st2t = texcoords[i2 * 2 + 1],
                st3t = texcoords[i3 * 2 + 1],

                p1x = positions[i1 * 3],
                p2x = positions[i2 * 3],
                p3x = positions[i3 * 3],
                p1y = positions[i1 * 3 + 1],
                p2y = positions[i2 * 3 + 1],
                p3y = positions[i3 * 3 + 1],
                p1z = positions[i1 * 3 + 2],
                p2z = positions[i2 * 3 + 2],
                p3z = positions[i3 * 3 + 2];

            var x1 = p2x - p1x,
                x2 = p3x - p1x,
                y1 = p2y - p1y,
                y2 = p3y - p1y,
                z1 = p2z - p1z,
                z2 = p3z - p1z;

            var s1 = st2s - st1s,
                s2 = st3s - st1s,
                t1 = st2t - st1t,
                t2 = st3t - st1t;

            var r = 1.0 / (s1 * t2 - t1 * s2);
            sdir[0] = (t2 * x1 - t1 * x2) * r;
            sdir[1] = (t2 * y1 - t1 * y2) * r;
            sdir[2] = (t2 * z1 - t1 * z2) * r;

            tdir[0] = (s1 * x2 - s2 * x1) * r;
            tdir[1] = (s1 * y2 - s2 * y1) * r;
            tdir[2] = (s1 * z2 - s2 * z1) * r;

            vec3Add(tan1[i1], tan1[i1], sdir);
            vec3Add(tan1[i2], tan1[i2], sdir);
            vec3Add(tan1[i3], tan1[i3], sdir);
            vec3Add(tan2[i1], tan2[i1], tdir);
            vec3Add(tan2[i2], tan2[i2], tdir);
            vec3Add(tan2[i3], tan2[i3], tdir);
        }
        var tmp = vec3Create();
        var nCrossT = vec3Create();
        var n = vec3Create();
        for (var i = 0; i < nVertex; i++) {
            n[0] = normals[i * 3];
            n[1] = normals[i * 3 + 1];
            n[2] = normals[i * 3 + 2];
            var t = tan1[i];

            // Gram-Schmidt orthogonalize
            vec3.scale(tmp, n, vec3.dot(n, t));
            vec3.sub(tmp, t, tmp);
            vec3.normalize(tmp, tmp);
            // Calculate handedness.
            vec3.cross(nCrossT, n, t);
            tangents[i * 4] = tmp[0];
            tangents[i * 4 + 1] = tmp[1];
            tangents[i * 4 + 2] = tmp[2];
            // PENDING can config ?
            tangents[i * 4 + 3] = vec3.dot(nCrossT, tan2[i]) < 0.0 ? -1.0 : 1.0;
        }
        this.dirty();
    },

    /**
     * If vertices are not shared by different indices.
     */
    isUniqueVertex: function () {
        if (this.isUseIndices()) {
            return this.vertexCount === this.indices.length;
        }
        else {
            return true;
        }
    },
    /**
     * Create a unique vertex for each index.
     */
    generateUniqueVertex: function () {
        if (!this.vertexCount || !this.indices) {
            return;
        }

        if (this.indices.length > 0xffff) {
            this.indices = new vendor.Uint32Array(this.indices);
        }

        var attributes = this.attributes;
        var indices = this.indices;

        var attributeNameList = this.getEnabledAttributes();

        var oldAttrValues = {};
        for (var a = 0; a < attributeNameList.length; a++) {
            var name = attributeNameList[a];
            oldAttrValues[name] = attributes[name].value;
            attributes[name].init(this.indices.length);
        }

        var cursor = 0;
        for (var i = 0; i < indices.length; i++) {
            var ii = indices[i];
            for (var a = 0; a < attributeNameList.length; a++) {
                var name = attributeNameList[a];
                var array = attributes[name].value;
                var size = attributes[name].size;

                for (var k = 0; k < size; k++) {
                    array[cursor * size + k] = oldAttrValues[name][ii * size + k];
                }
            }
            indices[i] = cursor;
            cursor++;
        }

        this.dirty();
    },

    /**
     * Generate barycentric coordinates for wireframe draw.
     */
    generateBarycentric: function () {
        if (!this.vertexCount) {
            return;
        }

        if (!this.isUniqueVertex()) {
            this.generateUniqueVertex();
        }

        var attributes = this.attributes;
        var array = attributes.barycentric.value;
        var indices = this.indices;
        // Already existed;
        if (array && array.length === indices.length * 3) {
            return;
        }
        array = attributes.barycentric.value = new Float32Array(indices.length * 3);

        for (var i = 0; i < (indices ? indices.length : this.vertexCount / 3);) {
            for (var j = 0; j < 3; j++) {
                var ii = indices ? indices[i++] : (i * 3 + j);
                array[ii * 3 + j] = 1;
            }
        }
        this.dirty();
    },

    /**
     * Apply transform to geometry attributes.
     * @param {clay.Matrix4} matrix
     */
    applyTransform: function (matrix) {

        var attributes = this.attributes;
        var positions = attributes.position.value;
        var normals = attributes.normal.value;
        var tangents = attributes.tangent.value;

        matrix = matrix.array;
        // Normal Matrix
        var inverseTransposeMatrix = mat4.create();
        mat4.invert(inverseTransposeMatrix, matrix);
        mat4.transpose(inverseTransposeMatrix, inverseTransposeMatrix);

        var vec3TransformMat4 = vec3.transformMat4;
        var vec3ForEach = vec3.forEach;
        vec3ForEach(positions, 3, 0, null, vec3TransformMat4, matrix);
        if (normals) {
            vec3ForEach(normals, 3, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }
        if (tangents) {
            vec3ForEach(tangents, 4, 0, null, vec3TransformMat4, inverseTransposeMatrix);
        }

        if (this.boundingBox) {
            this.updateBoundingBox();
        }
    },
    /**
     * Dispose geometry data in GL context.
     * @param {clay.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__uid__);
        var chunks = cache.get('chunks');
        if (chunks) {
            for (var c = 0; c < chunks.length; c++) {
                var chunk = chunks[c];

                for (var k = 0; k < chunk.attributeBuffers.length; k++) {
                    var attribs = chunk.attributeBuffers[k];
                    renderer.gl.deleteBuffer(attribs.buffer);
                }

                if (chunk.indicesBuffer) {
                    renderer.gl.deleteBuffer(chunk.indicesBuffer.buffer);
                }
            }
        }
        if (this.__vaoCache) {
            var vaoExt = renderer.getGLExtension('OES_vertex_array_object');
            for (var id in this.__vaoCache) {
                var vao = this.__vaoCache[id].vao;
                if (vao) {
                    vaoExt.deleteVertexArrayOES(vao);
                }
            }
        }
        this.__vaoCache = {};
        cache.deleteContext(renderer.__uid__);
    }

});

Geometry.STATIC_DRAW = GeometryBase.STATIC_DRAW;
Geometry.DYNAMIC_DRAW = GeometryBase.DYNAMIC_DRAW;
Geometry.STREAM_DRAW = GeometryBase.STREAM_DRAW;

Geometry.AttributeBuffer = GeometryBase.AttributeBuffer;
Geometry.IndicesBuffer = GeometryBase.IndicesBuffer;

Geometry.Attribute = Attribute;

export default Geometry;
