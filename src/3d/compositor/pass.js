define( function(require){

    var Base = require("core/base");
    var Scene = require("../scene");
    var OrthoCamera = require('../camera/orthographic');
    var Plane = require('../geometry/plane');
    var Shader = require('../shader');
    var Material = require('../material');
    var Mesh = require('../mesh');
    var Scene = require('../scene');
    var vertexShaderString = require("text!./shaders/vertex.essl");

    var planeGeo = new Plane();
    var mesh = new Mesh({
            geometry : planeGeo
        });
    var scene = new Scene();
    var camera = new OrthoCamera();
        
    scene.add(mesh);

    var Pass = Base.derive( function(){
        return {
            // Fragment shader string
            fragment : "",

            output : null,

            _material : null

        }
    }, function(){

        var shader = new Shader({
            vertex : vertexShaderString,
            fragment : this.fragment
        })
        var material = new Material({
            shader : shader
        });
        shader.enableTexturesAll();

        this._material = material;

    }, {

        setUniform : function(name, value){
            
            var uniform = this._material.uniforms[name];
            if( uniform ){
                uniform.value = value;
            }else{
                // console.warn('Unkown uniform "' + name + '"');
            }
        },

        bind : function( renderer, frameBuffer ){
            
            if( this.output ){

                frameBuffer.attach( renderer.gl, this.output );
                frameBuffer.bind( renderer );
            }
        },

        unbind : function( renderer, frameBuffer ){
            frameBuffer.unbind( renderer );
        },

        render : function( renderer, frameBuffer ){

            mesh.material = this._material;

            if( frameBuffer ){
                this.bind( renderer, frameBuffer );
            }
            renderer.render( scene, camera );
            if( frameBuffer ){
                this.unbind( renderer, frameBuffer );
            }
        }
    } )

    // Some build in shaders
    Shader.import( require('text!./shaders/coloradjust.essl') );
    Shader.import( require('text!./shaders/blur.essl') );

    return Pass;
} )