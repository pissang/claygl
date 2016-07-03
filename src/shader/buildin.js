define(function (require) {

    var library = require('./library');
    var Shader = require('../Shader');


    Shader['import'](require('./source/util.essl'));

    // Some build in shaders
    Shader['import'](require('./source/basic.essl'));
    Shader['import'](require('./source/lambert.essl'));
    Shader['import'](require('./source/phong.essl'));
    Shader['import'](require('./source/standard.essl'));
    Shader['import'](require('./source/wireframe.essl'));
    Shader['import'](require('./source/skybox.essl'));
    Shader['import'](require('./source/prez.essl'));

    Shader['import'](require('./source/shadowmap.essl'));

    library.template('buildin.basic', Shader.source('buildin.basic.vertex'), Shader.source('buildin.basic.fragment'));
    library.template('buildin.lambert', Shader.source('buildin.lambert.vertex'), Shader.source('buildin.lambert.fragment'));
    library.template('buildin.phong', Shader.source('buildin.phong.vertex'), Shader.source('buildin.phong.fragment'));
    library.template('buildin.wireframe', Shader.source('buildin.wireframe.vertex'), Shader.source('buildin.wireframe.fragment'));
    library.template('buildin.skybox', Shader.source('buildin.skybox.vertex'), Shader.source('buildin.skybox.fragment'));
    library.template('buildin.prez', Shader.source('buildin.prez.vertex'), Shader.source('buildin.prez.fragment'));
    library.template('buildin.standard', Shader.source('buildin.standard.vertex'), Shader.source('buildin.standard.fragment'));
    // Compatible with previous
    library.template('buildin.physical', Shader.source('buildin.physical.vertex'), Shader.source('buildin.physical.fragment'));

    // Some build in shaders
    Shader['import'](require('./source/compositor/coloradjust.essl'));
    Shader['import'](require('./source/compositor/blur.essl'));
    Shader['import'](require('./source/compositor/lum.essl'));
    Shader['import'](require('./source/compositor/lut.essl'));
    Shader['import'](require('./source/compositor/output.essl'));
    Shader['import'](require('./source/compositor/hdr.essl'));
    Shader['import'](require('./source/compositor/lensflare.essl'));
    Shader['import'](require('./source/compositor/blend.essl'));
    Shader['import'](require('./source/compositor/fxaa.essl'));

});