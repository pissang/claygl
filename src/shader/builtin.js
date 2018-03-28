import lightEssl from './source/header/light';
import utilEssl from './source/util.glsl.js';

import basicEssl from './source/basic.glsl.js';
import lambertEssl from './source/lambert.glsl.js';
import standardEssl from './source/standard.glsl.js';
import wireframeEssl from './source/wireframe.glsl.js';
import skyboxEssl from './source/skybox.glsl.js';
import prezEssl from './source/prez.glsl.js';

import library from './library';
import Shader from '../Shader';


Shader['import'](lightEssl);
Shader['import'](utilEssl);

// Some build in shaders
Shader['import'](basicEssl);
Shader['import'](lambertEssl);
Shader['import'](standardEssl);
Shader['import'](wireframeEssl);
Shader['import'](skyboxEssl);
Shader['import'](prezEssl);

library.template('clay.basic', Shader.source('clay.basic.vertex'), Shader.source('clay.basic.fragment'));
library.template('clay.lambert', Shader.source('clay.lambert.vertex'), Shader.source('clay.lambert.fragment'));
library.template('clay.wireframe', Shader.source('clay.wireframe.vertex'), Shader.source('clay.wireframe.fragment'));
library.template('clay.skybox', Shader.source('clay.skybox.vertex'), Shader.source('clay.skybox.fragment'));
library.template('clay.prez', Shader.source('clay.prez.vertex'), Shader.source('clay.prez.fragment'));
library.template('clay.standard', Shader.source('clay.standard.vertex'), Shader.source('clay.standard.fragment'));
library.template('clay.standardMR', Shader.source('clay.standardMR.vertex'), Shader.source('clay.standardMR.fragment'));

// TODO Must export a module and be used in the other modules. Or it will be tree shaked
export default library;