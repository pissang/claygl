/**
 * @export{class} ShadowMap
 */
define( function(require){

    var Base = require("core/base");
    var Shader = require("../shader");
    var Light = require("../light");
    var SpotLight = require("../light/spot");
    var DirectionalLight = require("../light/directional");
    var PointLight = require("../light/point");
    var shaderLibrary = require("../shader/library");
    var Material = require("../material");
    var FrameBuffer = require("../framebuffer");
    var Texture2d = require("../texture/texture2d");
    var PerspectiveCamera = require("../camera/perspective");
    var OrthoCamera = require("../camera/orthographic");

    var glMatrix = require("glmatrix");
    var mat4 = glMatrix.mat4;

    var _ = require("_");

    var frameBuffer = new FrameBuffer();

    Shader.import( require('text!./vsm.essl') );

    var ShadowMapPlugin = Base.derive(function(){
        return {

            renderer : null,

            _depthMaterial : new Material({
                shader : new Shader({
                    vertex : Shader.source("buildin.vsm.depth.vertex"),
                    fragment : Shader.source("buildin.vsm.depth.fragment")
                })
            }),

            _textures : {},

            _cameras : {},
            _cameraMatrices : [],

            _shadowMapNumber : {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0
            },
            _shadowMapOrder : {
                'SPOT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 1,
                'SPOT_LIGHT' : 2
            },

            _latestRenderQueue : []
        }
    }, {

        enable : function(){
            this.renderer.on("beforerender", this._renderShadowPass, this );
        },

        disable : function(){
            this.renderer.off("beforerender", this._renderShadowPass, this );

            for(var i = 0; i < this._latestRenderQueue.length; i++){
                var shader = this._latestRenderQueue[i].material.shader;
                shader.disableTexture("shadowMap");
                shader.update();
            }
        },

        _renderShadowPass : function(scene, camera){

            var renderQueue = [],
                lightCastShadow = [],
                meshReceiveShadow = [];

            var renderer = this.renderer,
                _gl = renderer.gl;

            // Scene update is redundancy
            scene.update();

            scene.traverse( function(node){
                if( node.instanceof(Light) ){
                    if( node.castShadow ){
                        lightCastShadow.push(node);
                    }
                }
                if( node.material && node.material.shader ){
                    if( node.castShadow ){
                        renderQueue.push(node);

                    }
                    if( node.receiveShadow ){
                        meshReceiveShadow.push(node);

                        node.material.shader.enableTexture("shadowMap");
                    }else{
                        node.material.shader.disableTexture("shadowMap");
                    }
                };
            } );

            _gl.enable( _gl.DEPTH_TEST );
            _gl.disable( _gl.BLEND );

            _gl.clearColor(0.0, 0.0, 0.0, 0.0);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
            var cursor = 0;

            var texturesUniform = [];
            var matricesUniform = this._cameraMatrices;

            var order = this._shadowMapOrder;
            // Store the shadow map in order
            lightCastShadow.sort(function(a, b){
                return order[a] - order[b];
            })
            // reset
            for(var name in this._shadowMapNumber){
                this._shadowMapNumber[name] = 0;
            }
            // Create textures for shadow map
            _.each( lightCastShadow, function( light ){

                if( light.instanceof(SpotLight) ||
                    light.instanceof(DirectionalLight) ){
                    
                    light.shadowMapIndex = cursor;

                    var texture = this._getTexture(light.shadowMapIndex, light);
                    var camera = this._getCamera(light.shadowMapIndex, light);

                    frameBuffer.attach( renderer.gl, texture );
                    frameBuffer.bind(renderer);

                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                    renderer._scene = scene;
                    renderer.renderQueue( renderQueue, camera, this._depthMaterial, true );

                    frameBuffer.unbind(renderer);
                    //
                    texturesUniform.push( texture );
                    var matrix = matricesUniform[ cursor];
                    if( ! matrix){
                        matrix = matricesUniform[ cursor] = mat4.create();
                    }
                    mat4.invert(matrix, camera.worldMatrix);
                    mat4.multiply(matrix, camera.projectionMatrix, matrix);

                    cursor++;

                    this._shadowMapNumber[ light.type ] ++;
                }else if(light.instanceof(PointLight) ){
                    
                    light.shadowMapIndex = cursor;

                    for(var i = 0; i < 6; i++){
                        var target = targets[i];
                        var texture = this._getTexture(light.shadowMapIndex, light, target);
                        var camera = this._getCamera(light.shadowMapIndex, light, target);

                        frameBuffer.attach( renderer.gl, texture );
                        frameBuffer.bind(renderer);

                        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                        renderer._scene = scene;
                        renderer.renderQueue( renderQueue, camera, this._depthMaterial, true );

                        frameBuffer.unbind(renderer);

                        texturesUniform.push( texture );
                        var matrix = matricesUniform[ cursor + i];
                        if( ! matrix){
                            matrix = matricesUniform[ cursor + i] = mat4.create();
                        }
                        mat4.invert(matrix, camera.worldMatrix);
                        mat4.multiply(matrix, camera.projectionMatrix, matrix);
                    }
                    this._shadowMapNumber['POINT_LIGHT']+=6;

                    cursor += 6;
                }
            }, this );
    
            var shadowMapNumber = 0;
            for(var name in this._shadowMapNumber){
                var number = this._shadowMapNumber[name];
                shadowMapNumber += number;
            }
            var shadowFalloffUniform = {
                'spotLightShadowFalloff' : createEmptyArray(this._shadowMapNumber['SPOT_LIGHT'], 1),
                'pointLightShadowFalloff' : createEmptyArray(this._shadowMapNumber['POINT_LIGHT'], 1),
                'directionalLightShadowFalloff' : createEmptyArray(this._shadowMapNumber['DIRECTIONAL_LIGHT'], 1),
            }

            for(var i = 0; i < meshReceiveShadow.length; i++){
                var mesh = meshReceiveShadow[i],
                    material = mesh.material;
                material.setUniform('shadowMap', texturesUniform);
                material.setUniform('shadowCameraMatrix', matricesUniform);

                var shader = material.shader;

                var shaderNeedsUpdate = false;
                for( var name in this._shadowMapNumber ){
                    var number = this._shadowMapNumber[name];
                    var key = name + "_SHADOWMAP_NUMBER";

                    if( shader.fragmentDefines[key] !== number &&
                        number > 0){
                        shader.fragmentDefines[key] = number;
                        shaderNeedsUpdate = true;
                    }
                }
                if( shaderNeedsUpdate){
                    var offset = 0;
                    for(var name in this._shadowMapNumber ){
                        var key = name + "_SHADOWMAP_OFFSET";
                        var number = this._shadowMapNumber[name];
                        shader.fragmentDefines[key] = offset;
                        offset += number;
                    }
                    shader.fragmentDefines['SHADOWMAP_NUMBER'] = shadowMapNumber;
                    shader.update();
                }

                material.setUniforms(shadowFalloffUniform);
            }
            // Save the latest render queue
            this._latestRenderQueue = renderQueue;
        },

        _getTexture : function(key, light, target){
            var texture = this._textures[ key ];
            var resolution = light.shadowResolution || 512;
            var needsUpdate = false;
            if( texture ){ 
                // Cube shadow maps of point light
                if( target ){
                    texture = texture[ target ];
                    if( ! texture){
                        needsUpdate = true;
                    }else{
                        if( texture.width !== resolution){
                            texture.dispose();
                            needsUpdate = true;
                        }
                    }
                }else{
                    if( texture.width !== resolution){
                        texture.dispose();
                        needsUpdate = true;
                    }
                }
            }else{
                needsUpdate = true;
                if( target){
                    this._textures[key] = {};
                }
            }
            if( needsUpdate){
                texture = new Texture2d({
                    width : resolution,
                    height : resolution,
                    type : 'FLOAT'
                })
                if( target ){
                    this._textures[key][target] = texture;
                }else{
                    this._textures[key] = texture;
                }
            }

            return texture;
        },

        _getCamera : function(key, light, target){
            var camera = this._cameras[ key ];
            if( target && ! camera){
                camera = this._cameras[key] = {};
            }
            if( target){
                camera = camera[target];   
            }
            if( ! camera ){
                if( light.instanceof(SpotLight) ||
                    light.instanceof(PointLight) ){
                    
                    camera = new PerspectiveCamera({
                        near : 0.1
                    });
                }else if( light.instanceof(DirectionalLight) ){
                    camera = new OrthoCamera( light.shadowCamera );
                }
                if( target ){
                    this._cameras[key][target] = camera;
                }else{
                    this._cameras[key] = camera;
                }
            }
            if( light.instanceof(SpotLight) ){
                // Update properties
                camera.fov = light.penumbraAngle * 2;
                camera.far = light.range;
            }
            if( light.instanceof(PointLight) ){
                camera.position = light.position;
                camera.far = light.range;
                camera.fov = 90;
                switch(target){
                    case 'px':
                        camera.pitch(Math.PI/2);
                        break;
                    case 'nx':
                        camera.pitch(-Math.PI/2);
                        break;
                    case 'py':
                        camera.roll(-Math.PI/2);
                        break;
                    case 'ny':
                        camera.roll(Math.PI/2);
                        break;
                    case 'nz':
                        camera.pitch(Math.PI);
                    default:
                        break;
                }
                camera.update();

            }else{
                mat4.copy( camera.worldMatrix, light.worldMatrix );
                var m = camera.worldMatrix;
                // Invert x and z axis
                m[0] = -m[0];
                m[1] = -m[1];
                m[2] = -m[2];

                m[8] = -m[8];
                m[9] = -m[9];
                m[10] = -m[10];
            }
            camera.updateProjectionMatrix();

            return camera;
        }
    });
    
    function createEmptyArray(size, value){
        var arr = [];
        for(var i = 0; i < size; i++){
            arr.push(value);
        }
        return arr;
    }
    return ShadowMapPlugin;
} )