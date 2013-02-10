/*global jQuery, jinja, js_beautify */
jQuery(function($) {
  "use strict";
  var $jinja = $('#jinja');
  var $output = $('#output');

  var beautifyOpts = {
    indent_size: 2
  };

  var initSrc = removeLeadingLinebreaks($('#example-src').html() || '');
  $jinja.val(initSrc);
  update(initSrc);

  var editor = CodeMirror.fromTextArea($jinja.get(0), {
    tabSize: 2,
    lineNumbers: true,
    autofocus: true,
    mode: {name: "jinja2", htmlMode: true}
  });

  var timeout;
  editor.on('change', function(instance, change) {
    console.log('change');
    clearTimeout(timeout);
    setTimeout(update, 100);
  });


  function update(val) {
    var src = (val == null) ? editor.getValue() : val;
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
    $output.text(src);
  }

  function removeLeadingLinebreaks(src) {
    return src.replace(/^[\r\n]+/, '');
  }

  function squashBoilerplate(src) {
    src = src.replace(/^  var (\n {3,}|[^\n])+/gm, function(s) {
      s = s.replace(/[\r\n]+( +)/g, '');
      return '|' + s + '\r';
    });
    src = src.replace(/\r *\n/g, '');
    src = src.replace(/;\n\|  var/g, ',');
    src = src.replace(/^\|  var/gm, '  var');
    return src;
  }

});