// TODO Shader library
import Pass from './Pass';
import Node from './Node';

// TODO curlnoise demo wrong

// PENDING
// Use topological sort ?

/**
 * Filter node
 *
 * @constructor qtek.compositor.FilterNode
 * @extends qtek.compositor.Node
 *
 * @example
    var node = new qtek.compositor.Node({
        name: 'fxaa',
        shader: qtek.Shader.source('qtek.compositor.fxaa'),
        inputs: {
            texture: {
                    node: 'scene',
                    pin: 'color'
            }
        },
        // Multiple outputs is preserved for MRT support in WebGL2.0
        outputs: {
            color: {
                attachment: qtek.FrameBuffer.COLOR_ATTACHMENT0
                parameters: {
                    format: qtek.Texture.RGBA,
                    width: 512,
                    height: 512
                },
                // Node will keep the RTT rendered in last frame
                keepLastFrame: true,
                // Force the node output the RTT rendered in last frame
                outputLastFrame: true
            }
        }
    });
    *
    */
var FilterNode = Node.extend(function () {
    return /** @lends qtek.compositor.Node# */ {
        /**
         * @type {string}
         */
        name: '',

        /**
         * @type {Object}
         */
        inputs: {},

        /**
         * @type {Object}
         */
        outputs: null,

        /**
         * @type {string}
         */
        shader: '',

        /**
         * Input links, will be updated by the graph
         * @example:
         *     inputName: {
         *         node: someNode,
         *         pin: 'xxxx'
         *     }
         * @type {Object}
         */
        inputLinks: {},

        /**
         * Output links, will be updated by the graph
         * @example:
         *     outputName: {
         *         node: someNode,
         *         pin: 'xxxx'
         *     }
         * @type {Object}
         */
        outputLinks: {},

        /**
         * @type {qtek.compositor.Pass}
         */
        pass: null,

        // Save the output texture of previous frame
        // Will be used when there exist a circular reference
        _prevOutputTextures: {},
        _outputTextures: {},

        // Example: { name: 2 }
        _outputReferences: {},

        _rendering: false,
        // If rendered in this frame
        _rendered: false,

        _compositor: null
    };
}, function () {

    var pass = new Pass({
        fragment: this.shader
    });
    this.pass = pass;
},
/** @lends qtek.compositor.Node.prototype */
{
    /**
     * @param  {qtek.Renderer} renderer
     */
    render: function (renderer, frameBuffer) {
        this.trigger('beforerender', renderer);

        this._rendering = true;

        var _gl = renderer.gl;

        for (var inputName in this.inputLinks) {
            var link = this.inputLinks[inputName];
            var inputTexture = link.node.getOutput(renderer, link.pin);
            this.pass.setUniform(inputName, inputTexture);
        }
        // Output
        if (!this.outputs) {
            this.pass.outputs = null;

            this._compositor.getFrameBuffer().unbind(renderer);

            this.pass.render(renderer, frameBuffer);
        }
        else {
            this.pass.outputs = {};

            var attachedTextures = {};
            for (var name in this.outputs) {
                var parameters = this.updateParameter(name, renderer);
                if (isNaN(parameters.width)) {
                    this.updateParameter(name, renderer);
                }
                var outputInfo = this.outputs[name];
                var texture = this._compositor.allocateTexture(parameters);
                this._outputTextures[name] = texture;
                var attachment = outputInfo.attachment || _gl.COLOR_ATTACHMENT0;
                if (typeof(attachment) == 'string') {
                    attachment = _gl[attachment];
                }
                attachedTextures[attachment] = texture;
            }
            this._compositor.getFrameBuffer().bind(renderer);

            for (var attachment in attachedTextures) {
                // FIXME attachment changes in different nodes
                this._compositor.getFrameBuffer().attach(
                    attachedTextures[attachment], attachment
                );
            }

            this.pass.render(renderer);

            // Because the data of texture is changed over time,
            // Here update the mipmaps of texture each time after rendered;
            this._compositor.getFrameBuffer().updateMipmap(renderer.gl);
        }

        for (var inputName in this.inputLinks) {
            var link = this.inputLinks[inputName];
            link.node.removeReference(link.pin);
        }

        this._rendering = false;
        this._rendered = true;

        this.trigger('afterrender', renderer);
    },

    // TODO Remove parameter function callback
    updateParameter: function (outputName, renderer) {
        var outputInfo = this.outputs[outputName];
        var parameters = outputInfo.parameters;
        var parametersCopy = outputInfo._parametersCopy;
        if (!parametersCopy) {
            parametersCopy = outputInfo._parametersCopy = {};
        }
        if (parameters) {
            for (var key in parameters) {
                if (key !== 'width' && key !== 'height') {
                    parametersCopy[key] = parameters[key];
                }
            }
        }
        var width, height;
        if (parameters.width instanceof Function) {
            width = parameters.width.call(this, renderer);
        }
        else {
            width = parameters.width;
        }
        if (parameters.height instanceof Function) {
            height = parameters.height.call(this, renderer);
        }
        else {
            height = parameters.height;
        }
        if (
            parametersCopy.width !== width
            || parametersCopy.height !== height
        ) {
            if (this._outputTextures[outputName]) {
                this._outputTextures[outputName].dispose(renderer);
            }
        }
        parametersCopy.width = width;
        parametersCopy.height = height;

        return parametersCopy;
    },

    /**
     * Set parameter
     * @param {string} name
     * @param {} value
     */
    setParameter: function (name, value) {
        this.pass.setUniform(name, value);
    },
    /**
     * Get parameter value
     * @param  {string} name
     * @return {}
     */
    getParameter: function (name) {
        return this.pass.getUniform(name);
    },
    /**
     * Set parameters
     * @param {Object} obj
     */
    setParameters: function (obj) {
        for (var name in obj) {
            this.setParameter(name, obj[name]);
        }
    },
    /**
     * Set shader code
     * @param {string} shaderStr
     */
    setShader: function (shaderStr) {
        var material = this.pass.material;
        material.shader.setFragment(shaderStr);
        material.attachShader(material.shader, true);
    },
    /**
     * Proxy of pass.material.shader.define('fragment', xxx);
     * @param  {string} symbol
     * @param  {number} [val]
     */
    shaderDefine: function (symbol, val) {
        this.pass.material.shader.define('fragment', symbol, val);
    },

    /**
     * Proxy of pass.material.shader.undefine('fragment', xxx)
     * @param  {string} symbol
     */
    shaderUndefine: function (symbol) {
        this.pass.material.shader.undefine('fragment', symbol);
    },

    removeReference: function (outputName) {
        this._outputReferences[outputName]--;
        if (this._outputReferences[outputName] === 0) {
            var outputInfo = this.outputs[outputName];
            if (outputInfo.keepLastFrame) {
                if (this._prevOutputTextures[outputName]) {
                    this._compositor.releaseTexture(this._prevOutputTextures[outputName]);
                }
                this._prevOutputTextures[outputName] = this._outputTextures[outputName];
            }
            else {
                // Output of this node have alreay been used by all other nodes
                // Put the texture back to the pool.
                this._compositor.releaseTexture(this._outputTextures[outputName]);
            }
        }
    },

    link: function (inputPinName, fromNode, fromPinName) {

        // The relationship from output pin to input pin is one-on-multiple
        this.inputLinks[inputPinName] = {
            node: fromNode,
            pin: fromPinName
        };
        if (!fromNode.outputLinks[fromPinName]) {
            fromNode.outputLinks[fromPinName] = [];
        }
        fromNode.outputLinks[ fromPinName ].push({
            node: this,
            pin: inputPinName
        });

        // Enabled the pin texture in shader
        var shader = this.pass.material.shader;
        shader.enableTexture(inputPinName);
    },

    clear: function () {
        Node.prototype.clear.call(this);

        var shader = this.pass.material.shader;
        // Default disable all texture
        shader.disableTexturesAll();
    },

    updateReference: function (outputName) {
        if (!this._rendering) {
            this._rendering = true;
            for (var inputName in this.inputLinks) {
                var link = this.inputLinks[inputName];
                link.node.updateReference(link.pin);
            }
            this._rendering = false;
        }
        if (outputName) {
            this._outputReferences[outputName] ++;
        }
    },

    beforeFrame: function () {
        this._rendered = false;

        for (var name in this.outputLinks) {
            this._outputReferences[name] = 0;
        }
    },

    afterFrame: function () {
        // Put back all the textures to pool
        for (var name in this.outputLinks) {
            if (this._outputReferences[name] > 0) {
                var outputInfo = this.outputs[name];
                if (outputInfo.keepLastFrame) {
                    if (this._prevOutputTextures[name]) {
                        this._compositor.releaseTexture(this._prevOutputTextures[name]);
                    }
                    this._prevOutputTextures[name] = this._outputTextures[name];
                }
                else {
                    this._compositor.releaseTexture(this._outputTextures[name]);
                }
            }
        }
    }
});

export default FilterNode;
