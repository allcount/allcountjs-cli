#!/usr/bin/env node

var program = require('commander');
var _ = require('lodash');
var readline = require('readline');

var promptUser = function (inputTransformer) {
    return function (msg, callback) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(msg, function (input) {
            rl.close();
            callback(inputTransformer(input));
        });
    };
};

var promptConfirmation = promptUser(function (input) {
    return /^y|yes|ok|true$/i.test(input);
});

var promptString = promptUser(function (input) {
    if (_.isString(input)) return input;
});

program
    .version(require('../package.json').version)
    .usage('<command> [options]')
    .command('run', 'run application in current directory');

program
    .command('init [name]')
    .description('initialize application using [name] template')
    .action(function (name) {
        if (!name) {
            promptString('Enter template name [helloworld-app]: ', function (answer) {
                if (answer) {
                    name = answer;
                } else {
                    name = 'helloworld-app';
                }
                console.log('Initializing using %s template...', name);
            });
        } else {
            console.log('Initializing using %s template...', name);
        }
    });

program.parse(process.argv);