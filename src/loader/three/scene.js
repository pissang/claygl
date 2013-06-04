define(function(require){

    var Base = require("core/base");
    var request = require("core/request");
    var Scene = require("3d/scene");
    var Model = require("./model");
    var AmbientLight = require("3d/light/ambient");
    var DirectionalLight = require("3d/light/directional");
    var SpotLight = require("3d/light/spot");
    var PointLight = require("3d/light/point");
    var Node = require("3d/node");
    var Texture2D = require("3d/texture/texture2d");
    var TextureCube = require("3d/texture/texturecube");
    var Mesh = require("3d/mesh");
    var Material = require("3d/material");
    var Geometry = require("3d/geometry");

    var SceneLoader = Base.derive(function(){
        return {
            textureRootPath : "",
            textureNumber : 0
        }
    }, {

        load : function(url){
            var self = this;

            this.textureNumber = 0;

            request.get({
                url : url,
                onprogress : function(percent, loaded, total){
                    self.trigger("progress", percent, loaded, total);
                },
                onerror : function(e){
                    self.trigger("error", e);
                },
                responseType : "text",
                onload : function(data){
                    self.parse( JSON.parse(data) );
                }
            })
        },
        parse : function(data){
            var scene = new Scene();
            this.parseHierarchy(root, scene);
        },

        parseHierarchy : function(parentObjData, parentNode){
            
            for(var name in parentObjData){
                var childData = parentObjData[name];
                if(childData.geometry && childData.material){
                    var child = new Mesh();
                }else{
                    var child = new Node();
                }
            }
        }
    })
})