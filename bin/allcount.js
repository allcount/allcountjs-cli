#!/usr/bin/env node

var program = require('commander');
var _ = require('lodash');
var readline = require('readline');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var request = require('request');
var child_process = require('child_process');

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
    .command('run')
    .description('run application in current directory')
    .option('-c, --app <app_config_dir>', 'where app configuration directory is. Default is "app-config"')
    .option('-d, --db <db_url>', 'database connection url. Default is "mongodb://localhost:27017/<app_name>"')
    .action(function (opts) {
        if (!fs.existsSync('package.json')) {
            console.log("package.json doesn't exist. Seems to be not an AllcountJS project directory. Have you run `allcountjs init`?");
            process.exit(1);
            return;
        }
        var currentPackageJson = JSON.parse(fs.readFileSync('package.json'));
        var appConfig = opts.app || 'app-config';
        var dbUrl = opts.db || ('mongodb://localhost:27017/' + currentPackageJson.name);

        if (!fs.existsSync('./node_modules/allcountjs/allcount.js')) {
            console.log("AllcountJS isn't installed. Please run `npm install` first.");
            process.exit(1);
            return;
        }
        console.log("Using db url: " + dbUrl);
        child_process.fork('./node_modules/allcountjs/allcount.js', { stdio: 'inherit', env: {DB_URL: dbUrl, APP: appConfig} });
    });

var initAppTemplate = function (appName, template, authorName, authorEmail, description) {
    console.log('Initializing "%s" application using "%s" template...', appName, template);

    var packageJson = {
        name: appName,
        version: "1.0.0",
        author: {
            name: authorName,
            email: authorEmail
        },
        description: description,
        dependencies: {
            "allcountjs": "^1.14.5"
        },
        scripts: {
            start: "./node_modules/.bin/allcountjs --app app-config"
        },
        allcountjsTemplate: template
    };

    mkdir(appName, function () {
        write(path.join(appName, 'package.json'), JSON.stringify(packageJson, null, 2));
        mkdir(path.join(appName, 'app-config'), function () {
            request.post('https://allcountjs.com/api/app-template-for-cli-init', {json: packageJson}, function (err, httpResponse, body) {
                var fileCounter = 0;
                body.files.forEach(function (file) {
                    write(path.join(appName, 'app-config', file.fileName), file.content, 0666, function () {
                        fileCounter++;
                        if (body.files.length === fileCounter) {
                            var prompt = launchedFromCmd() ? '>' : '$';
                            console.log();
                            console.log('   install dependencies:');
                            console.log('     %s cd %s && npm install', prompt, appName);
                            console.log();
                            console.log('   run the app:');
                            var mongoUrl = "mongodb://localhost:27017/" + appName;
                            if (launchedFromCmd()) {
                                console.log('     %s SET DB_URL=%s:* & npm start', prompt, mongoUrl);
                            } else {
                                console.log('     %s DB_URL=%s:* npm start', prompt, mongoUrl);
                            }
                            console.log();
                            console.log('   or');
                            console.log('     %s allcountjs run', prompt);
                            console.log();
                        }
                    });
                });
            })
        })
    })
};

program
    .command('init [name]')
    .option('-t, --template <template>', 'demo template name at allcountjs.com')
    .description('initialize new application')
    .action(function (appName, opts) {
        var template = opts.template;
        template = template || 'twenty-two-lines';
        if (!appName) {
            promptString('Enter application name [helloworld-app]: ', function (answer) {
                if (answer) {
                    appName = answer;
                } else {
                    appName = 'helloworld-app';
                }
                promptString('Enter author name: ', function (authorName) {
                    promptString('Enter author email: ', function (authorEmail) {
                        promptString('Enter description: ', function (description) {
                            initAppTemplate(appName, template, authorName, authorEmail, description);
                        });
                    });
                });
            });
        } else {
            initAppTemplate(appName, template);
        }
    });

function write(p, str, mode, fn) {
    mkdirp(path.dirname(p), 0755, function (err) {
        if (err) throw err;
        fs.writeFileSync(p, str, {mode: mode || 0666});
        console.log('   \x1b[36mcreate\x1b[0m : ' + p);
        fn && fn();
    })
}

function mkdir(path, fn) {
    mkdirp(path, 0755, function (err) {
        if (err) throw err;
        console.log('   \033[36mcreate\033[0m : ' + path);
        fn && fn();
    });
}

function launchedFromCmd() {
    return process.platform === 'win32'
        && process.env._ === undefined;
}

program.parse(process.argv);