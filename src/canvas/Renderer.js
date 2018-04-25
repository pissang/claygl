import Base from '../core/Base';
import vec3 from '../glmatrix/vec3';
import mat4 from '../glmatrix/mat4';
import vec4 from '../glmatrix/vec4';

import glenum from '../core/glenum';

var vec4Create = vec4.create;

var round = Math.round;

var PRIMITIVE_TRIANGLE = 1;
var PRIMITIVE_LINE = 2;
var PRIMITIVE_POINT = 3;

function PrimitivePool(constructor) {
    this.ctor = constructor;

    this._data = [];

    this._size = 0;
}

PrimitivePool.prototype = {
    pick: function () {
        var data = this._data;
        var size = this._size;
        var obj = data[size];
        if (! obj) {
            // Constructor must have no parameters
            obj = new this.ctor();
            data[size] = obj;
        }
        this._size++;
        return obj;
    },

    reset: function () {
        this._size = 0;
    },

    shrink: function () {
        this._data.length = this._size;
    },

    clear: function () {
        this._data = [];
        this._size = 0;
    }
};

function Triangle() {
    this.vertices = [vec4Create(), vec4Create(), vec4Create()];
    this.color = vec4Create();

    this.depth = 0;
}

Triangle.prototype.type = PRIMITIVE_TRIANGLE;

function Point() {
    // Here use an array to make it more convinient to proccessing in _setPrimitive method
    this.vertices = [vec4Create()];

    this.color = vec4Create();

    this.depth = 0;
}

Point.prototype.type = PRIMITIVE_POINT;

function Line() {
    this.vertices = [vec4Create(), vec4Create()];
    this.color = vec4Create();

    this.depth = 0;

    this.lineWidth = 1;
}

Line.prototype.type = PRIMITIVE_LINE;

function depthSortFunc(x, y) {
    // Sort from far to near, which in depth of projection space is from larger to smaller
    return y.depth - x.depth;
}

function vec3ToColorStr(v3) {
    return 'rgb(' + round(v3[0] * 255) + ',' + round(v3[1] * 255) + ',' + round(v3[2] * 255) + ')';
}

function vec4ToColorStr(v4) {
    return 'rgba(' + round(v4[0] * 255) + ',' + round(v4[1] * 255) + ',' + round(v4[2] * 255) + ',' + v4[3] + ')';
}

