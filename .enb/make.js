var DEFAULT_LANGS = ['ru', 'en'],
    fs = require('fs'),
    path = require('path'),
    naming = require('bem-naming'),
    levels = require('enb-bem-techs/techs/levels'),
    levelsToBemdecl = require('enb-bem-techs/techs/levels-to-bemdecl'),
    provide = require('enb/techs/file-provider'),
    depsByTechToBemdecl = require('enb-bem-techs/techs/deps-by-tech-to-bemdecl'),
    bemdecl = require('enb-bem-techs/techs/bemjson-to-bemdecl'),
    deps = require('enb-bem-techs/techs/deps-old'),
    mergeBemdecl = require('enb-bem-techs/techs/merge-bemdecl'),
    files = require('enb-bem-techs/techs/files'),
    css = require('enb/techs/css'),
    js = require('enb/techs/js'),
    ym = require('enb-modules/techs/prepend-modules'),
    bemhtml = require('enb-bemxjst/techs/bemhtml-old'),
    bemtree = require('enb-bemxjst/techs/bemtree-old'),
    html = require('enb-bemxjst/techs/html-from-bemjson'),
    htmlFromData = require('./techs/html-from-bemtree'),
    bh = require('enb-bh/techs/bh-server'),
    bhServerInclude = require('enb-bh/techs/bh-server-include'),
    bhYm = require('enb-bh/techs/bh-client-module'),
    bhHtml = require('enb-bh/techs/html-from-bemjson'),
    copyFile = require('enb/techs/file-copy'),
    mergeFiles = require('enb/techs/file-merge'),
    borschik = require('enb-borschik/techs/borschik'),
    PLATFORMS = {
        'common' : ['common'],
        'desktop' : ['common', 'desktop'],
        'touch-phone' : ['common', 'touch'],
        'touch-pad' : ['common', 'touch']
    },
    bemBabel = require('enb/lib/build-flow').create()
        .name('bem-babel')
        .target('target', '?.browser.js')
        .useFileList(['vanilla.js', 'js', 'browser.js'])
        .builder(function (files) {
            var res = require('vow').defer(),
                node = this.node,
                target = this._target,
                targetDir = node.getDir(),
                preWebpackPath = node.resolvePath('.pre-webpack.' + target),
                resultPath = node.resolvePath(target);

            fs.writeFile(
                preWebpackPath,
                files.map(function(file) {
                    return 'import \'bem-source:' + file.fullname + '\';';
                }).join('\n'),
                function(err) {
                    if(err) res.reject(err);
                    require('webpack')(
                        {
                            entry : preWebpackPath,
                            output : {
                                path : targetDir,
                                filename : target
                            },
                            module : {
                                loaders : [
                                    {
                                        test : /\.js$/,
                                        loader : 'babel-loader',
                                        query : {
                                            optional : ['runtime'],
                                            plugins : 'bem',
                                            loose : ['es6.modules']
                                        }
                                    }
                                ]
                            }
                        },
                        function(err, stats) {
                            // TODO: remove preWebpackPath
                            if(err) {
                                res.reject('Fatal error in webpack');
                            } else {
                                stats = stats.toJson();
                                if(stats.errors.length) {
                                    res.reject(stats.errors);
                                } else if(stats.warnings.length) {
                                    node.getLogger().logWarningAction(
                                        'bem-babel',
                                        path.join(node.getPath(), target),
                                        stats.warnings);
                                }
                                res.resolve(resultPath);
                            }
                        });
                });
            return res.promise();
        })
        .saver(function() {})
        .createTech();

