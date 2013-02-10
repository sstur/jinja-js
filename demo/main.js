/*global jQuery, jinja, js_beautify */
jQuery(function($) {
  "use strict";
  var $jinja = $('#jinja');
  var $output = $('#output');

  var beautifyOpts = {
    indent_size: 2
  };

  var initSrc = trimLinebreaks($('#example-src').html() || '');
  $jinja.val(initSrc);

  var input = CodeMirror.fromTextArea($jinja.get(0), {
    tabSize: 2,
    lineNumbers: true,
    autofocus: true,
    mode: {name: "jinja2", htmlMode: true}
  });

  var output = CodeMirror.fromTextArea($output.get(0), {
    tabSize: 2,
    lineNumbers: true,
    mode: {name: "javascript", htmlMode: true}
  });

  var timeout;
  input.on('change', function(instance, change) {
    clearTimeout(timeout);
    setTimeout(update, 100);
  });

  update();


  function update() {
    var src = input.getValue();
    try {
      var fn = jinja.compile(src).render;
    } catch(e) {
      //todo: update error panel
      return;
    }
    src = fn.toString();
    if (src.charAt(0) == '(') src = src.slice(1, -1);
    //convert linebreaks
    src = src.replace(/\r\n/g, '\n').replace(/\r/g, '');
    //remove line comments
    src = src.replace(/^ *\/\/[^\n]*\n/gm, '');
    src = js_beautify(src, beautifyOpts);
    src = squashBoilerplate(src);
    output.setValue(src);
  }

  function trimLinebreaks(src) {
    return src.replace(/^[\r\n]+|[\r\n]+$/g, '');
  }

  function squashBoilerplate(src) {
    src = src.replace(/^  var (\n {3,}|[^\n])+/gm, function(s) {
      s = s.replace(/[\r\n]+( +)/g, '');
      return '|' + s + '\r';
    });
    src = src.replace(/\r *\n/g, '');
    src = src.replace(/;\n\|  var/g, ',');
    src = src.replace(/\|  var/gm, '  var');
    return src;
  }

});