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


import coloradjustEssl from './source/compositor/coloradjust.glsl.js';
import blurEssl from './source/compositor/blur.glsl.js';
import lumEssl from './source/compositor/lum.glsl.js';
import lutEssl from './source/compositor/lut.glsl.js';
import vigentteEssl from './source/compositor/vignette.glsl.js';
import outputEssl from './source/compositor/output.glsl.js';
import brightEssl from './source/compositor/bright.glsl.js';
import downsampleEssl from './source/compositor/downsample.glsl.js';
import upsampleEssl from './source/compositor/upsample.glsl.js';
import hdrEssl from './source/compositor/hdr.glsl.js';
import dofEssl from './source/compositor/dof.glsl.js';
import lensflareEssl from './source/compositor/lensflare.glsl.js';
import blendEssl from './source/compositor/blend.glsl.js';

import fxaaEssl from './source/compositor/fxaa.glsl.js';
import fxaa3Essl from './source/compositor/fxaa3.glsl.js';

// Some build in shaders
Shader['import'](coloradjustEssl);
Shader['import'](blurEssl);
Shader['import'](lumEssl);
Shader['import'](lutEssl);
Shader['import'](vigentteEssl);
Shader['import'](outputEssl);
Shader['import'](brightEssl);
Shader['import'](downsampleEssl);
Shader['import'](upsampleEssl);
Shader['import'](hdrEssl);
Shader['import'](dofEssl);
Shader['import'](lensflareEssl);
Shader['import'](blendEssl);

Shader['import'](fxaaEssl);
Shader['import'](fxaa3Essl);
