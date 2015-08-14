/*jshint -W030 */

require('chai').should();

var rimraf = require('rimraf');
var path = require('path');
var tempDir = path.resolve(__dirname, '../temp');
var mkdirp = require('mkdirp');
var binPath = path.resolve(__dirname, '../bin/allcount.js');
var spawn = require('child_process').spawn;

describe('AllcountJS Command line interface', function () {
    context('common functionality', function () {

        var usageScreenAssertions = function (dir, done) {
            return function (err, stdout) {
                if (err) return done(err);
                var files = parseCreatedFiles(stdout, dir);
                files.should.be.empty;
                /Usage: allcount/.test(stdout).should.be.ok;
                /--help/.test(stdout).should.be.ok;
                done();
            };
        };

        describe('when no arguments provided', function () {
            var dir;

            before(function (done) {
                createEnvironment(function (err, newDir) {
                    if (err) return done(err);
                    dir = newDir;
                    done();
                });
            });

            after(function (done) {
                this.timeout(30000);
                cleanup(dir, done);
            });

            it('should print usage', function (done) {
                run(dir, [], usageScreenAssertions(dir, done));
            });
        });

        describe('when -h argument provided', function () {
            var dir;

            before(function (done) {
                createEnvironment(function (err, newDir) {
                    if (err) return done(err);
                    dir = newDir;
                    done();
                });
            });

            after(function (done) {
                this.timeout(30000);
                cleanup(dir, done);
            });

            it('should print usage', function (done) {
                run(dir, ['-h'], usageScreenAssertions(dir, done));
            });
        });
    });

    context('Scaffolding/initialization', function () {

    });
});

var run = function (dir, args, callback) {
    var argv = [binPath].concat(args);
    var exec = process.argv[0];
    var stderr = '';
    var stdout = '';

    var child = spawn(exec, argv, {
        cwd: dir
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function ondata(str) {
        stdout += str;
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function ondata(str) {
        process.stderr.write(str);
        stderr += str;
    });

    child.on('close', onclose);
    child.on('error', callback);

    function onclose(code) {
        var err = null;

        try {
            stderr.should.be.equal('');
            code.should.be.equal(0);
        } catch (e) {
            err = e;
        }

        callback(err, stdout.replace(/\x1b\[(\d+)m/g, '_color_$1_'));
    }
};

var cleanup = function (dir, callback) {
    if (typeof dir === 'function') {
        callback = dir;
        dir = tempDir;
    }

    rimraf(tempDir, function (err) {
        callback(err);
    });
};

var createEnvironment = function (callback) {
    var num = process.pid + Math.random();
    var dir = path.join(tempDir, ('app-' + num));

    mkdirp(dir, function ondir(err) {
        if (err) return callback(err);
        callback(null, dir);
    });
};

function parseCreatedFiles(output, dir) {
    var files = [];
    var lines = output.split(/[\r\n]+/);
    var match;

    for (var i = 0; i < lines.length; i++) {
        if ((match = /create.*?: (.*)$/.exec(lines[i]))) {
            var file = match[1];

            if (dir) {
                file = path.resolve(dir, file);
                file = path.relative(dir, file);
            }

            file = file.replace(/\\/g, '/');
            files.push(file);
        }
    }

    return files;
}