module.exports = function(config) {
    var platforms = ['desktop', 'touch-pad', 'touch-phone'],
        langs = process.env.BEM_I18N_LANGS;

    config.includeConfig('enb-bem-examples');
    config.includeConfig('enb-bem-docs');
    config.includeConfig('enb-bem-specs');
    config.includeConfig('enb-bem-tmpl-specs');

    config.setLanguages(langs? langs.split(' ') : [].concat(DEFAULT_LANGS));

    configureDist(platforms);
    configurePages(platforms);
    configureSets(platforms, {
        examples : config.module('enb-bem-examples').createConfigurator('examples'),
        tests : config.module('enb-bem-examples').createConfigurator('tests'),
        docs : config.module('enb-bem-docs').createConfigurator('docs', 'examples'),
        specs : config.module('enb-bem-specs').createConfigurator('specs'),
        tmplSpecs : config.module('enb-bem-tmpl-specs').createConfigurator('tmpl-specs')
    });

    function configureDist(platforms) {
        platforms.forEach(function(platform) {
            config.node('dist/' + platform, function(nodeConfig) {
                nodeConfig.addTechs([
                    [levels, { levels : getLevels(platform) }],
                    [levelsToBemdecl],
                    [deps],
                    [files],
                    [css, { target : '?.pre.css' }],
                    [depsByTechToBemdecl, {
                        target : '?.js-js.bemdecl.js',
                        sourceTech : 'js',
                        destTech : 'js'
                    }],
                    [mergeBemdecl, {
                        sources : ['?.bemdecl.js', '?.js-js.bemdecl.js'],
                        target : '?.js.bemdecl.js'
                    }],
                    [deps, {
                        target : '?.js.deps.js',
                        bemdeclFile : '?.js.bemdecl.js'
                    }],
                    [files, {
                        depsFile : '?.js.deps.js',
                        filesTarget : '?.js.files',
                        dirsTarget : '?.js.dirs'
                    }],
                    [bemBabel, {
                        filesTarget : '?.js.files',
                        target : '?.source.js',
                    }],
                    [ym, {
                        source : '?.source.js',
                        target : '?.ym.js'
                    }],
                    [bemhtml, { target : '?.pre.bemhtml.js', devMode : false }],
                    [depsByTechToBemdecl,  {
                        target : '?.bemhtml.bemdecl.js',
                        sourceTech : 'js',
                        destTech : 'bemhtml'
                    }],
                    [deps, {
                        target : '?.bemhtml.deps.js',
                        bemdeclFile : '?.bemhtml.bemdecl.js'
                    }],
                    [files, {
                        depsFile : '?.bemhtml.deps.js',
                        filesTarget : '?.bemhtml.files',
                        dirsTarget : '?.bemhtml.dirs'
                    }],
                    [bemhtml, {
                        target : '?.client.bemhtml.js',
                        filesTarget : '?.bemhtml.files',
                        devMode : false
                    }],
                    [bhServerInclude, { target : '?.pre.bh.js', jsAttrName : 'data-bem', jsAttrScheme : 'json' }],
                    [bhYm, { target : '?.client.bh.js', jsAttrName : 'data-bem', jsAttrScheme : 'json' }],
                    [mergeFiles, {
                        target : '?.source+bemhtml.js',
                        sources : ['?.source.js', '?.client.bemhtml.js']
                    }],
                    [ym, {
                        source : '?.source+bemhtml.js',
                        target : '?.pre.browser+bemhtml.js'
                    }],
                    [mergeFiles, {
                        target : '?.source+bh.js',
                        sources : ['?.source.js', '?.client.bh.js']
                    }],
                    [ym, {
                        source : '?.source+bh.js',
                        target : '?.pre.browser+bh.js'
                    }],
                    [borschik, { source : '?.pre.css', target : '?.css' }],
                    [borschik, { source : '?.ym.js', target : '?.browser.js' }],
                    [borschik, { source : '?.pre.bemhtml.js', target : '?.bemhtml.js' }],
                    [borschik, { source : '?.pre.bh.js', target : '?.bh.js' }],
                    [borschik, { source : '?.pre.browser+bemhtml.js', target : '?.browser+bemhtml.js' }],
                    [borschik, { source : '?.pre.browser+bh.js', target : '?.browser+bh.js' }]
                ]);

                nodeConfig.addTargets([
                    '?.css', '?.browser.js', '?.bemhtml.js', '?.bh.js', '?.browser+bemhtml.js', '?.browser+bh.js'
                ]);
            });
        });
    }

    function configurePages(platforms) {
        configureLevels('common', ['common.bundles/*']);
        configureCommonTargets(['common.bundles/*']);
        configureNodesWithBemjson(['common.bundles/index']);

        config.nodes('common.bundles/index', function(nodeConfig) {
            nodeConfig.addTech([provide, { target : '?.bemjson.js' }]);
        });

        config.nodes('common.bundles/test-bemtree', function(nodeConfig) {
            nodeConfig.addTechs([
                [provide, { target : '?.bemdecl.js' }],
                [bemtree, { devMode : false }],
                [htmlFromData]
            ]);

            nodeConfig.addTargets([
                '?.html'
            ]);
        });

        platforms.forEach(function(platform) {
            var nodes = [platform + '.tests/*/*', platform + '.examples/*/*'];

            configureLevels(platform, nodes);
            configureCommonTargets(nodes);
            configureNodesWithBemjson(nodes);
        });
    }

    function configureLevels(platform, nodes) {
        config.nodes(nodes, function(nodeConfig) {
            var nodeDir = nodeConfig.getNodePath(),
                blockSublevelDir = path.join(nodeDir, '..', '.blocks'),
                sublevelDir = path.join(nodeDir, 'blocks'),
                extendedLevels = [].concat(getLevels(platform));

            if(fs.existsSync(blockSublevelDir)) {
                extendedLevels.push(blockSublevelDir);
            }

            if(fs.existsSync(sublevelDir)) {
                extendedLevels.push(sublevelDir);
            }

            nodeConfig.addTech([levels, { levels : extendedLevels }]);
        });
    }

    function configureCommonTargets(nodes) {
        config.nodes(nodes, function(nodeConfig) {
            // Base techs
            nodeConfig.addTechs([
                [deps],
                [files]
            ]);

            // Client techs
            nodeConfig.addTechs([
                [css],
                [depsByTechToBemdecl, {
                    target : '?.js-js.bemdecl.js',
                    sourceTech : 'js',
                    destTech : 'js'
                }],
                [mergeBemdecl, {
                    sources : ['?.bemdecl.js', '?.js-js.bemdecl.js'],
                    target : '?.js.bemdecl.js'
                }],
                [deps, {
                    target : '?.js.deps.js',
                    bemdeclFile : '?.js.bemdecl.js'
                }],
                [files, {
                    depsFile : '?.js.deps.js',
                    filesTarget : '?.js.files',
                    dirsTarget : '?.js.dirs'
                }],
                [js, {
                    filesTarget : '?.js.files',
                    target : '?.browser.js',
                    sourceSuffixes : ['vanilla.js', 'js', 'browser.js']
                }],
                [mergeFiles, {
                    target : '?.pre.js',
                    sources : ['?.browser.bemhtml.js', '?.browser.js']
                }],
                [ym, {
                    source : '?.pre.js',
                    target : '?.js'
                }]
            ]);

            // Client BEMHTML
            nodeConfig.addTechs([
                [depsByTechToBemdecl, {
                    target : '?.bemhtml.bemdecl.js',
                    sourceTech : 'js',
                    destTech : 'bemhtml'
                }],
                [deps, {
                    target : '?.bemhtml.deps.js',
                    sourceDepsFile : '?.bemhtml.bemdecl.js'
                }],
                [files, {
                    target : '?.bemhtml.deps.js',
                    filesTarget : '?.bemhtml.files',
                    dirsTarget : '?.bemhtml.dirs'
                }],
                [bemhtml, {
                    target : '?.browser.bemhtml.js',
                    filesTarget : '?.bemhtml.files',
                    devMode : false
                }]
            ]);

            // Template techs
            nodeConfig.addTechs([
                [bemhtml],
                [bh, { jsAttrName : 'data-bem', jsAttrScheme : 'json' }]
            ]);

            nodeConfig.addTargets([
                '_?.css', '_?.js'
            ]);
        });

        config.mode('development', function() {
            config.nodes(nodes, function(nodeConfig) {
                nodeConfig.addTechs([
                    [copyFile, { source : '?.css', target : '_?.css' }],
                    [copyFile, { source : '?.js', target : '_?.js' }]
                ]);
            });
        });

        config.mode('production', function() {
            config.nodes(nodes, function(nodeConfig) {
                nodeConfig.addTechs([
                    [borschik, { source : '?.css', target : '_?.css', freeze : true, tech : 'cleancss' }],
                    [borschik, { source : '?.js', target : '_?.js', freeze : true }]
                ]);
            });
        });
    }

    function configureNodesWithBemjson(nodes) {
        config.nodes(nodes, function(nodeConfig) {
            var langs = config.getLanguages();

            nodeConfig.addTechs([
                [bemdecl]
            ]);

            // Build htmls
            nodeConfig.addTechs([
                [html],
                [bhHtml, { target : '?.bh.html' }]
            ]);

            langs.forEach(function(lang) {
                var destTarget = '?.' + lang + '.html';

                nodeConfig.addTech([copyFile, { source : '?.html', target : destTarget }]);
                nodeConfig.addTarget(destTarget);
            });

            nodeConfig.addTargets([
                '?.html', '?.bh.html'
            ]);
        });
    }

    function configureSets(platforms, sets) {
        platforms.forEach(function(platform) {
            sets.examples.configure({
                destPath : platform + '.examples',
                levels : getLevels(platform),
                techSuffixes : ['examples'],
                fileSuffixes : ['bemjson.js', 'title.txt'],
                inlineBemjson : true,
                processInlineBemjson : wrapInPage
            });

            sets.tests.configure({
                destPath : platform + '.tests',
                levels : getLevels(platform),
                techSuffixes : ['tests'],
                fileSuffixes : ['bemjson.js', 'title.txt']
            });

            sets.docs.configure({
                destPath : platform + '.docs',
                levels : getLevels(platform),
                exampleSets : [platform + '.examples'],
                langs : config.getLanguages(),
                jsdoc : { suffixes : ['vanilla.js', 'browser.js', 'js'] }
            });

            sets.specs.configure({
                destPath : platform + '.specs',
                levels : getLevels(platform),
                sourceLevels : getSpecLevels(platform),
                jsSuffixes : ['vanilla.js', 'browser.js', 'js']
            });

            sets.tmplSpecs.configure({
                destPath : platform + '.tmpl-specs',
                levels : getLevels(platform),
                sourceLevels : getLevels(platform),
                engines : {
                    bh : {
                        tech : 'enb-bh/techs/bh-server',
                        options : {
                            jsAttrName : 'data-bem',
                            jsAttrScheme : 'json'
                        }
                    },
                    'bemhtml-dev' : {
                        tech : 'enb-bemxjst/techs/bemhtml-old',
                        options : { devMode : true }
                    },
                    'bemhtml-prod' : {
                        tech : 'enb-bemxjst/techs/bemhtml-old',
                        options : { devMode : false }
                    }
                }
            });
        });
    }
};

function getLevels(platform) {
    return PLATFORMS[platform].map(function(level) {
        return level + '.blocks';
    });
}

function getSpecLevels(platform) {
    return [].concat(
        { path : path.join('libs', 'bem-pr', 'spec.blocks'), check : false },
        getLevels(platform)
    );
}

function wrapInPage(bemjson, meta) {
    var basename = '_' + path.basename(meta.filename, '.bemjson.js');
    return {
        block : 'page',
        title : naming.stringify(meta.notation),
        head : [{ elem : 'css', url : basename + '.css' }],
        scripts : [{ elem : 'js', url : basename + '.js' }],
        content : bemjson
    };
}
