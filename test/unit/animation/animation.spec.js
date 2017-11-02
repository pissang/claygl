const assert = require('assert');
const { util, helper } = require('../../common/');
const qtek = require('../../../dist/qtek');

describe('Animation.Spec', function () {    
    it('#animate', function (done) {
        const animation = new qtek.animation.Animation();
        const node = new qtek.Node();
        const position = node.position;
        const animator = animation.animate(node.position)
            .when(100, {
                x: 500,
                y: 500
            })
            .when(200, {
                x: 100,
                y: 100
            })
            .when(300, {
                z: 10
            });
        animator.start();
        animation.start('spline');
        const startTime = Date.now();
        animation.on('frame', function (d) {
            const deltaTime = Date.now() - startTime;
            if (deltaTime > 500) {
                animation.stop();
                assert(!animation._running);
                done();
            } else if (deltaTime > 300) {
                assert(position.z >= 10, position.z);
            } else if (deltaTime > 200) {
                assert(position.x === 100, position.x);
                assert(position.y === 100, position.y);
            } else if (deltaTime > 100) {
                assert(position.x < 500 && position.x >= 100, position.x);
                assert(position.y < 500 && position.x >= 100, position.y);
            } else if (deltaTime < 100) {
                assert(position.x < 500 && position.x >= 0, position.x);
                assert(position.y < 500 && position.x >= 0, position.y); 
            }
        });
        assert(animation._running);
    });

    it('#pause and #resume', function (done) {
        const startTime = Date.now();
        let count = 0;
        const animation = new qtek.animation.Animation();
        animation.on('frame', function (d) {            
            count++;
        });
        animation.start();
        animation.pause();
        setTimeout(function () {
            assert(animation._paused);
            assert(animation._running);
            assert(count === 0, count);
            animation.resume();
            assert(!animation._paused);            
        }, 100);
        setTimeout(function () {
            assert(count > 1, count);
            animation.stop();
            done();
        }, 200);
    });
});