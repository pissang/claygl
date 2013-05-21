/**
 * @export{class} RenderInfo
 */
define( function(require){

    var Base = require("core/base");

    var RenderInfo = Base.derive( function(){
        return {
            renderer : null,

            frameTime : 0,

            vertexNumber : 0,

            faceNumber : 0,

            drawcallNumber : 0,

            meshNumber : 0,

            _startTime : 0
        }
    }, {
        enable : function(){
            this.renderer.on("beforerender", this._beforeRender, this);
            this.renderer.on("afterrender", this._afterRender, this);
            this.renderer.on("afterrender:mesh", this._afterRenderMesh, this);
        },
        disable : function(){
            this.renderer.off("beforerender", this._beforeRender);
            this.renderer.off("afterrender", this._afterRender);
            this.renderer.off("afterrender:mesh", this._afterRenderMesh);
        },
        clear : function(){
            this.vertexNumber = 0;
            this.faceNumber = 0;
            this.drawcallNumber = 0;
            this.meshNumber = 0;
            this.frameTime = 0;
        },
        _beforeRender : function(){
            this.clear();

            this._startTime = new Date().getTime();
        },

        _afterRender : function(){
            var endTime = new Date().getTime();

            this.frameTime = endTime - this._startTime;
        },

        _afterRenderMesh : function(_gl, drawInfo){
            this.vertexNumber += drawInfo.vertexNumber;
            this.faceNumber += drawInfo.faceNumber;
            this.drawcallNumber += drawInfo.drawcallNumber;
            this.meshNumber ++;
        }
    })

    return RenderInfo;
} )