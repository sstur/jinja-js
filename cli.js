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
    //todo: option determines if we should include the runtime or not
    var fn = jinja.compile(text).render;
    var code = fn.toString().replace(/^([^(]*)/, 'function');
    var compiled = register.toString();
    compiled = compiled.replace(/^function(.*?)\{([\s\S]*)\}/, '$2').trim();
    compiled = compiled.replace('$name', JSON.stringify(file));
    compiled = compiled.replace('$func', code);
    if (commander.min) {
      compiled = minify(compiled);
    }
    //todo: option determines if we should save to file/stdout or push to array
    fs.writeFileSync(join(basePath, file + '.js'), compiled, 'utf8');
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

  function isDir(path) {
    try {
      var stat = fs.statSync(join(basePath, path));
    } catch(e) {}
    return stat && stat.isDirectory() || false;
  }
})();