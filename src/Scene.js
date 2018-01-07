import Node from './Node';
import Light from './Light';
import Camera from './Camera';
import BoundingBox from './math/BoundingBox';
import util from './core/util';

var programKeyCache = {};

function getProgramKey(lightNumbers) {
    var defineStr = [];
    var lightTypes = Object.keys(lightNumbers);
    lightTypes.sort();
    for (var i = 0; i < lightTypes.length; i++) {
        var lightType = lightNumbers[i];
        defineStr.push(lightType + ' ' + lightNumbers[lightType]);
    }
    var key = defineStr.join('\n');

    if (programKeyCache[key]) {
        return programKeyCache[key];
    }

    var id = util.genGUID();
    programKeyCache[key] = id;
    return id;
}

/**
 * @constructor clay.Scene
 * @extends clay.Node
 */
var Scene = Node.extend(function () {
    return /** @lends clay.Scene# */ {
        /**
         * Global material of scene
         * @type {clay.Material}
         */
        material: null,

        /**
         * @type {boolean}
         */
        autoUpdate: true,

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {clay.Renderable[]}
         * @readonly
         */
        opaqueList: [],

        /**
         * Opaque renderable list, it will be updated automatically
         * @type {clay.Renderable[]}
         * @readonly
         */
        transparentList: [],

        lights: [],


        /**
         * Scene bounding box in view space.
         * Used when camera needs to adujst the near and far plane automatically
         * so that the view frustum contains the visible objects as tightly as possible.
         * Notice:
         *  It is updated after rendering (in the step of frustum culling passingly). So may be not so accurate, but saves a lot of calculation
         *
         * @type {clay.math.BoundingBox}
         */
        viewBoundingBoxLastFrame: new BoundingBox(),

        // Uniforms for shadow map.
        shadowUniforms: {},

        _cameraList: [],

        // Properties to save the light information in the scene
        // Will be set in the render function
        _lightUniforms: {},

        _previousLightNumber: {},

        _lightNumber: {
            // groupId: {
                // POINT_LIGHT: 0,
                // DIRECTIONAL_LIGHT: 0,
                // SPOT_LIGHT: 0,
                // AMBIENT_LIGHT: 0,
                // AMBIENT_SH_LIGHT: 0
            // }
        },

        _lightProgramKeys: {},

        _opaqueObjectCount: 0,
        _transparentObjectCount: 0,

        _nodeRepository: {},

    };
}, function () {
    this._scene = this;
},
/** @lends clay.Scene.prototype. */
{
    /**
     * Add node to scene
     * @param {Node} node
     */
    addToScene: function (node) {
        if (node instanceof Camera) {
            if (this._cameraList.length > 0) {
                console.warn('Found multiple camera in one scene. Use the fist one.');
            }
            this._cameraList.push(node);
        }
        if (node.name) {
            this._nodeRepository[node.name] = node;
        }
    },

    /**
     * Remove node from scene
     * @param {Node} node
     */
    removeFromScene: function (node) {
        if (node instanceof Camera) {
            var idx = this._cameraList.indexOf(node);
            if (idx >= 0) {
                this._cameraList.splice(idx, 1);
            }
        }
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
     * @param  {clay.Node} node
     * @return {clay.Node}
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
                materialsMap[current.material.__uid__] = {
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
                current.material = materialsMap[current.material.__uid__].newMat;
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

        this._updateRenderList(this, sceneMaterialTransparent);

        this.opaqueList.length = this._opaqueObjectCount;
        this.transparentList.length = this._transparentObjectCount;

        // reset
        if (!notUpdateLights) {
            this._previousLightNumber = this._lightNumber;

            var lightNumber = {};
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
            this._lightNumber = lightNumber;

            for (var groupId in lightNumber) {
                this._lightProgramKeys[groupId] = getProgramKey(lightNumber[groupId]);
            }

            this._updateLightUniforms();
        }
    },

    getMainCamera: function () {
        return this._cameraList[0];
    },

    // Traverse the scene and add the renderable
    // object to the render list
    _updateRenderList: function (parent, sceneMaterialTransparent) {
        if (parent.invisible) {
            return;
        }

        for (var i = 0; i < parent._children.length; i++) {
            var child = parent._children[i];

            if (child instanceof Light) {
                this.lights.push(child);
            }
            else if (child.isRenderable()) {
                if (child.material.transparent || sceneMaterialTransparent) {
                    this.transparentList[this._transparentObjectCount++] = child;
                }
                else {
                    this.opaqueList[this._opaqueObjectCount++] = child;
                }
            }
            if (child._children.length > 0) {
                this._updateRenderList(child);
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
                var value = uniformTpl.value(light);
                if (value == null) {
                    continue;
                }
                if (!lightUniforms[group]) {
                    lightUniforms[group] = {};
                }
                if (!lightUniforms[group][symbol]) {
                    lightUniforms[group][symbol] = {
                        type: '',
                        value: []
                    };
                }
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
                        for (var j = 0; j < value.length; j++) {
                            lu.value.push(value[j]);
                        }
                        break;
                    default:
                        console.error('Unkown light uniform type ' + uniformTpl.type);
                }
            }
        }
    },

    getLightGroups: function () {
        var lightGroups = [];
        for (var groupId in this._lightNumber) {
            lightGroups.push(groupId);
        }
        return lightGroups;
    },

    getNumberChangedLightGroups: function () {
        var lightGroups = [];
        for (var groupId in this._lightNumber) {
            if (this.isLightNumberChanged(groupId)) {
                lightGroups.push(groupId);
            }
        }
        return lightGroups;
    },

    /**
     * Determine if light group is different with since last frame
     * Used to determine whether to update shader and scene's uniforms in Renderer.render
     * @param {Shader} shader
     * @returns {Boolean}
     */
    isLightNumberChanged: function (lightGroup) {
        var prevLightNumber = this._previousLightNumber;
        var currentLightNumber = this._lightNumber;
        // PENDING Performance
        for (var type in currentLightNumber[lightGroup]) {
            if (!prevLightNumber[lightGroup]) {
                return true;
            }
            if (currentLightNumber[lightGroup][type] !== prevLightNumber[lightGroup][type]) {
                return true;
            }
        }
        for (var type in prevLightNumber[lightGroup]) {
            if (!currentLightNumber[lightGroup]) {
                return true;
            }
            if (currentLightNumber[lightGroup][type] !== prevLightNumber[lightGroup][type]) {
                return true;
            }
        }
        return false;
    },

    /**
     * Set shader's light group with scene's
     * @param {Shader} shader
     */
    getLightsNumbers: function (lightGroup) {
        return this._lightNumber[lightGroup];
    },

    getProgramKey: function (lightGroup) {
        return this._lightProgramKeys[lightGroup];
    },

    setLightUniforms: (function () {
        function setUniforms(uniforms, program, renderer) {
            for (var symbol in uniforms) {
                var lu = uniforms[symbol];
                if (lu.type === 'tv') {
                    if (!program.hasUniform(symbol)) {
                        continue;
                    }
                    var texSlots = [];
                    for (var i = 0; i < lu.value.length; i++) {
                        var texture = lu.value[i];
                        var slot = program.takeCurrentTextureSlot(renderer, texture);
                        texSlots.push(slot);
                    }
                    program.setUniform(renderer.gl, '1iv', symbol, texSlots);
                }
                else {
                    program.setUniform(renderer.gl, lu.type, symbol, lu.value);
                }
            }
        }

        return function (program, lightGroup, renderer) {
            setUniforms(this._lightUniforms[lightGroup], program, renderer);
            // Set shadows
            setUniforms(this.shadowUniforms, program, renderer);
        };
    })(),

    /**
     * Dispose self, clear all the scene objects
     * But resources of gl like texuture, shader will not be disposed.
     * Mostly you should use disposeScene method in Renderer to do dispose.
     */
    dispose: function () {
        this.material = null;
        this.opaqueList = [];
        this.transparentList = [];

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
