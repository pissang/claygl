import Base from '../core/Base';

// PENDING
// Use topological sort ?

/**
 * Node of graph based post processing.
 *
 * @constructor clay.compositor.CompositorNode
 * @extends clay.core.Base
 *
 */
var CompositorNode = Base.extend(function () {
    return /** @lends clay.compositor.CompositorNode# */ {
        /**
         * @type {string}
         */
        name: '',

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
},
/** @lends clay.compositor.CompositorNode.prototype */
{

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
                this._outputTextures[outputName].dispose(renderer.gl);
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
    setParameter: function (name, value) {},
    /**
     * Get parameter value
     * @param  {string} name
     * @return {}
     */
    getParameter: function (name) {},
    /**
     * Set parameters
     * @param {Object} obj
     */
    setParameters: function (obj) {
        for (var name in obj) {
            this.setParameter(name, obj[name]);
        }
    },

    render: function () {},

    getOutput: function (renderer /*optional*/, name) {
        if (name == null) {
            // Return the output texture without rendering
            name = renderer;
            return this._outputTextures[name];
        }
        var outputInfo = this.outputs[name];
        if (!outputInfo) {
            return ;
        }

        // Already been rendered in this frame
        if (this._rendered) {
            // Force return texture in last frame
            if (outputInfo.outputLastFrame) {
                return this._prevOutputTextures[name];
            }
            else {
                return this._outputTextures[name];
            }
        }
        else if (
            // TODO
            this._rendering   // Solve Circular Reference
        ) {
            if (!this._prevOutputTextures[name]) {
                // Create a blank texture at first pass
                this._prevOutputTextures[name] = this._compositor.allocateTexture(outputInfo.parameters || {});
            }
            return this._prevOutputTextures[name];
        }

        this.render(renderer);

        return this._outputTextures[name];
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
        fromNode.outputLinks[fromPinName].push({
            node: this,
            pin: inputPinName
        });

        // Enabled the pin texture in shader
        this.pass.material.enableTexture(inputPinName);
    },

    clear: function () {
        this.inputLinks = {};
        this.outputLinks = {};
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

export default CompositorNode;
