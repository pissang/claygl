const clay = require('../../dist/claygl');
const assert = require('assert');
const Shader = clay.Shader;

const dummyShaderCode = `
void main() {}
`;

describe('Shader.Spec', function () {
    it('parse uniforms', function () {
        const shader = new Shader(
            dummyShaderCode,
            `
            uniform float a;
            uniform vec2 b;
            uniform vec3 c;
            uniform mat2 d;
            uniform mat3 e;
            uniform mat4 f;
            uniform bool g;
            uniform sampler2D m;
            uniform samplerCube n;
            `
        );
        assert.equal(shader.uniformTemplates.a.type, '1f');
        assert.equal(shader.uniformTemplates.b.type, '2f');
        assert.equal(shader.uniformTemplates.c.type, '3f');
        assert.equal(shader.uniformTemplates.d.type, 'm2');
        assert.equal(shader.uniformTemplates.e.type, 'm3');
        assert.equal(shader.uniformTemplates.f.type, 'm4');
        assert.equal(shader.uniformTemplates.g.type, '1i');
        assert.equal(shader.uniformTemplates.m.type, 't');
        assert.equal(shader.uniformTemplates.n.type, 't');
    });

    it('parse default uniform value', function () {
        const shader = new Shader(
            dummyShaderCode,
            `
            uniform float alpha = 1;
            uniform float beta : 2;
            uniform vec3 gamma = vec3(2, 2, 2);
            `
        );
        assert.equal(shader.uniformTemplates.alpha.value(), 1);
        assert.equal(shader.uniformTemplates.beta.value(), 2);
        assert.deepEqual(shader.uniformTemplates.gamma.value(), [2, 2, 2]);
    });

    it('parse multiple uniform declarations', function () {
        const shader = new Shader(
            dummyShaderCode,
            `
            uniform float alpha = 1, beta = 2;
            uniform vec3 gamma = vec3(2, 2, 2), omega = vec3(3, 3, 3);
            `
        );
        assert.equal(shader.uniformTemplates.alpha.type, '1f');
        assert.equal(shader.uniformTemplates.alpha.value(), 1);
        assert.equal(shader.uniformTemplates.beta.type, '1f');
        assert.equal(shader.uniformTemplates.beta.value(), 2);

        assert.equal(shader.uniformTemplates.gamma.type, '3f');
        assert.deepEqual(shader.uniformTemplates.gamma.value(), [2, 2, 2]);

        assert.equal(shader.uniformTemplates.omega.type, '3f');
        assert.deepEqual(shader.uniformTemplates.omega.value(), [3, 3, 3]);
    });

    it('parse uniform array', function () {
        const shader = new Shader(
            dummyShaderCode,
            `
            uniform float alpha[2];
            uniform vec3 beta[BETA_COUNT];
            `
        );

        assert.equal(shader.uniformTemplates.alpha.type, '1fv');
        assert.equal(shader.uniformTemplates.beta.type, '3fv');
    });

    it('parse attribute', function () {

        const shader = new Shader(
            `
            attribute float alpha;
            attribute vec3 beta;
            `,
            dummyShaderCode
        );
        assert.equal(shader.attributes.alpha.size, 1);
        assert.equal(shader.attributes.beta.size, 3);
    });

    it('parse uniform semantics', function () {

        const shader = new Shader(
            `
            uniform mat4 alpha : WORLDVIEWPROJECTION;
            uniform vec3 beta : VIEWPORT;
            `,
            dummyShaderCode
        );

        assert.equal(shader.matrixSemantics.WORLDVIEWPROJECTION.symbol, 'alpha');
        assert.equal(shader.uniformSemantics.VIEWPORT.symbol, 'beta');
    });

});