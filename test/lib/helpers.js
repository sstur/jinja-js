/*global global, require, exports */
(function() {
  "use strict";
  var fs = require('fs');

  var fileCache = global.fileCache || (global.fileCache = {});

  var jinja = require('../../jinja');

  jinja.readTemplateFile = getTemplate;

  function getTemplate(name) {
    var file = (~name.indexOf('.')) ? name : name + '.html';
    file = './views/' + file;
    if (file in fileCache) {
      return fileCache[file];
    }
    //todo: read files at module load time
    return fileCache[file] = fs.readFileSync(file, 'utf8');
  }

  var filters = {
    split: function(str, sep) {
      return ('' + str).split(sep || '');
    }
  };

  exports.compile = function(text, opts) {
    opts = opts || {};
    var name = opts.filename;
    if (name) {
      var file = (~name.indexOf('.')) ? name : name + '.html';
      file = './views/' + file;
      fileCache[file] = text;
    }
    //return just the render function
    return jinja.compile(text).render;
  };

  exports.render = function(name, context, opts) {
    context = context || {};
    opts = opts || {};
    var text = getTemplate(name);
    var rendered = jinja.render(text, context, {filters: filters});
    if (opts.trim !== false) {
      rendered = rendered.trim();
    }
    return rendered;
  };

})();