var CanvasRenderer = Base.extend({

    canvas: null,

    _width: 100,

    _height: 100,

    devicePixelRatio: (typeof window !== 'undefined' && window.devicePixelRatio) || 1.0,

    color: [0.0, 0.0, 0.0, 0.0],

    clear: true,

    ctx: null,

    // Cached primitive list, including triangle, line, point
    _primitives: [],

    // Triangle pool
    _triangles: new PrimitivePool(Triangle),

    // Line pool
    _lines: new PrimitivePool(Line),

    // Point pool
    _points: new PrimitivePool(Point)
}, function () {
    if (! this.canvas) {
        this.canvas = document.createElement('canvas');
    }
    var canvas = this.canvas;

    try {
        this.ctx = canvas.getContext('2d');
        var ctx = this.ctx;
        if (!ctx) {
            throw new Error();
        }
    }
    catch (e) {
        throw 'Error creating WebGL Context ' + e;
    }

    this.resize();
}, {

    resize: function (width, height) {
        var dpr = this.devicePixelRatio;
        var canvas = this.canvas;
        if (width != null) {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            this._width = width;
            this._height = height;
        }
        else {
            this._width = canvas.width / dpr;
            this._height = canvas.height / dpr;
        }
    },

    getWidth: function () {
        return this._width;
    },

    getHeight: function () {
        return this._height;
    },

    getViewportAspect: function () {
        return this._width / this._height;
    },

    render: function (scene, camera) {

        if (this.clear) {
            var color = this.color;
            var ctx = this.ctx;
            var dpr = this.devicePixelRatio;
            var w = this._width * dpr;
            var h = this._height * dpr;
            if (color && color[3] === 0) {
                ctx.clearRect(0, 0, w, h);
            }
            else {
                // Has transparency
                if (color[3] < 1) {
                    ctx.clearRect(0, 0, w, h);
                }
                ctx.fillStyle = color.length === 4 ? vec4ToColorStr(color) : vec3ToColorStr(color);
                ctx.fillRect(0, 0, w, h);
            }
        }

        scene.update();
        camera.update();

        var opaqueList = scene.opaqueList;
        var transparentList = scene.transparentList;
        var sceneMaterial = scene.material;

        var list = opaqueList.concat(transparentList);

        this.renderPass(list, camera);
    },

    renderPass: function (list, camera) {
        var viewProj = mat4.create();
        mat4.multiply(viewProj, camera.projectionMatrix.array, camera.viewMatrix.array);
        var worldViewProjMat = mat4.create();
        var posViewSpace = vec3.create();

        var primitives = this._primitives;
        var trianglesPool = this._triangles;
        var linesPool = this._lines;
        var pointsPool = this._points;

        trianglesPool.reset();
        linesPool.reset();
        pointsPool.reset();

        var nPrimitive = 0;

        var indices = [0, 0, 0];
        var matColor = [];
        for (var i = 0; i < list.length; i++) {
            var renderable = list[i];

            mat4.multiply(worldViewProjMat, viewProj, renderable.worldTransform.array);

            var geometry = renderable.geometry;
            var material = renderable.material;
            var attributes = geometry.attributes;

            // alpha is default 1
            if (material.color.length == 3) {
                vec3.copy(matColor, material.color);
                matColor[3] = 1;
            }
            else {
                vec4.copy(matColor, material.color);
            }

            var nVertex = geometry.vertexCount;
            // Only support TRIANGLES, LINES, POINTS draw modes
            switch (renderable.mode) {
                case glenum.TRIANGLES:
                    if (geometry.isUseIndices()) {
                        var nFace = geometry.triangleCount;
                        for (var j = 0; j < nFace; j++) {
                            geometry.getFace(j, indices);

                            var triangle = trianglesPool.pick();
                            triangle.material = material;

                            var clipped = this._setPrimitive(triangle, indices, 3, attributes, worldViewProjMat, matColor);

                            if (! clipped) {
                                primitives[nPrimitive++] = triangle;
                            }
                        }
                    }
                    else {
                        for (var j = 0; j < nVertex;) {
                            indices[0] = j++;
                            indices[1] = j++;
                            indices[2] = j++;

                            var triangle = trianglesPool.pick();
                            triangle.material = material;

                            var clipped = this._setPrimitive(triangle, indices, 3, attributes, worldViewProjMat, matColor);

                            if (! clipped) {
                                primitives[nPrimitive++] = triangle;
                            }
                        }
                    }
                    break;
                case glenum.LINES:
                    // LINES mode can't use face
                    for (var j = 0; j < nVertex;) {
                        indices[0] = j++;
                        indices[1] = j++;
                        var line = linesPool.pick();
                        line.material = material;
                        line.lineWidth = renderable.lineWidth;

                        var clipped = this._setPrimitive(line, indices, 2, attributes, worldViewProjMat, matColor);

                        if (! clipped) {
                            primitives[nPrimitive++] = line;
                        }
                    }
                    break;
                case glenum.POINTS:
                    for (var j = 0; j < nVertex; j++) {
                        indices[0] = j;
                        var point = pointsPool.pick();
                        point.material = material;

                        var clipped = this._setPrimitive(point, indices, 1, attributes, worldViewProjMat, matColor);

                        if (! clipped) {
                            primitives[nPrimitive++] = point;
                        }
                    }
                    // POINTS mode can't use face
                    break;
            }
        }

        trianglesPool.shrink();
        linesPool.shrink();
        pointsPool.shrink();

        primitives.length = nPrimitive;

        primitives.sort(depthSortFunc);
        this._drawPrimitives(primitives);
    },

    _setPrimitive: (function () {
        var vertexColor = vec4Create();
        return function (primitive, indices, size, attributes, worldViewProjMat, matColor) {
            var colorAttrib = attributes.color;
            var useVertexColor = colorAttrib.value && colorAttrib.value.length > 0;
            var priColor = primitive.color;

            primitive.depth = 0;
            if (useVertexColor) {
                vec4.set(priColor, 0, 0, 0, 0);
            }

            var clipped = true;

            var percent = 1 / size;
            for (var i = 0; i < size; i++) {
                var coord = primitive.vertices[i];
                attributes.position.get(indices[i], coord);
                coord[3] = 1;
                vec4.transformMat4(coord, coord, worldViewProjMat);
                if (useVertexColor) {
                    colorAttrib.get(indices[i], vertexColor);
                    // Average vertex color
                    // Each primitive only call fill or stroke once
                    // So color must be the same
                    vec4.scaleAndAdd(priColor, priColor, vertexColor, percent);
                }

                // Clipping
                var x = coord[0];
                var y = coord[1];
                var z = coord[2];
                var w = coord[3];

                // TODO Point clipping
                if (x > -w && x < w && y > -w && y < w && z > -w && z < w) {
                    clipped = false;
                }

                var invW = 1 / w;
                coord[0] = x * invW;
                coord[1] = y * invW;
                coord[2] = z * invW;
                // Use primitive average depth;
                primitive.depth += coord[2];
            }

            if (! clipped) {
                primitive.depth /= size;

                if (useVertexColor) {
                    vec4.mul(priColor, priColor, matColor);
                }
                else {
                    vec4.copy(priColor, matColor);
                }
            }

            return clipped;
        }
    })(),

    _drawPrimitives: function (primitives) {
        var ctx = this.ctx;
        ctx.save();

        var prevMaterial;

        var dpr = this.devicePixelRatio;
        var width = this._width * dpr;
        var height = this._height * dpr;
        var halfWidth = width / 2;
        var halfHeight = height / 2;

        var prevLineWidth;
        var prevStrokeColor;

        for (var i = 0; i < primitives.length; i++) {
            var primitive = primitives[i];
            var vertices = primitive.vertices;

            var primitiveType = primitive.type;
            var material = primitive.material;
            if (material !== prevMaterial) {
                // Set material
                ctx.globalAlpha = material.opacity;
                prevMaterial = material;
            }

            var colorStr = vec4ToColorStr(primitive.color);
            switch (primitiveType) {
                case PRIMITIVE_TRIANGLE:
                    var v0 = vertices[0];
                    var v1 = vertices[1];
                    var v2 = vertices[2];
                    ctx.fillStyle = colorStr;
                    ctx.beginPath();
                    ctx.moveTo((v0[0] + 1) * halfWidth, (-v0[1] + 1) * halfHeight);
                    ctx.lineTo((v1[0] + 1) * halfWidth, (-v1[1] + 1) * halfHeight);
                    ctx.lineTo((v2[0] + 1) * halfWidth, (-v2[1] + 1) * halfHeight);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case PRIMITIVE_LINE:
                    var v0 = vertices[0];
                    var v1 = vertices[1];
                    var lineWidth = primitive.lineWidth;
                    if (prevStrokeColor !== colorStr) {
                        prevStrokeColor = ctx.strokeStyle = colorStr;
                    }
                    if (lineWidth !== prevLineWidth) {
                        ctx.lineWidth = prevLineWidth = lineWidth;
                    }
                    ctx.beginPath();
                    ctx.moveTo((v0[0] + 1) * halfWidth, (-v0[1] + 1) * halfHeight);
                    ctx.lineTo((v1[0] + 1) * halfWidth, (-v1[1] + 1) * halfHeight);
                    ctx.stroke();
                    break;
                case PRIMITIVE_POINT:
                    var pointSize = material.pointSize;
                    var pointShape = material.pointShape;
                    var halfSize = pointSize / 2;
                    if (pointSize > 0) {
                        var v0 = vertices[0];
                        var cx = (v0[0] + 1) * halfWidth;
                        var cy = (-v0[1] + 1) * halfHeight;

                        ctx.fillStyle = colorStr;
                        if (pointShape === 'rectangle') {
                            ctx.fillRect(cx - halfSize, cy - halfSize, pointSize, pointSize);
                        }
                        else if (pointShape === 'circle') {
                            ctx.beginPath();
                            ctx.arc(cx, cy, halfSize, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    break;
            }
        }

        ctx.restore();
    },

    dispose: function () {
        this._triangles.clear();
        this._lines.clear();
        this._points.clear();
        this._primitives = [];

        this.ctx = null;
        this.canvas = null;
    }
});

export default CanvasRenderer;
