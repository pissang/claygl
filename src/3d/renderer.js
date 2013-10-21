define(function(require) {

    var Base = require("core/base");
    var _ = require("_");
    var glMatrix = require("glmatrix");
    var mat4 = glMatrix.mat4;
    var util = require("util/util");
    var Light = require("./light");
    var Mesh = require("./mesh");
    var Texture = require("./texture");
    var WebGLInfo = require('./webglinfo');

    var Renderer = Base.derive(function() {
        return {

            __GUID__ : util.genGUID(),

            canvas : null,
            // Device Pixel Ratio is for high defination disply
            // like retina display
            // http://www.khronos.org/webgl/wiki/HandlingHighDPI
            devicePixelRatio : window.devicePixelRatio || 1.0,

            color : [0.0, 0.0, 0.0, 0.0],
            
            // _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
            clear : 17664,  

            // Settings when getting context
            // http://www.khronos.org/registry/webgl/specs/latest/#2.4
            alhpa : true,
            depth : true,
            stencil : false,
            antialias : true,
            premultipliedAlpha : true,
            preserveDrawingBuffer : false,

            gl : null,

            viewportInfo : {},

        }
    }, function() {
        if (! this.canvas) {
            this.canvas = document.createElement("canvas");
        }
        try {
            this.gl = this.canvas.getContext('experimental-webgl', {
                alhpa : this.alhpa,
                depth : this.depth,
                stencil : this.stencil,
                antialias : this.antialias,
                premultipliedAlpha : this.premultipliedAlpha,
                preserveDrawingBuffer : this.preserveDrawingBuffer,
            });
            this.gl.__GUID__ = this.__GUID__;

            this.resize(this.canvas.width, this.canvas.height);

            WebGLInfo.initialize(this.gl);
        }
        catch(e) {
            throw "Error creating WebGL Context";
        }
    }, {

        resize : function(width, height) {
            var canvas = this.canvas;
            // http://www.khronos.org/webgl/wiki/HandlingHighDPI
            // set the display size of the canvas.
            if (this.devicePixelRatio !== 1.0) {
                canvas.style.width = width + "px";
                canvas.style.height = height + "px";
            }
             
            // set the size of the drawingBuffer
            canvas.width = width * this.devicePixelRatio;
            canvas.height = height * this.devicePixelRatio;

            this.setViewport(0, 0, canvas.width, canvas.height);
        },

        setViewport : function(x, y, width, height) {

            if (typeof(x) === "object") {
                var obj = x;
                x = obj.x;
                y = obj.y;
                width = obj.width;
                height = obj.height;
            }
            this.gl.viewport(x, y, width, height);

            this.viewportInfo = {
                x : x,
                y : y,
                width : width,
                height : height
            }
        },

        render : function(scene, camera, silent) {
            
            var _gl = this.gl;
            
            if (! silent) {
                // Render plugin like shadow mapping must set the silent true
                this.trigger("beforerender", this, scene, camera);
            }

            var color = this.color;
            _gl.clearColor(color[0], color[1], color[2], color[3]);
            _gl.clear(this.clear);

            var opaqueQueue = [];
            var transparentQueue = [];
            var lights = [];

            camera.update();
            scene.update();

            this._scene = scene;
            var sceneMaterial = scene.material;

            // Traverse the scene and add the renderable
            // object to the render queue;
            scene.traverse(function(node) {
                if (! node.visible) {
                    return true;
                }
                if (node.instanceof(Light)) {
                    lights.push(node);
                }
                // A node have render method and material property
                // can be rendered on the scene
                if (! node.render) {
                    return;
                }
                if (sceneMaterial) {
                    if (sceneMaterial.transparent) {
                        transparentQueue.push(node);
                    }else{
                        opaqueQueue.push(node);
                    }
                }else{
                    if (! node.material || ! node.material.shader) {
                        return;
                    }
                    if (! node.geometry) {
                        return;
                    }
                    if (node.material.transparent) {
                        transparentQueue.push(node);
                    }else{
                        opaqueQueue.push(node);
                    }
                }
            });
    
            if (scene.filter) {
                opaqueQueue = _.filter(opaqueQueue, scene.filter);
                transparentQueue = _.filter(transparentQueue, scene.filter);
            }

            var lightNumber = {};
            for (var i = 0; i < lights.length; i++) {
                var light = lights[i];
                if (! lightNumber[light.type]) {
                    lightNumber[light.type] = 0;
                }
                lightNumber[light.type]++;
            }
            scene.lightNumber = lightNumber;
            this.updateLightUnforms(lights);

            // Sort material to reduce the cost of setting uniform in material
            // PENDING : sort geometry ??
            opaqueQueue.sort(this._materialSortFunc);
            transparentQueue.sort(this._materialSortFunc);

            // Render Opaque queue
            if (! silent) {
                this.trigger("beforerender:opaque", this, opaqueQueue);
            }

            // Cull Face
            // _gl.frontFace(_gl.CCW);
            // _gl.cullFace(_gl.BACK);
            // _gl.enable(_gl.CULL_FACE);

            _gl.disable(_gl.BLEND);
            this.renderQueue(opaqueQueue, camera, sceneMaterial, silent);

            if (! silent) {
                this.trigger("afterrender:opaque", this, opaqueQueue);
                this.trigger("beforerender:transparent", this, transparentQueue);
            }

            // Render Transparent Queue
            _gl.enable(_gl.BLEND);
            // Default blend function
            _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
            _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);

            this.renderQueue(transparentQueue, camera, sceneMaterial, silent);

            if (! silent) {
                this.trigger("afterrender:transparent", this, transparentQueue);
                this.trigger("afterrender", this, scene, camera);
            }
        },


        updateLightUnforms : function(lights) {
            
            var lightUniforms = this._scene.lightUniforms;
            for (var symbol in lightUniforms) {
                lightUniforms[symbol].value.length = 0;
            }
            for (var i = 0; i < lights.length; i++) {
                
                var light = lights[i];
                
                for (symbol in light.uniformTemplates) {

                    var uniformTpl = light.uniformTemplates[symbol];
                    if (! lightUniforms[symbol]) {
                        lightUniforms[symbol] = {
                            type : "",
                            value : []
                        }
                    }
                    var value = uniformTpl.value(light);
                    var lu = lightUniforms[symbol];
                    lu.type = uniformTpl.type + "v";
                    switch (uniformTpl.type) {
                        case "1i":
                        case "1f":
                            lu.value.push(value);
                            break;
                        case "2f":
                        case "3f":
                        case "4f":
                            for (var j =0; j < value.length; j++) {
                                lu.value.push(value[j]);
                            }
                            break;
                        default:
                            console.error("Unkown light uniform type "+uniformTpl.type);
                    }
                }
            }
        },

        renderQueue : function(queue, camera, globalMaterial, silent) {

            // Calculate view and projection matrix
            mat4.invert(matrices['VIEW'],  camera.worldTransform._array);
            mat4.copy(matrices['PROJECTION'], camera.projectionMatrix._array);
            mat4.multiply(matrices['VIEWPROJECTION'], camera.projectionMatrix._array, matrices['VIEW']);
            mat4.copy(matrices['VIEWINVERSE'], camera.worldTransform._array);
            mat4.invert(matrices['PROJECTIONINVERSE'], matrices['PROJECTION']);
            mat4.invert(matrices['VIEWPROJECTIONINVERSE'], matrices['VIEWPROJECTION']);

            var prevMaterialID;
            var prevShaderID;
            var _gl = this.gl;
            var scene = this._scene;
            
            var depthTest;
            var depthMask;

            for (var i =0; i < queue.length; i++) {
                var object = queue[i];
                var material = globalMaterial || object.material;
                var shader = material.shader;
                var geometry = object.geometry;
                var customBlend = material.transparent && material.blend;

                if (prevShaderID !== shader.__GUID__) {
                    // Set lights number
                    var lightNumberChanged = false;
                    if (! _.isEqual(shader.lightNumber, scene.lightNumber)) {
                        lightNumberChanged = true;
                    }
                    if (lightNumberChanged) {
                        for (var type in scene.lightNumber) {
                            var number = scene.lightNumber[type];
                            shader.lightNumber[type] = number;
                        }
                        shader.dirty();
                    }

                    shader.bind(_gl);

                    // Set lights uniforms
                    for (var symbol in scene.lightUniforms) {
                        var lu = scene.lightUniforms[symbol];
                        shader.setUniform(_gl, lu.type, symbol, lu.value);
                    }
                    prevShaderID = shader.__GUID__;
                }
                if (prevMaterialID !== material.__GUID__) {
                    if (material.depthTest !== depthTest) {
                        material.depthTest ? 
                            _gl.enable(_gl.DEPTH_TEST) : 
                            _gl.disable(_gl.DEPTH_TEST);
                        depthTest = material.depthTest;
                    }
                    if (material.depthMask !== depthMask) {
                        _gl.depthMask(material.depthMask);
                        depthMask = material.depthMask;
                    }
                    material.bind(_gl);
                    prevMaterialID = material.__GUID__;

                    Mesh.materialChanged();
                }

                if (customBlend) {
                    customBlend(_gl);
                }

                var worldM = object.worldTransform._array;

                // All matrices ralated to world matrix will be updated on demand;
                if (shader.semantics.hasOwnProperty('WORLD') ||
                    shader.semantics.hasOwnProperty('WORLDTRANSPOSE')) {
                    mat4.copy(matrices['WORLD'], worldM);
                }
                if (shader.semantics.hasOwnProperty('WORLDVIEW') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWINVERSE') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWINVERSETRANSPOSE')) {
                    mat4.multiply(matrices['WORLDVIEW'], matrices['VIEW'] , worldM);
                }
                if (shader.semantics.hasOwnProperty('WORLDVIEWPROJECTION') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWPROJECTIONINVERSE') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWPROJECTIONINVERSETRANSPOSE')) {
                    mat4.multiply(matrices['WORLDVIEWPROJECTION'], matrices['VIEWPROJECTION'] , worldM);
                }
                if (shader.semantics.hasOwnProperty('WORLDINVERSE') ||
                    shader.semantics.hasOwnProperty('WORLDINVERSETRANSPOSE')) {
                    mat4.invert(matrices['WORLDINVERSE'], worldM);
                }
                if (shader.semantics.hasOwnProperty('WORLDVIEWINVERSE') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWINVERSETRANSPOSE')) {
                    mat4.invert(matrices['WORLDVIEWINVERSE'], matrices['WORLDVIEW']);
                }
                if (shader.semantics.hasOwnProperty('WORLDVIEWPROJECTIONINVERSE') ||
                    shader.semantics.hasOwnProperty('WORLDVIEWPROJECTIONINVERSETRANSPOSE')) {
                    mat4.invert(matrices['WORLDVIEWPROJECTIONINVERSE'], matrices['WORLDVIEWPROJECTION']);
                }

                for (var j = 0; j < matrixSemantics.length; j++) {
                    var semantic = matrixSemantics[j];

                    if (shader.semantics.hasOwnProperty(semantic)) {
                        var matrix = matrices[semantic];
                        var semanticInfo = shader.semantics[semantic];
                        shader.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrix);
                    }

                    var semanticTranspose = semantic + "TRANSPOSE";
                    if (shader.semantics.hasOwnProperty(semanticTranspose)) {
                        var matrixTranspose = matrices[semanticTranspose];
                        var matrix = matrices[semantic];
                        var semanticTransposeInfo = shader.semantics[semanticTranspose];
                        mat4.transpose(matrixTranspose, matrix);
                        shader.setUniform(_gl, semanticTransposeInfo.type, semanticTransposeInfo.symbol, matrixTranspose );
                    }
                }

                if (! silent) {
                    this.trigger("beforerender:mesh", this, object);
                }
                var drawInfo = object.render(this, globalMaterial);
                if (! silent) {
                    this.trigger("afterrender:mesh", this, object, drawInfo);
                }
                // Restore the default blend function
                if (customBlend) {
                    _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
                    _gl.blendFuncSeparate(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA, _gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);   
                }
            }
        },

        disposeScene : function(scene) {
            this.disposeNode(scene);
            scene.lightNumber = {};
            scene.lightUniforms = {};
            scene.material = {};
            scene._nodeRepository = {};
        },

        disposeNode : function(root) {
            var materials = {};
            var _gl = this.gl;
            root.traverse(function(node) {
                if (node.geometry) {
                    node.geometry.dispose(_gl);
                }
                if (node.material) {
                    materials[node.material.__GUID__] = node.material;
                }
            });
            for (var guid in materials) {
                var mat = materials[guid];
                mat.shader.dispose(_gl);
                for (var name in mat.uniforms) {
                    var val = mat.uniforms[name].value;
                    if (!val ) {
                        continue;
                    }
                    if (val.instanceof &&
                        val.instanceof(Texture)) {
                        val.dispose(_gl);
                    }
                    else if (val instanceof Array) {
                        for (var i = 0; i < val.length; i++) {
                            if (val[i] && val[i].instanceof && val[i].instanceof(Texture)) {
                                val[i].dispose(_gl);
                            }
                        }
                    }
                }
                mat.dispose();
            }
            root._children = [];
        },

        _materialSortFunc : function(x, y) {
            if (x.material.shader == y.material.shader) {
                return x.material.__GUID__ - y.material.__GUID__;
            }
            return x.material.shader.__GUID__ - y.material.__GUID__;
        }
    })


    var matrices = {
        'WORLD' : mat4.create(),
        'VIEW' : mat4.create(),
        'PROJECTION' : mat4.create(),
        'WORLDVIEW' : mat4.create(),
        'VIEWPROJECTION' : mat4.create(),
        'WORLDVIEWPROJECTION' : mat4.create(),

        'WORLDINVERSE' : mat4.create(),
        'VIEWINVERSE' : mat4.create(),
        'PROJECTIONINVERSE' : mat4.create(),
        'WORLDVIEWINVERSE' : mat4.create(),
        'VIEWPROJECTIONINVERSE' : mat4.create(),
        'WORLDVIEWPROJECTIONINVERSE' : mat4.create(),

        'WORLDTRANSPOSE' : mat4.create(),
        'VIEWTRANSPOSE' : mat4.create(),
        'PROJECTIONTRANSPOSE' : mat4.create(),
        'WORLDVIEWTRANSPOSE' : mat4.create(),
        'VIEWPROJECTIONTRANSPOSE' : mat4.create(),
        'WORLDVIEWPROJECTIONTRANSPOSE' : mat4.create(),
        'WORLDINVERSETRANSPOSE' : mat4.create(),
        'VIEWINVERSETRANSPOSE' : mat4.create(),
        'PROJECTIONINVERSETRANSPOSE' : mat4.create(),
        'WORLDVIEWINVERSETRANSPOSE' : mat4.create(),
        'VIEWPROJECTIONINVERSETRANSPOSE' : mat4.create(),
        'WORLDVIEWPROJECTIONINVERSETRANSPOSE' : mat4.create()
    };
    var matrixSemantics = Object.keys(matrices);

    return Renderer;
})