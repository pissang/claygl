define({

    dirty : function(propName) {
        if (!this._dirtyFlag) {
            this._dirtyFlag = {};
        }
        this._dirtyFlag[propName] = true;
    },
    
    fresh : function(propName) {
        if (!this._dirtyFlag) {
            this._dirtyFlag = {};
        }
        this._dirtyFlag[propName] = false;
    },
    
    isDirty : function(propName) {
        if (!this._dirtyFlag) {
            this._dirtyFlag = {};
        }
        if (typeof(this._dirtyFlag[propName]) === "undefined") {
            return true;
        }
        return this._dirtyFlag[propName];
    },

})