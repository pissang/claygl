define(function(require) {

    var Base = require('core/Base');
    var Layer = require('./Layer');
    var Animation = require('animation/Animation');
    var QEvent = require('core/Event');

    var Scene3D = require('3d/Scene');
    var Scene2D = require('2d/Scene');
    var Renderer3D = require('3d/Renderer');
    var Renderer2D = require('2d/Renderer');
    var Camera3D = require('3d/camera');
    var Camera2D = require('2d/camera');

    var Stage = Base.derive(function() {
        return {
            container : null,

            width : 100,
            height : 100,

            _layers : [],

            _layersSorted : [],

            _mouseOverEl : null
        }
    }, function() {
        
        if (!this.container) {
            this.container = document.createElement('div');
        }
        if (this.container.style.position !== 'absolute' &&
            this.container.style.position !== 'fixed') {
            this.container.style.position = 'relative';
        }

        if (this.width) {
            this.container.style.width = this.width + 'px';
        } else {
            this.width = this.container.clientWidth;
        }
        if (this.height) {
            this.container.style.height = this.height + 'px';
        } else {
            this.height = this.container.clientHeight;
        }

        this.container.addEventListener("click", this._eventProxy.bind(this, 'click'));
        this.container.addEventListener("dblclick", this._eventProxy.bind(this, 'dblclick'));
        this.container.addEventListener("mousemove", this._mouseMoveHandler.bind(this));
        this.container.addEventListener("mousedown", this._eventProxy.bind(this, 'mousedown'));
        this.container.addEventListener("mouseup", this._eventProxy.bind(this, 'mouseup'));
        this.container.addEventListener("mouseout", this._mouseOutHandler.bind(this));

        this.animation = new Animation();
        this.animation.start();

        this.animation.on('frame', function() {
            this.trigger('frame');
        }, this);
    }, {

        /**
         * Create a new 2d layer
         * @param {qtek.2d.Renderer} [renderer]
         * @param {qtek.2d.Scene} [scene]
         * @param {qtek.2d.Camera} [camera]
         * @return {qtek.Layer}
         */
        create2DLayer : function(options) {
            options = options || {};
            options.renderer = options.renderer || new Renderer2D();
            options.camera = options.camera || new Camera2D();
            options.scene = options.scene || new Scene2D();

            var layer = new Layer(options);
            this.addLayer(layer);

            return layer;
        },

        /**
         * Create a new 3d layer
         * @param {qtek.3d.Renderer} [renderer]
         * @param {qtek.3d.Scene} [scene]
         * @param {qtek.3d.Camera} [camera]
         * @return {qtek.Layer}
         */
        create3DLayer : function(options) {
            options = options || {};
            options.renderer = options.renderer || new Renderer3D();
            options.camera = options.camera || new Camera3D();
            options.scene = options.scene || new Scene3D();

            var layer = new Layer(options);
            this.addLayer(layer);

            return layer;
        },

        addLayer : function(layer) {
            if (!layer.renderer) {
                console.warn('Layer don\'t have renderer');
                return;
            } else if (!layer.renderer.canvas) {
                console.warn('Layer renderer don\'t have canvas');
                return;
            }
            var canvas = layer.renderer.canvas;

            layer.renderer.resize(this.width, this.height);

            canvas.style.position = 'absolute';
            canvas.style.left = '0px';
            canvas.style.top = '0px';

            this.container.appendChild(canvas);

            this._layers.push(layer);
            this._layersSorted = this._layers.slice().sort(function(a, b){
                if (a.z === b.z)
                    return a.__GUID__ > b.__GUID__ ? 1 : -1;
                return a.z > b.z ? 1 : -1 ;
            });
        },

        removeLayer : function(layer) {
            this._layers.splice(this._layers.indexOf(layer), 1);

            this.container.removeChild(layer.canvas);
        },

        resize : function(width, height) {
            this.width = width;
            this.height = height;

            for (var i = 0; i < this._layers.length; i++) {
                this._layers[i].resize(width, height);
            }
        },

        render : function() {
            for (var i = 0; i < this._layers.length; i++) {
                this._layers[i].render();
            }
        },

        _eventProxy : function(type, e) {
            var el = this._findTrigger(e);
            if (el) {
                QEvent.throw(type, el, this._assembleEvent(e));
            }
        },

        _mouseMoveHandler : function(e) {
            var el = this._findTrigger(e);
            if (el) {
                QEvent.throw('mousemove', el, this._assembleEvent(e));
            }

            if (this._mouseOverEl !== el) {
                if (this._mouseOverEl) {
                    QEvent.throw('mouseout', this._mouseOverEl, this._assembleEvent(e));
                }
                if (el) {
                    QEvent.throw('mouseover', el, this._assembleEvent(e));
                }
                this._mouseOverEl = el;
            }
        },

        _mouseOutHandler : function(e) {
            if (this._mouseOverEl) {
                QEvent.throw('mouseout', this._mouseOverEl, this._assembleEvent(e));
            }
        },

        _findTrigger : function(e) {
            var container = this.container;
            var clientRect = container.getBoundingClientRect();
            var x = e.pageX - clientRect.left - document.body.scrollLeft;
            var y = e.pageY - clientRect.top - document.body.scrollTop;

            for (var i = this._layersSorted.length - 1; i >= 0 ; i--) {
                var layer = this._layersSorted[i];
                var el = layer.pick(x, y);
                if (el) {
                    return el;
                }
            }
        },

        _assembleEvent : function(e){
            return {
                pageX : e.pageX,
                pageY : e.pageY
            }
        }

    });

    return Stage;
})