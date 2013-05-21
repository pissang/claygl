define( function(require){
    
    var Base = require("core/base");
    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;
    var quat = glMatrix.quat;
    var mat3 = glMatrix.mat3;
    var mat4 = glMatrix.mat4;
    var util = require("util/util");
    var _ = require("_");

    var Node = Base.derive( function(){

        return {
            
            __GUID__ : util.genGUID(),

            visible : true,

            position : vec3.create(),
            // Euler rotate
            rotation : vec3.create(),
            eulerOrder : ["X", "Y", "Z"],

            scale : vec3.fromValues(1, 1, 1),

            up : vec3.fromValues(0, 1, 0),

            quaternion : quat.create(),
            useQuaternion : false,

            children : [],

            parent : null,

            worldMatrix : mat4.create(),
            matrix : mat4.create(),

            autoUpdate : true
        }
    }, {
        x : function(value){
            if( arguments.length === 0 ){
                return this.position[0];
            }
            this.position[0] = value;
            this.dirty("matrix");
            return this;
        },
        y : function(value){
            if( arguments.length === 0 ){
                return this.position[1];
            }
            this.position[1] = value;
            this.dirty("matrix");
            return this;
        },
        z : function(value){
            if( arguments.length === 0 ){
                return this.position[2];
            }
            this.position[2] = value;
            this.dirty("matrix");
            return this;
        },
        // https://en.wikipedia.org/wiki/Rotation_matrix
        roll : function(value){
            if( arguments.length === 0 ){
                return this.rotation[0];
            }
            this.rotation[0] = value;
            this.dirty("matrix");
            return this;
        },
        pitch: function(value){
            if( arguments.length === 0 ){
                return this.rotation[1];
            }
            this.rotation[1] = value;
            this.dirty("matrix");
            return this;
        },
        yaw :function(value){
            if( arguments.length === 0 ){
                return this.rotation[2];
            }
            this.rotation[2] = value;
            this.dirty("matrix");
            return this;
        },

        lookAt : (function(){
            var lookAtMat4 = mat4.create();
            return function( target ){
                mat4.lookAt( lookAtMat4, target, this.position, this.up );

                this.updateFromLookAtMatrix( lookAtMat4 );
            }
        })(),

        updateFromLookAtMatrix : (function(){
            var lookAtMat3 = mat3.create();
            return function( lookAtMat4 ){
                if( this.useQuaternion ){
                    mat3.fromMat4( lookAtMat3, lookAtMat4 );
                    quat.fromMat3( this.quaternion, lookAtMat3 );
                }else{
                    // Euler rotation from matrix decomposition
                    // http://nghiaho.com/?page_id=846
                    // Code is from three.js
                    function clamp( x ) {
                        return Math.min( Math.max( x, -1 ), 1 );
                    }
                    var mat = lookAtMat4;
                    var m11 = mat[0], m12 = mat[1], m13 = mat[2];
                    var m21 = mat[4], m22 = mat[5], m23 = mat[6];
                    var m31 = mat[8], m32 = mat[9], m33 = mat[10];

                    var x,y,z;
                    var order = this.eulerOrder.join("");

                    if ( order === 'XYZ' ) {
                        y = Math.asin( clamp( m13 ) );
                        if ( Math.abs( m13 ) < 0.99999 ) {
                            x = Math.atan2( - m23, m33 );
                            z = Math.atan2( - m12, m11 );
                        } else {
                            x = Math.atan2( m32, m22 );
                            z = 0;
                        }
                    } else if ( order === 'YXZ' ) {
                        x = Math.asin( - clamp( m23 ) );
                        if ( Math.abs( m23 ) < 0.99999 ) {
                            y = Math.atan2( m13, m33 );
                            z = Math.atan2( m21, m22 );
                        } else {
                            y = Math.atan2( - m31, m11 );
                            z = 0;
                        }
                    } else if ( order === 'ZXY' ) {
                        x = Math.asin( clamp( m32 ) );
                        if ( Math.abs( m32 ) < 0.99999 ) {
                            y = Math.atan2( - m31, m33 );
                            z = Math.atan2( - m12, m22 );
                        } else {
                            y = 0;
                            z = Math.atan2( m21, m11 );
                        }
                    } else if ( order === 'ZYX' ) {
                        y = Math.asin( - clamp( m31 ) );
                        if ( Math.abs( m31 ) < 0.99999 ) {
                            x = Math.atan2( m32, m33 );
                            z = Math.atan2( m21, m11 );
                        } else {
                            x = 0;
                            z = Math.atan2( - m12, m22 );
                        }
                    } else if ( order === 'YZX' ) {
                        z = Math.asin( clamp( m21 ) );
                        if ( Math.abs( m21 ) < 0.99999 ) {
                            x = Math.atan2( - m23, m22 );
                            y = Math.atan2( - m31, m11 );
                        } else {
                            x = 0;
                            y = Math.atan2( m13, m33 );
                        }
                    } else if ( order === 'XZY' ) {
                        z = Math.asin( - clamp( m12 ) );
                        if ( Math.abs( m12 ) < 0.99999 ) {
                            x = Math.atan2( m32, m22 );
                            y = Math.atan2( m13, m11 );
                        } else {
                            x = Math.atan2( - m23, m33 );
                            y = 0;
                        }
                    }
                    vec3.set( this.rotation, x, y, z );
                }
                this.dirty("matrix");
            }
        })(),

        add : function( node ){
            if( this.children.indexOf( node ) >= 0 ){
                return;
            }
            this.children.push( node );
            node.parent = this;
        },

        remove : function( node ){
            _.without( this.children, node );
            node.parent = null;
        },

        traverse : function( callback ){
            var stopTraverse = callback && callback( this );
            if( ! stopTraverse ){
                var children = this.children;
                for( var i = 0, len = children.length; i < len; i++){
                    children[i].traverse( callback );
                }
            }
        },

        updateMatrix : (function(){
            
            var quatMat4 = mat4.create();

            return function(){
                var m = this.matrix;

                mat4.identity( m );

                // Transform order, scale->rotation->position
                mat4.translate( m, m, this.position );

                if( this.useQuaternion ){
                    mat4.fromQuat( quatMat4, this.quaternion);
                    mat4.multiply( m, m, quatMat4 );
                }else{
                    for(var i = 0; i<3; i++){
                        var axis = this.eulerOrder[i].toUpperCase();
                        var rotationOrder = ["X", "Y", "Z"];
                        var idx = rotationOrder.indexOf(axis);
                        mat4['rotate'+axis]( m, m, this.rotation[idx] );
                    }
                }

                mat4.scale( m, m, this.scale );
            }
        })(),

        updateWorldMatrix : function(  ){

            if( this.isDirty('matrix') || this.autoUpdate ){
                this.updateMatrix();
                this.fresh('matrix');
            }
            if( this.parent ){
                mat4.multiply( this.worldMatrix, this.parent.worldMatrix, this.matrix );
            }else{
                mat4.copy( this.worldMatrix, this.matrix );
            }
        },
        
        // Update the node status in each frame
        update : function( _gl, silent ){

            if( ! silent){
                this.trigger( 'beforeupdate', _gl );
            }
            this.updateWorldMatrix();
            if( ! silent){
                this.trigger( 'afterupdate', _gl);
            }
            
            for(var i = 0; i < this.children.length; i++){
                var child = this.children[i];
                // Skip the hidden nodes
                if( child.visible ){
                    child.update( _gl );
                }
            }
        },

        getWorldPosition : function(){
            
            var m = this.worldMatrix;

            // [0]  [4]  [8]   [12]
            // [1]  [5]  [9]   [13]
            // [2]  [6]  [10]  [14]
            // [3]  [7]  [11]  [15]
            return vec3.fromValues( m[12], m[13], m[14])
        }
    });
    
    return Node;
})