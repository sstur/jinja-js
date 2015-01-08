#!/usr/bin/env node
/*global require, process */
(function() {
  "use strict";
  var fs = require('fs');
  var pathLib = require('path');

  var commander = require('commander');
  var uglifyjs = require('uglify-js');

  var jinja = require('./lib/jinja');

  commander
    .version(require('./package.json').version)
    .usage('[options] <path/to/file ...>')
    .option('-m, --min', 'Minify output')
    .option('-o, --output <file>', 'Combine output into one file')
    .option('    --no-runtime', 'Do not include the runtime in the output')
    .parse(process.argv);

  var join = pathLib.join;
  var basePath = process.cwd();

  //path delimiter is forward-slash
  var urlJoin = function() {
    var path = join.apply(null, arguments);
    return path.replace(/\\/g, '/');
  };

  var paths = commander.args;
  if (!paths.length) {
    console.log('No file specified');
    process.exit(1);
  }

  var fileCache = {};
  var outputBuffer = [];
  var shouldBufferOutput = !!commander.output;

  //this will be converted toString() and $vars will be replaced
  function register($name, $func) {
    (function(name, func) {
      var tmpl = {name: name, render: func};
      var module = (typeof jinja !== 'undefined') ? jinja : (typeof require === 'function') ? require('jinja') : null;
      if (module && module.compiled) {
        module.compiled[name] = tmpl;
      }
      return tmpl;
    })($name, $func);
  }

  //allows includes and template inheritance to work
  jinja.readTemplateFile = function(name) {
    //include directives might leave out the file extension
    var file = (~name.indexOf('.')) ? name : name + '.html';
    if (file in fileCache) {
      return fileCache[file];
    }
    return fileCache[file] = fs.readFileSync(join('.', file), 'utf8');
  };

  //for each path we process the file or directory contents
  paths.forEach(function(path) {
    path = pathLib.normalize(path);
    //remove trailing slash(es)
    path = path.replace(/[\\\/]+$/, '');
    compilePath(path);
  });
  if (shouldBufferOutput) {
    outputBuffer.unshift("exports.getRuntime = " + jinja.getRuntimeCode() + ";");
    outputBuffer.unshift("exports.render = function(name) { return exports['/' + name].apply(null, Array.prototype.slice.call(arguments, 1)); };");
    var name = commander.globalExport || 'jinja';
    var code = [
      "var " + name + ";",
      "(function(definition) {",
      "  if (typeof exports === 'object' && typeof module === 'object') {",
      "    definition(null, exports);",
      "    return (typeof define === 'function') ? define('" + name + "', function() { this.exports = module.exports }) : null;",
      "  }",
      "  if (typeof define === 'function') {",
      "    return define.amd ? define(['require', 'exports'], definition) : define('" + name + "', definition);",
      "  }",
      "  definition(null, " + name + " = {});",
      "})(function(_, exports) {",
      outputBuffer.join('\n'),
      "});"
    ].join('\n');
    if (commander.min) {
      code = minify(code);
    }
    fs.writeFileSync(join(basePath, commander.output), code, 'utf8');
  }

  function compilePath(path) {
    if (isDir(path)) {
      var list = fs.readdirSync(join(basePath, path));
      list.forEach(function(name) {
        //skip files that begin with a symbol
        if (list.match(/^[a-z0-9]/i)) {
          compilePath(urlJoin(path, name));
        }
      });
    } else {
      compileFile(path);
    }
  }

  //writes compiled template ./views/main.html -> /views/main.html.js
  function compileFile(file) {
    console.log('Compiling: ' + file);
    var text = jinja.readTemplateFile(file);
    var includeRuntime = (!shouldBufferOutput && !commander.noRuntime);
    var fn = jinja.compile(text, {runtime: includeRuntime}).render;
    var code = fn.toString().replace(/^([^(]*)/, 'function');
    if (includeRuntime) {
      var wrapper = register.toString();
      wrapper = wrapper.replace(/^function(.*?)\{([\s\S]*)\}/, '$2').trim();
      wrapper = wrapper.replace('$name', JSON.stringify(file));
      code = wrapper.replace('$func', code);
    } else {
      code = 'exports[' + JSON.stringify('/' + file) + '] = ' + code + ';\n';
      code = replaceLast(code, 'getRuntime(data, options)', 'exports.getRuntime(data, options)');
    }
    if (shouldBufferOutput) {
      outputBuffer.push(code);
    } else {
      if (commander.min) {
        code = minify(code);
      }
      //todo: determine if we should save to file or send to stdout
      fs.writeFileSync(join(basePath, file + '.js'), code, 'utf8');
    }
  }

  //use uglifyjs to minify compiled template
  function minify(code) {
    var jsp = uglifyjs.parser;
    var pro = uglifyjs.uglify;
    var ast = jsp.parse(code); // parse code and get the initial AST
    ast = pro.ast_mangle(ast); // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast); // compressed code here
  }

  function replaceLast(source, search, replace) {
    var index = source.lastIndexOf(search);
    if (index === -1) {
      return source;
    }
    return source.slice(0, index) + replace + source.slice(index + search.length);
  }

  function isDir(path) {
    try {
      var stat = fs.statSync(join(basePath, path));
    } catch(e) {}
    return stat && stat.isDirectory() || false;
  }
})();