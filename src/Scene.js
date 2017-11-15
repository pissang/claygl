import Node from './Node';
import Light from './Light';
import BoundingBox from './math/BoundingBox';

/**
 * @constructor qtek.Scene
 * @extends qtek.Node
 */
var Scene = Node.extend(function () {
    return /** @lends qtek.Scene# */ {
        /**
         * Global material of scene
         * @type {qtek.Material}
         */
        material: null,

        /**
         * @type {boolean}
         */
        autoUpdate: true,

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {qtek.Renderable[]}
         * @readonly
         */
        opaqueQueue: [],

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {qtek.Renderable[]}
         * @readonly
         */
        transparentQueue: [],

        lights: [],


        /**
         * Scene bounding box in view space.
         * Used when camera needs to adujst the near and far plane automatically
         * so that the view frustum contains the visible objects as tightly as possible.
         * Notice:
         *  It is updated after rendering (in the step of frustum culling passingly). So may be not so accurate, but saves a lot of calculation
         *
         * @type {qtek.math.BoundingBox}
         */
        viewBoundingBoxLastFrame: new BoundingBox(),

        // Properties to save the light information in the scene
        // Will be set in the render function
        _lightUniforms: {},

        _lightNumber: {
            // groupId: {
                // POINT_LIGHT: 0,
                // DIRECTIONAL_LIGHT: 0,
                // SPOT_LIGHT: 0,
                // AMBIENT_LIGHT: 0,
                // AMBIENT_SH_LIGHT: 0
            // }
        },

        _opaqueObjectCount: 0,
        _transparentObjectCount: 0,

        _nodeRepository: {},

    };
}, function () {
    this._scene = this;
},
/** @lends qtek.Scene.prototype. */
{
    /**
     * Add node to scene
     * @param {Node} node
     */
    addToScene: function (node) {
        if (node.name) {
            this._nodeRepository[node.name] = node;
        }
    },

    /**
     * Remove node from scene
     * @param {Node} node
     */
    removeFromScene: function (node) {
        if (node.name) {
            delete this._nodeRepository[node.name];
        }
    },

    /**
     * Get node by name
     * @param  {string} name
     * @return {Node}
     * @DEPRECATED
     */
    getNode: function (name) {
        return this._nodeRepository[name];
    },

    /**
     * Clone a new scene node recursively, including material, skeleton.
     * Shader and geometry instances will not been cloned
     * @param  {qtek.Node} node
     * @return {qtek.Node}
     */
    cloneNode: function (node) {
        var newNode = node.clone();
        var materialsMap = {};

        var cloneSkeleton = function (current, currentNew) {
            if (current.skeleton) {
                currentNew.skeleton = current.skeleton.clone(node, newNode);
                currentNew.joints = current.joints.slice();
            }
            if (current.material) {
                materialsMap[current.material.__GUID__] = {
                    oldMat: current.material
                };
            }
            for (var i = 0; i < current._children.length; i++) {
                cloneSkeleton(current._children[i], currentNew._children[i]);
            }
        };

        cloneSkeleton(node, newNode);

        for (var guid in materialsMap) {
            materialsMap[guid].newMat = materialsMap[guid].oldMat.clone();
        }

        // Replace material
        newNode.traverse(function (current) {
            if (current.material) {
                current.material = materialsMap[current.material.__GUID__].newMat;
            }
        });

        return newNode;
    },


    /**
     * Scene update
     * @param  {boolean} force
     * @param  {boolean} notUpdateLights
     *         Useful in deferred pipeline
     */
    update: function (force, notUpdateLights) {
        if (!(this.autoUpdate || force)) {
            return;
        }
        Node.prototype.update.call(this, force);

        var lights = this.lights;
        var sceneMaterialTransparent = this.material && this.material.transparent;

        this._opaqueObjectCount = 0;
        this._transparentObjectCount = 0;

        lights.length = 0;

        this._updateRenderQueue(this, sceneMaterialTransparent);

        this.opaqueQueue.length = this._opaqueObjectCount;
        this.transparentQueue.length = this._transparentObjectCount;

        // reset
        if (!notUpdateLights) {
            var lightNumber = this._lightNumber;
            // Reset light numbers
            for (var group in lightNumber) {
                for (var type in lightNumber[group]) {
                    lightNumber[group][type] = 0;
                }
            }
            for (var i = 0; i < lights.length; i++) {
                var light = lights[i];
                var group = light.group;
                if (!lightNumber[group]) {
                    lightNumber[group] = {};
                }
                // User can use any type of light
                lightNumber[group][light.type] = lightNumber[group][light.type] || 0;
                lightNumber[group][light.type]++;
            }
            // PENDING Remove unused group?

            this._updateLightUniforms();
        }
    },

    // Traverse the scene and add the renderable
    // object to the render queue
    _updateRenderQueue: function (parent, sceneMaterialTransparent) {
        if (parent.invisible) {
            return;
        }

        for (var i = 0; i < parent._children.length; i++) {
            var child = parent._children[i];

            if (child instanceof Light) {
                this.lights.push(child);
            }
            if (child.isRenderable()) {
                if (child.material.transparent || sceneMaterialTransparent) {
                    this.transparentQueue[this._transparentObjectCount++] = child;
                }
                else {
                    this.opaqueQueue[this._opaqueObjectCount++] = child;
                }
            }
            if (child._children.length > 0) {
                this._updateRenderQueue(child);
            }
        }
    },

    _updateLightUniforms: function () {
        var lights = this.lights;
        // Put the light cast shadow before the light not cast shadow
        lights.sort(lightSortFunc);

        var lightUniforms = this._lightUniforms;
        for (var group in lightUniforms) {
            for (var symbol in lightUniforms[group]) {
                lightUniforms[group][symbol].value.length = 0;
            }
        }
        for (var i = 0; i < lights.length; i++) {

            var light = lights[i];
            var group = light.group;

            for (var symbol in light.uniformTemplates) {

                var uniformTpl = light.uniformTemplates[symbol];
                if (!lightUniforms[group]) {
                    lightUniforms[group] = {};
                }
                if (!lightUniforms[group][symbol]) {
                    lightUniforms[group][symbol] = {
                        type: '',
                        value: []
                    };
                }
                var value = uniformTpl.value(light);
                var lu = lightUniforms[group][symbol];
                lu.type = uniformTpl.type + 'v';
                switch (uniformTpl.type) {
                    case '1i':
                    case '1f':
                    case 't':
                        lu.value.push(value);
                        break;
                    case '2f':
                    case '3f':
                    case '4f':
                        for (var j =0; j < value.length; j++) {
                            lu.value.push(value[j]);
                        }
                        break;
                    default:
                        console.error('Unkown light uniform type ' + uniformTpl.type);
                }
            }
        }
    },
    
    /**
     * Determine if light group of the shader is different from scene's
     * Used to determine whether to update shader and scene's uniforms in Renderer.render
     * @param {Shader} shader
     * @returns {Boolean}
     */
    isShaderLightNumberChanged: function (shader) {
        var group = shader.lightGroup;
        // PENDING Performance
        for (var type in this._lightNumber[group]) {
            if (this._lightNumber[group][type] !== shader.lightNumber[type]) {
                return true;
            }
        }
        for (var type in shader.lightNumber) {
            if (this._lightNumber[group][type] !== shader.lightNumber[type]) {
                return true;
            }
        }
        return false;
    },

    /**
     * Set shader's light group with scene's
     * @param {Shader} shader
     */
    setShaderLightNumber: function (shader) {
        var group = shader.lightGroup;
        for (var type in this._lightNumber[group]) {
            shader.lightNumber[type] = this._lightNumber[group][type];
        }
        shader.dirty();
    },

    setLightUniforms: function (shader, renderer) {
        var group = shader.lightGroup;
        for (var symbol in this._lightUniforms[group]) {
            var lu = this._lightUniforms[group][symbol];
            if (lu.type === 'tv') {
                for (var i = 0; i < lu.value.length; i++) {
                    var texture = lu.value[i];
                    var slot = shader.currentTextureSlot();
                    var result = shader.setUniform(renderer.gl, '1i', symbol, slot);
                    if (result) {
                        shader.takeCurrentTextureSlot(renderer, texture);
                    }
                }
            }
            else {
                shader.setUniform(renderer.gl, lu.type, symbol, lu.value);
            }
        }
    },

    /**
     * Dispose self, clear all the scene objects
     * But resources of gl like texuture, shader will not be disposed.
     * Mostly you should use disposeScene method in Renderer to do dispose.
     */
    dispose: function () {
        this.material = null;
        this.opaqueQueue = [];
        this.transparentQueue = [];

        this.lights = [];

        this._lightUniforms = {};

        this._lightNumber = {};
        this._nodeRepository = {};
    }
});

function lightSortFunc(a, b) {
    if (b.castShadow && !a.castShadow) {
        return true;
    }
}

export default Scene;
