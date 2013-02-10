/*global jQuery, jinja, js_beautify */
jQuery(function($) {
  "use strict";
  var $jinja = $('#jinja');
  var $output = $('#output');

  var timeout;
  var beautifyOpts = {
    indent_size: 2
  };

  $jinja.on('keyup', function() {
    clearTimeout(timeout);
    setTimeout(update, 100);
  });

  var exampleSrc = removeLeadingLinebreaks($('#example-src').html() || '');
  $jinja.val(exampleSrc);
  update();

  function update() {
    var src = $jinja.val();
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