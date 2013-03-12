/*global jQuery, jinja, js_beautify */
jQuery(function($) {
  "use strict";
  var $jinja = $('#jinja');
  var $output = $('#output');
  var includeRuntime = false;
  $('#include-runtime').change(function() {
    includeRuntime = $(this).is(':checked');
    update();
  }).attr({checked: false});

  var beautifyOpts = {
    indent_size: 2
  };

  var qs = location.search.slice(1).match(/(^|&)src=([^&]+)(&|$)/);
  var src = qs ? decodeURIComponent(qs[2].replace(/\+/g, ' ')) : $('#example-src').html();
  src = src ? trimLinebreaks(src) : '';
  $jinja.val(src);

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
      var fn = jinja.compile(src, {runtime: includeRuntime}).render;
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
    src = src.replace('function render', 'function');
    src = src.replace('anonymous', 'render');
    src = src.replace(/,\n      \b/g, ', ');
    return src;
  }

});
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-35213673-1']);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();