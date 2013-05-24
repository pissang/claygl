/**
 * @export{class} ShadowMap
 */
define( function(require){

    var Base = require("core/base");
    var Vector3 = require("core/vector3");
    var Shader = require("../shader");
    var Light = require("../light");
    var SpotLight = require("../light/spot");
    var DirectionalLight = require("../light/directional");
    var PointLight = require("../light/point");
    var shaderLibrary = require("../shader/library");
    var Material = require("../material");
    var FrameBuffer = require("../framebuffer");
    var Texture2d = require("../texture/texture2d");
    var TextureCube = require("../texture/texturecube");
    var PerspectiveCamera = require("../camera/perspective");
    var OrthoCamera = require("../camera/orthographic");

    var Matrix4 = require("core/matrix4");

    var _ = require("_");

    var frameBuffer = new FrameBuffer();

    Shader.import( require('text!./vsm.essl') );

    var ShadowMapPlugin = Base.derive(function(){
        return {

            technique : "VSM",  //"NORMAL", "PCF", "VSM"

            _textures : {},

            _cameras : {},

            _shadowMapNumber : {
                'POINT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 0,
                'SPOT_LIGHT' : 0
            },
            _shadowMapOrder : {
                'SPOT_LIGHT' : 0,
                'DIRECTIONAL_LIGHT' : 1,
                'SPOT_LIGHT' : 2
            }

        }
    }, function(){
        if( this.technique == "VSM"){
            this._depthMaterial =  new Material({
                shader : new Shader({
                    vertex : Shader.source("buildin.vsm.depth.vertex"),
                    fragment : Shader.source("buildin.vsm.depth.fragment")
                })
            });
            // Point light write the distance instance of depth projected
            // http://http.developer.nvidia.com/GPUGems/gpugems_ch12.html
            this._pointLightDepthMaterial = new Material({
                shader : new Shader({
                    vertex : Shader.source("buildin.vsm.distance.vertex"),
                    fragment : Shader.source("buildin.vsm.distance.fragment")
                })
            })
        }else{
            this._depthMaterial = new Material({
                shader : new Shader({
                    vertex : Shader.source("buildin.sm.depth.vertex"),
                    fragment : Shader.source("buildin.sm.depth.fragment")
                })
            })
            this._pointLightDepthMaterial = new Material({
                shader : new Shader({
                    vertex : Shader.source("buildin.sm.distance.vertex"),
                    fragment : Shader.source("buildin.sm.distance.fragment")
                })
            })
        }
    }, {

        render : function( renderer, scene ){
            this._renderShadowPass( renderer, scene );
        },

        _renderShadowPass : function( renderer, scene ){

            var renderQueue = [],
                lightCastShadow = [],
                meshReceiveShadow = [];

            var _gl = renderer.gl;

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

                        node.material.setUniform("shadowEnabled", 1);
                    }else{
                        node.material.setUniform("shadowEnabled", 0);
                    }
                };
            } );

            _gl.enable( _gl.DEPTH_TEST );
            _gl.disable( _gl.BLEND );

            _gl.clearColor(0.0, 0.0, 0.0, 0.0);
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            var targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
            var targetMap = {
                'px' : 'TEXTURE_CUBE_MAP_POSITIVE_X',
                'py' : 'TEXTURE_CUBE_MAP_POSITIVE_Y',
                'pz' : 'TEXTURE_CUBE_MAP_POSITIVE_Z',
                'nx' : 'TEXTURE_CUBE_MAP_NEGATIVE_X',
                'ny' : 'TEXTURE_CUBE_MAP_NEGATIVE_Y',
                'nz' : 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
            }
            var cursor = 0;

            // Shadow uniforms
            var spotLightShadowMaps = [],
                spotLightMatrices = [],
                directionalLightShadowMaps = [],
                directionalLightMatrices = [],
                pointLightShadowMaps = [];

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
                    
                    var texture = this._getTexture(light.__GUID__, light);
                    var camera = this._getCamera(light.__GUID__, light);

                    frameBuffer.attach( renderer.gl, texture );
                    frameBuffer.bind(renderer);

                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                    renderer._scene = scene;
                    renderer.renderQueue( renderQueue, camera, this._depthMaterial, true );

                    frameBuffer.unbind(renderer);
        
                    var matrix = new Matrix4();
                    matrix.copy(camera.worldMatrix)
                        .invert()
                        .multiplyLeft(camera.projectionMatrix);

                    if( light.instanceof(SpotLight) ){
                        spotLightShadowMaps.push(texture);
                        spotLightMatrices.push(matrix._array);
                    }else{
                        directionalLightShadowMaps.push(texture);
                        directionalLightMatrices.push(matrix._array);
                    }

                }else if(light.instanceof(PointLight) ){
                    
                    var texture = this._getTexture(light.__GUID__, light);
                    pointLightShadowMaps.push( texture );

                    for(var i = 0; i < 6; i++){
                        var target = targets[i];
                        var camera = this._getCamera(light.__GUID__, light, target);

                        frameBuffer.attach( renderer.gl, texture, 'COLOR_ATTACHMENT0', targetMap[target] );
                        frameBuffer.bind(renderer);

                        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

                        renderer._scene = scene;
                        this._pointLightDepthMaterial.setUniform("lightPosition", light.position._array);
                        renderer.renderQueue( renderQueue, camera, this._pointLightDepthMaterial, true );

                        frameBuffer.unbind(renderer);
                    }

                }

                this._shadowMapNumber[ light.type ] ++;
            }, this );

            for(var i = 0; i < meshReceiveShadow.length; i++){
                var mesh = meshReceiveShadow[i],
                    material = mesh.material;

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
                    shader.update();
                }

                material.setUniforms({
                    "spotLightShadowMap" : spotLightShadowMaps,
                    "directionalLightShadowMap" : directionalLightShadowMaps,
                    "directionalLightMatrix" : directionalLightMatrices,
                    "pointLightShadowMap" : pointLightShadowMaps,
                    "spotLightMatrix" : spotLightMatrices,
                });
            }
        },

        _getTexture : function(key, light){
            var texture = this._textures[ key ];
            var resolution = light.shadowResolution || 512;
            var needsUpdate = false;
            if( texture ){
                if( texture.width !== resolution){
                    texture.dispose();
                    needsUpdate = true;
                }
            }else{
                needsUpdate = true;
            }
            if( needsUpdate){
                if( light.instanceof(PointLight) ){
                    texture = new TextureCube({
                        width : resolution,
                        height : resolution,
                        type : 'FLOAT'
                    })
                }else{
                    texture = new Texture2d({
                        width : resolution,
                        height : resolution,
                        type : 'FLOAT'
                    })   
                }
                this._textures[key] = texture;
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
                camera.far = light.range;
                camera.fov = 90;

                camera.position.set(0, 0, 0);
                switch(target){
                    case 'px':
                        camera.up.set(0, -1, 0);
                        camera.lookAt( new Vector3(1, 0, 0) );
                        break;
                    case 'nx':
                        camera.up.set(0, -1, 0);
                        camera.lookAt( new Vector3(-1, 0, 0) );
                        break;
                    case 'py':
                        camera.up.set(0, 0, 1);
                        camera.lookAt( new Vector3(0, 1, 0) );
                        break;
                    case 'ny':
                        camera.up.set(0, 0, -1);
                        camera.lookAt( new Vector3(0, -1, 0) );
                        break;
                    case 'pz':
                        camera.up.set(0, -1, 0);
                        camera.lookAt( new Vector3(0, 0, 1) );
                    case 'nz':
                        camera.up.set(0, -1, 0);
                        camera.lookAt( new Vector3(0, 0, -1) );
                        break;
                }
                camera.position.copy( light.position );
                camera.update();

            }else{
                camera.worldMatrix.copy(light.worldMatrix);
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