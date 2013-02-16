#!/usr/bin/env node
/*global require, process */
(function() {
  "use strict";
  var fs = require('fs');
  var join = require('path').join;
  var jinja = require('./jinja');
  try {
    var uglifyjs = require('uglify-js');
  } catch(e) {}

  var args = process.argv.slice(2);
  var flags = {};
  while (args[0].charAt(0) == '-') {
    var flag = args.shift().replace(/^-+/, '');
    flags[flag] = 1;
  }
  var paths = args;
  if (!paths.length) {
    console.log('No file specified');
    process.exit(1);
  }

  var fileCache = {};

  function register($name, $func) {
    (function(name, func) {
      var module = (typeof jinja != 'undefined') ? jinja : (typeof require == 'function') ? require('jinja') : null;
      if (module && module.compiled) {
        module.compiled[name] = func;
      }
      return func;
    })($name, $func);
  }

  //allows includes and template inheritance to work
  jinja.readTemplateFile = function(name) {
    //include directives might leave out the file extension
    var file = (~name.indexOf('.')) ? name : name + '.html';
    if (file in fileCache) {
      return fileCache[file];
    }
    return fileCache[file] = fs.readFileSync(file, 'utf8');
  };

  //use uglifyjs to minify compiled template
  var uglifyCode = function(code) {
    if (!uglifyjs) return code;
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
    if (flags.min) {
      compiled = uglifyCode(compiled);
    }
    fs.writeFileSync(file + '.js', compiled, 'utf8');
  };

  var compilePath = function(path) {
    try {
      var list = fs.readdirSync(path);
    } catch(e) {}
    if (list) {
      //handle directories recursively
      list.forEach(function(name) {
        //skip files that begin with a symbol
        if (!name.match(/^[a-z]/i)) return;
        compilePath(join(path, name));
      });
    } else
    if (path.match(/\.html$/)) {
      compileFile(path);
    }
  };

  paths.forEach(function(path) {
    compilePath(path);
  });

})();