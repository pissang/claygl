const assert = require('assert');
const { util, helper } = require('../../common/');
const clay = require('../../../dist/claygl');

describe('Animation.Spec', function () {
    it('#animate', function (done) {
        const timeline = new clay.animation.Timeline();
        const node = new clay.Node();
        const position = node.position;
        const animator = timeline.animate(node.position)
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
        timeline.start('spline');
        const startTime = Date.now();
        timeline.on('frame', function (d) {
            const deltaTime = Date.now() - startTime;
            if (deltaTime > 500) {
                timeline.stop();
                assert(!timeline._running);
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
        assert(timeline._running);
    });

    it('#pause and #resume', function (done) {
        const startTime = Date.now();
        let count = 0;
        const timeline = new clay.animation.Timeline();
        timeline.on('frame', function (d) {
            count++;
        });
        timeline.start();
        timeline.pause();
        setTimeout(function () {
            assert(timeline._paused);
            assert(timeline._running);
            assert(count === 0, count);
            timeline.resume();
            assert(!timeline._paused);
        }, 100);
        setTimeout(function () {
            assert(count > 1, count);
            timeline.stop();
            done();
        }, 200);
    });
});