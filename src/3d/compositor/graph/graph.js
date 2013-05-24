define( function( require ){

    var Base = require("core/base");
    var _ = require("_");

    var Graph = Base.derive( function(){
        return {

            _nodes : [],

            _finalNode : null
        }
    }, {

        
        add : function( node ){

            this._nodes.push( node );

            this.dirty("graph");
        },

        remove : function( node ){
            _.without( this._nodes, node );
            this.dirty("graph");
        },

        update : function(){
            for(var i = 0; i < this._nodes.length; i++){
                this._nodes[i].clear();
            }
            // Traverse all the nodes and build the graph
            for(var i = 0; i < this._nodes.length; i++){
                var node = this._nodes[i];

                if( ! node.inputs){
                    continue;
                }
                for(var inputName in node.inputs){
                    var fromPinInfo = node.inputs[ inputName ];

                    var fromPin = this.findPin( fromPinInfo );
                    if( fromPin ){
                        node.link( inputName, fromPin.node, fromPin.pin );
                    }else{
                        console.warn("Pin of "+fromPinInfo.node+"."+fromPinInfo.pin+" not exist");
                    }
                }
                if( ! node.outputs ){
                    this._finalNode = node;
                }
            }

        },

        findPin : function( info ){
            var node;
            if( typeof(info.node) === 'string'){
                for( var i = 0; i < this._nodes.length; i++){
                    var tmp = this._nodes[i];
                    if( tmp.name === info.node ){
                        node = tmp;
                    }
                }
            }else{
                node = info.node;
            }
            if( node ){
                if( node.outputs[info.pin] ){
                    return {
                        node : node,
                        pin : info.pin
                    }
                }
            }
        },

        load : function( json ){

        },

        render : function( renderer ){
            if( this.isDirty("graph") ){
                this.update();
                this.fresh("graph");
            }
            for(var i = 0; i < this._nodes.length; i++){
                this._nodes[i].updateReference();
            }
            if( this._finalNode ){
                this._finalNode.render( renderer );
            }
        }
    })
    
    return Graph;
})