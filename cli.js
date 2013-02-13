#!/usr/bin/env node
(function() {
  "use strict";

  var args = process.argv.slice(2);
  var flags = {};
  while (args[0].charAt(0) == '-') {
    var flag = args.shift().replace(/^-+/, '');
    flags[flag] = 1;
  }
  var files = args;
  if (!files.length) {
    console.log('No file specified');
    process.exit(1);
  }
  console.log(flags, files);

})();