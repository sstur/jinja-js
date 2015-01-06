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
  var basename = pathLib.basename;

  var cwd = process.cwd();
  var dir = cwd;

  //path delimiter is forward-slash
  var urljoin = function() {
    var path = join.apply(null, arguments);
    return path.replace(/\\/g, '/');
  };

  var paths = commander.args;
  if (!paths.length) {
    console.log('No file specified');
    process.exit(1);
  }

  var fileCache = {};

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
    return fileCache[file] = fs.readFileSync(join(dir, file), 'utf8');
  };

  //use uglifyjs to minify compiled template
  var uglifyCode = function(code) {
    var jsp = uglifyjs.parser;
    var pro = uglifyjs.uglify;
    var ast = jsp.parse(code); // parse code and get the initial AST
    ast = pro.ast_mangle(ast); // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast); // compressed code here
  };

  //writes compiled template ./views/main.html -> /views/main.html.js
  var compileFile = function(file) {
    console.log('Compiling: ' + file);
    var text = jinja.readTemplateFile(file);
    var fn = jinja.compile(text).render;
    var code = fn.toString().replace(/^([^(]*)/, 'function');
    var compiled = register.toString();
    compiled = compiled.replace(/^function(.*?)\{([\s\S]*)\}/, '$2').trim();
    compiled = compiled.replace('$name', JSON.stringify(file));
    compiled = compiled.replace('$func', code);
    if (commander.min) {
      compiled = uglifyCode(compiled);
    }
    fs.writeFileSync(join(dir, file + '.js'), compiled, 'utf8');
  };

  var compilePath = function(path) {
    try {
      var list = fs.readdirSync(join(dir, path));
    } catch(e) {}
    if (list) {
      //handle directories recursively
      list.forEach(function(name) {
        //skip files that begin with a symbol
        if (!name.match(/^[a-z]/i)) return;
        compilePath(urljoin(path, name));
      });
    } else
    if (path.match(/\.html$/)) {
      compileFile(path);
    }
  };

  var isDir = function(path) {
    try {
      var stat = fs.statSync(join(dir, path));
    } catch(e) {}
    return (stat && stat.isDirectory()) ? true : false;
  };

  //for each path, we set the working directory and process the file or directory contents
  paths.forEach(function(path) {
    //remove trailing slash
    path = path.replace(/[\\\/]$/, '');
    if (isDir(path)) {
      dir = join(cwd, path);
      fs.readdirSync(dir).forEach(function(path) {
        compilePath(path);
      });
    } else {
      dir = join(cwd, path);
      compilePath(basename(path));
    }
  });

})();