import Node from './Node';
import glenum from './core/glenum';

// Cache
var prevDrawID = 0;
var prevDrawIndicesBuffer = null;
var prevDrawIsUseIndices = true;

var currentDrawID;

var RenderInfo = function() {
    this.triangleCount = 0;
    this.vertexCount = 0;
    this.drawCallCount = 0;
};

function VertexArrayObject(
    availableAttributes,
    availableAttributeSymbols,
    indicesBuffer
) {
    this.availableAttributes = availableAttributes;
    this.availableAttributeSymbols = availableAttributeSymbols;
    this.indicesBuffer = indicesBuffer;

    this.vao = null;
}
/**
 * @constructor
 * @alias qtek.Renderable
 * @extends qtek.Node
 */
var Renderable = Node.extend(
/** @lends qtek.Renderable# */
{
    /**
     * @type {qtek.Material}
     */
    material: null,

    /**
     * @type {qtek.Geometry}
     */
    geometry: null,

    /**
     * @type {number}
     */
    mode: glenum.TRIANGLES,

    _drawCache: null,

    _renderInfo: null
}, function() {
    this._drawCache = {};
    this._renderInfo = new RenderInfo();
},
/** @lends qtek.Renderable.prototype */
{

    /**
     * Render order, Nodes with smaller value renders before nodes with larger values.
     * @type {Number}
     */
    renderOrder: 0,
    /**
     * Used when mode is LINES, LINE_STRIP or LINE_LOOP
     * @type {number}
     */
    lineWidth: 1,

    /**
     * If enable culling
     * @type {boolean}
     */
    culling: true,
    /**
     * Specify which side of polygon will be culled.
     * Possible values:
     *  + {@link qtek.Renderable.BACK}
     *  + {@link qtek.Renderable.FRONT}
     *  + {@link qtek.Renderable.FRONT_AND_BACK}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
     * @type {number}
     */
    cullFace: glenum.BACK,
    /**
     * Specify which side is front face.
     * Possible values:
     *  + {@link qtek.Renderable.CW}
     *  + {@link qtek.Renderable.CCW}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
     * @type {number}
     */
    frontFace: glenum.CCW,

    /**
     * If enable software frustum culling 
     * @type {boolean}
     */
    frustumCulling: true,
    /**
     * @type {boolean}
     */
    receiveShadow: true,
    /**
     * @type {boolean}
     */
    castShadow: true,
    /**
     * @type {boolean}
     */
    ignorePicking: false,
    /**
     * @type {boolean}
     */
    ignorePreZ: false,

    /**
     * @type {boolean}
     */
    ignoreGBuffer: false,
    
    /**
     * @return {boolean}
     */
    isRenderable: function() {
        // TODO Shader ?
        return this.geometry && this.material && !this.invisible
            && this.geometry.vertexCount > 0;
    },

    /**
     * Before render hook
     * @type {Function}
     */
    beforeRender: function (_gl) {},

    /**
     * Before render hook
     * @type {Function}
     */
    afterRender: function (_gl, renderStat) {},

    getBoundingBox: function (filter, out) {
        out = Node.prototype.getBoundingBox.call(this, filter, out);
        if (this.geometry && this.geometry.boundingBox) {
            out.union(this.geometry.boundingBox);
        }

        return out;
    },

    /**
     * @param  {qtek.Renderer} renderer
     * @param  {qtek.Shader} [shader] May use shader of other material if shader code are same
     * @return {Object}
     */
    render: function (renderer, shader) {
        var _gl = renderer.gl;
        // May use shader of other material if shader code are same
        var shader = shader || this.material.shader;
        var geometry = this.geometry;

        var glDrawMode = this.mode;

        var nVertex = geometry.vertexCount;
        var isUseIndices = geometry.isUseIndices();

        var uintExt = renderer.getGLExtension('OES_element_index_uint');
        var useUintExt = uintExt && nVertex > 0xffff;
        var indicesType = useUintExt ? _gl.UNSIGNED_INT : _gl.UNSIGNED_SHORT;

        var vaoExt = renderer.getGLExtension('OES_vertex_array_object');
        // var vaoExt = null;

        var isStatic = !geometry.dynamic;

        var renderInfo = this._renderInfo;
        renderInfo.vertexCount = nVertex;
        renderInfo.triangleCount = 0;
        renderInfo.drawCallCount = 0;
        // Draw each chunk
        var drawHashChanged = false;
        // Hash with shader id in case previous material has less attributes than next material
        currentDrawID = renderer.__GUID__ + '-' + geometry.__GUID__ + '-' + shader.__GUID__;

        if (currentDrawID !== prevDrawID) {
            drawHashChanged = true;
        }
        else {
            // The cache will be invalid in the following cases
            // 1. Geometry is splitted to multiple chunks
            // 2. VAO is enabled and is binded to null after render
            // 3. Geometry needs update
            if (
                ((nVertex > 0xffff && !uintExt) && isUseIndices)
                || (vaoExt && isStatic)
                || geometry._cache.isDirty()
            ) {
                drawHashChanged = true;
            }
        }
        prevDrawID = currentDrawID;

        if (!drawHashChanged) {
            // Direct draw
            if (prevDrawIsUseIndices) {
                _gl.drawElements(glDrawMode, prevDrawIndicesBuffer.count, indicesType, 0);
                renderInfo.triangleCount = prevDrawIndicesBuffer.count / 3;
            }
            else {
                // FIXME Use vertex number in buffer
                // vertexCount may get the wrong value when geometry forget to mark dirty after update
                _gl.drawArrays(glDrawMode, 0, nVertex);
            }
            renderInfo.drawCallCount = 1;
        }
        else {
            // Use the cache of static geometry
            var vaoList = this._drawCache[currentDrawID];
            if (!vaoList) {
                var chunks = geometry.getBufferChunks(renderer);
                if (!chunks) {  // Empty mesh
                    return;
                }
                vaoList = [];
                for (var c = 0; c < chunks.length; c++) {
                    var chunk = chunks[c];
                    var attributeBuffers = chunk.attributeBuffers;
                    var indicesBuffer = chunk.indicesBuffer;

                    var availableAttributes = [];
                    var availableAttributeSymbols = [];
                    for (var a = 0; a < attributeBuffers.length; a++) {
                        var attributeBufferInfo = attributeBuffers[a];
                        var name = attributeBufferInfo.name;
                        var semantic = attributeBufferInfo.semantic;
                        var symbol;
                        if (semantic) {
                            var semanticInfo = shader.attribSemantics[semantic];
                            symbol = semanticInfo && semanticInfo.symbol;
                        }
                        else {
                            symbol = name;
                        }
                        if (symbol && shader.attributeTemplates[symbol]) {
                            availableAttributes.push(attributeBufferInfo);
                            availableAttributeSymbols.push(symbol);
                        }
                    }

                    var vao = new VertexArrayObject(
                        availableAttributes,
                        availableAttributeSymbols,
                        indicesBuffer
                    );
                    vaoList.push(vao);
                }
                if (isStatic) {
                    this._drawCache[currentDrawID] = vaoList;
                }
            }

            for (var i = 0; i < vaoList.length; i++) {
                var vao = vaoList[i];
                var needsBindAttributes = true;

                // Create vertex object array cost a lot
                // So we don't use it on the dynamic object
                if (vaoExt && isStatic) {
                    // Use vertex array object
                    // http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
                    if (vao.vao == null) {
                        vao.vao = vaoExt.createVertexArrayOES();
                    }
                    else {
                        needsBindAttributes = false;
                    }
                    vaoExt.bindVertexArrayOES(vao.vao);
                }

                var availableAttributes = vao.availableAttributes;
                var indicesBuffer = vao.indicesBuffer;

                if (needsBindAttributes) {
                    var locationList = shader.enableAttributes(renderer, vao.availableAttributeSymbols, (vaoExt && isStatic && vao.vao));
                    // Setting attributes;
                    for (var a = 0; a < availableAttributes.length; a++) {
                        var location = locationList[a];
                        if (location === -1) {
                            continue;
                        }
                        var attributeBufferInfo = availableAttributes[a];
                        var buffer = attributeBufferInfo.buffer;
                        var size = attributeBufferInfo.size;
                        var glType;
                        switch (attributeBufferInfo.type) {
                            case 'float':
                                glType = _gl.FLOAT;
                                break;
                            case 'byte':
                                glType = _gl.BYTE;
                                break;
                            case 'ubyte':
                                glType = _gl.UNSIGNED_BYTE;
                                break;
                            case 'short':
                                glType = _gl.SHORT;
                                break;
                            case 'ushort':
                                glType = _gl.UNSIGNED_SHORT;
                                break;
                            default:
                                glType = _gl.FLOAT;
                                break;
                        }

                        _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
                        _gl.vertexAttribPointer(location, size, glType, false, 0, 0);
                    }
                }
                if (
                    glDrawMode == glenum.LINES ||
                    glDrawMode == glenum.LINE_STRIP ||
                    glDrawMode == glenum.LINE_LOOP
                ) {
                    _gl.lineWidth(this.lineWidth);
                }

                prevDrawIndicesBuffer = indicesBuffer;
                prevDrawIsUseIndices = geometry.isUseIndices();
                // Do drawing
                if (prevDrawIsUseIndices) {
                    if (needsBindAttributes) {
                        _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
                    }
                    _gl.drawElements(glDrawMode, indicesBuffer.count, indicesType, 0);
                    renderInfo.triangleCount += indicesBuffer.count / 3;
                } else {
                    _gl.drawArrays(glDrawMode, 0, nVertex);
                }

                if (vaoExt && isStatic) {
                    vaoExt.bindVertexArrayOES(null);
                }

                renderInfo.drawCallCount++;
            }
        }

        return renderInfo;
    },

    /**
     * Clone a new renderable
     * @method
     * @return {qtek.Renderable}
     */
    clone: (function() {
        var properties = [
            'castShadow', 'receiveShadow',
            'mode', 'culling', 'cullFace', 'frontFace',
            'frustumCulling',
            'renderOrder', 'lineWidth',
            'ignorePicking', 'ignorePreZ', 'ignoreGBuffer'
        ];
        return function() {
            var renderable = Node.prototype.clone.call(this);

            renderable.geometry = this.geometry;
            renderable.material = this.material;

            for (var i = 0; i < properties.length; i++) {
                var name = properties[i];
                // Try not to overwrite the prototype property
                if (renderable[name] !== this[name]) {
                    renderable[name] = this[name];
                }
            }

            return renderable;
        };
    })()
});

/**
 * @type {number}
 */
Renderable.POINTS = glenum.POINTS;
/**
 * @type {number}
 */
Renderable.LINES = glenum.LINES;
/**
 * @type {number}
 */
Renderable.LINE_LOOP = glenum.LINE_LOOP;
/**
 * @type {number}
 */
Renderable.LINE_STRIP = glenum.LINE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLES = glenum.TRIANGLES;
/**
 * @type {number}
 */
Renderable.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLE_FAN = glenum.TRIANGLE_FAN;
/**
 * @type {number}
 */
Renderable.BACK = glenum.BACK;
/**
 * @type {number}
 */
Renderable.FRONT = glenum.FRONT;
/**
 * @type {number}
 */
Renderable.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
/**
 * @type {number}
 */
Renderable.CW = glenum.CW;
/**
 * @type {number}
 */
Renderable.CCW = glenum.CCW;

Renderable.RenderInfo = RenderInfo;

export default Renderable;
