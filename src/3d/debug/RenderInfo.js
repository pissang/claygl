define(function(require) {

    var Base = require("core/Base");

    var RenderInfo = Base.derive(function() {
        return {
            renderer : null,
            scene : null,
            shadowPass : null,

            _ctx2d : null,

            log : {
                vertexNumber : 0,
                faceNumber : 0,
                drawCallNumber : 0,
                meshNumber : 0,
                renderTime : 0,
                sceneUpdateTime : 0,
                shadowPassTime : 0
            },
            _shadowPassStartTime : 0,
            _sceneUpdateStartTime : 0,
            _renderStartTime : 0
        }
    }, {
        enable : function() {
            this.renderer.on("beforerender", this._beforeRender, this);
            this.renderer.on("afterrender", this._afterRender, this);
            this.renderer.on("afterrender:mesh", this._afterRenderMesh, this);

            if (this.scene) {
                this.scene.on("beforeupdate", this._beforeUpdateScene, this);
                this.scene.on("afterupdate", this._afterUpdateScene, this);
            }
            if (this.shadowPass) {
                this.shadowPass.on('beforerender', this._beforeShadowPass, this);
                this.shadowPass.on('afterrender', this._afterShadowPass, this);
            }
        },
        disable : function() {
            this.renderer.off("beforerender", this._beforeRender);
            this.renderer.off("afterrender", this._afterRender);
            this.renderer.off("afterrender:mesh", this._afterRenderMesh);
            if (this.scene) {
                this.scene.off("beforeupdate", this._beforeUpdateScene);
                this.scene.off("afterupdate", this._afterUpdateScene);
            }
            if (this.shadowPass) {
                this.shadowPass.off('beforerender', this._beforeShadowPass);
                this.shadowPass.off('afterrender', this._afterShadowPass);
            }
        },

        clear : function() {
            this.log.vertexNumber = 0;
            this.log.faceNumber = 0;
            this.log.drawCallNumber = 0;
            this.log.meshNumber = 0;
            this.log.renderTime = 0;
            this.log.sceneUpdateTime = 0;
            this.log.shadowPassTime = 0;
        },

        draw : function() {
            var ctx = this._ctx2d;
            if (!ctx) {
                return;
            }
            ctx.strokeStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText('Vertices : ' + this.log.vertexNumber, 10, 10);
            ctx.fillText('Faces : ' + this.log.faceNumber, 10, 30);
            ctx.fillText('Meshes : ' + this.log.meshNumber, 10, 70);
            ctx.fillText('Draw Calls : ' + this.log.drawCallNumber, 10, 90);
            ctx.fillText('Render Time : ' + this.log.renderTime.toFixed(2) + 'ms', 10, 110);
            ctx.fillText('Scene Update Time : ' + this.log.sceneUpdateTime.toFixed(2) + 'ms', 10, 130);
            ctx.fillText('Shadow Pass Time : ' + this.log.shadowPassTime.toFixed(2) + 'ms', 10, 150);
        },

        _beforeRender : function() {
            this._renderStartTime = performance.now();
        },

        _afterRender : function() {
            var endTime = performance.now();
            this.log.renderTime += endTime - this._renderStartTime;
        },

        _beforeUpdateScene : function() {
            this._sceneUpdateStartTime = performance.now();
        },

        _afterUpdateScene : function() {
            var endTime = performance.now();
            this.log.sceneUpdateTime += endTime - this._sceneUpdateStartTime;
        },

        _beforeShadowPass : function() {
            this._shadowPassStartTime = performance.now();
        },

        _afterShadowPass : function() {
            var endTime = performance.now();
            this.log.shadowPassTime += endTime - this._shadowPassStartTime;
        },

        _afterRenderMesh : function(renderer, mesh, drawInfo) {
            this.log.vertexNumber += drawInfo.vertexNumber;
            this.log.faceNumber += drawInfo.faceNumber;
            this.log.drawCallNumber += drawInfo.drawCallNumber;
            this.log.meshNumber ++;
        }
    })

    return RenderInfo;
} )