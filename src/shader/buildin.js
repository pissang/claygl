define(function (require) {

    var library = require('./library');
    var Shader = require('../Shader');


    Shader['import'](require('text!./source/util.essl'));

    // Some build in shaders
    Shader['import'](require('text!./source/basic.essl'));
    Shader['import'](require('text!./source/lambert.essl'));
    Shader['import'](require('text!./source/phong.essl'));
    Shader['import'](require('text!./source/standard.essl'));
    Shader['import'](require('text!./source/wireframe.essl'));
    Shader['import'](require('text!./source/skybox.essl'));
    Shader['import'](require('text!./source/prez.essl'));

    Shader['import'](require('text!./source/shadowmap.essl'));

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
    Shader['import'](require('text!./source/compositor/coloradjust.essl'));
    Shader['import'](require('text!./source/compositor/blur.essl'));
    Shader['import'](require('text!./source/compositor/lum.essl'));
    Shader['import'](require('text!./source/compositor/lut.essl'));
    Shader['import'](require('text!./source/compositor/output.essl'));
    Shader['import'](require('text!./source/compositor/hdr.essl'));
    Shader['import'](require('text!./source/compositor/lensflare.essl'));
    Shader['import'](require('text!./source/compositor/blend.essl'));
    Shader['import'](require('text!./source/compositor/fxaa.essl'));

});