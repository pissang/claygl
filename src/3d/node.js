define( function(require){
    
    var Base = require("core/base");
    var Vector3 = require("core/vector3");
    var Quaternion = require("core/quaternion");
    var Matrix4 = require("core/matrix4");
    var Matrix3 = require("core/matrix3");
    var util = require("util/util");
    var _ = require("_");

    var Node = Base.derive( function(){

        return {
            
            __GUID__ : util.genGUID(),

            visible : true,

            position : new Vector3(),

            rotation : new Quaternion(),

            scale : new Vector3(1, 1, 1),

            up : new Vector3(0, 1, 0),

            // Euler angles
            // https://en.wikipedia.org/wiki/Rotation_matrix
            eulerAngle : new Vector3(),
            useEuler : false,

            children : [],

            parent : null,

            worldMatrix : new Matrix4(),
            matrix : new Matrix4(),

        }
    }, {

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

        lookAt : (function(){
            var m = new Matrix4();
            return function( target ){
                m.lookAt(this.position, target, this.up ).invert();
                this.updateFromLookAtMatrix( m );
            }
        })(),

        updateFromLookAtMatrix : (function(){

            var lookAtMat3 = new Matrix3();
            var scaleVector = new Vector3();
            return function(m){
                
                m.decomposeMatrix(scaleVector, this.rotation, this.position);

                if( ! this.useEuler){
                    this.eulerAngle.setEulerFromQuaternion(this.rotation);
                }
            }
        })(),

        updateMatrix : function(){
            var m = this.matrix;

            m.identity();

            if( this.useEuler ){
                this.rotation.identity();
                this.rotation.rotateX( this.eulerAngle.x );
                this.rotation.rotateY( this.eulerAngle.y );
                this.rotation.rotateZ( this.eulerAngle.z );
            }
            // Transform order, scale->rotation->position
            m.fromRotationTranslation(this.rotation, this.position);

            m.scale(this.scale);
        },

        decomposeMatrix : function(){
            this.matrix.decomposeMatrix( this.scale, this.rotation, this.position );
        },

        updateWorldMatrix : function(  ){

            this.updateMatrix();
            if( this.parent ){
                this.worldMatrix.copy(this.parent.worldMatrix).multiply(this.matrix);
            }else{
                this.worldMatrix.copy(this.matrix);
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
            return new Vector3(m[12], m[13], m[14]);
        },

        rotateAround : (function(){
            var v = new Vector3();
            var rotateMat = new Matrix4();
            return function(point, axis, angle){
                v.copy(point).substract(this.position);

            }
        })()
    });


    return Node;
})