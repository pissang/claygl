define(function(require){

    var Node = require("./node");
    var Quaternion = require("core/quaternion");
    var Vector3 = require("core/vector3");
    var Matrix4 = require("core/matrix4");
    
    var Bone = Node.derive(function(){
        return {
            // Index of bone
            index : -1,
            // Parent bone index
            parentIndex : -1,
            //{
            //  time : 
            //  position : 
            //  rotation :
            //  scale
            //}
            poses : []
        }
    }, {

        setPose : function(time){

            this._lerpField(time, 'position');
            this._lerpField(time, 'rotation');
            this._lerpField(time, 'scale');

        },

        _lerpField : function(time, fieldName){
            var poses = this.poses,
                len = poses.length,
                start,
                end;
            for(var i = 0; i < len; i++){
                if(poses[i].time <= time && poses[i][fieldName]){
                    start = poses[i];
                    break;
                }
            }
            i++;
            for(; i < len; i++){
                if(poses[i].time >= time && poses[i][fieldName]){
                    end = poses[i];
                    break;
                }
            }
            if(start && end){
                var percent = (time-start.time) / (end.time-start.time);
                percent = Math.max(Math.min(percent, 1), 0);
                if( fieldName === "rotation"){
                    this[fieldName].slerp(start[fieldName], end[fieldName], percent);
                }else{
                    this[fieldName].lerp(start[fieldName], end[fieldName], percent);
                }
            }
        }
    });

    return Bone;
})