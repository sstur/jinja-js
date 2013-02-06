/*!
 * This is a slimmed-down Jinja2 implementation [http://jinja.pocoo.org/]
 * In the interest of simplicity, it deviates from Jinja2 as follows:
 * - Line statements, whitespace control, cycle, super-blocks, macros are not implemented
 * - auto escapes html by default (the filter is "html" not "e")
 * - arguments to filters are specified the "Liquid" way: `{{ text | filter: "arg" }}`
 * - Only "html" and "safe" filters are built in
 * - A expressions are evaluated before filters; `foo|length > 1` is invalid
 * Note:
 * - `{% for n in object %}` will store the object's keys as n
 * - subscript notation takes only primitive literals, such as `a[0]`, `a["b"]` or `a[true]`
 * - filter arguments can only be primitive literals
 * - if property is not found, but method '_get' exists, it will be called with the property name (and cached)
 * Todo:
 * - allow filter args like `{{ text | filter("arg") }}`
 * - whitespace control
 * - is/isnot -> ==/!=
 *
 */
/*global require, exports */
(function(require, jinja) {
  "use strict";
  //note: $ is not allowed in dot-notation identifiers
  var STRINGS = /'(\\.|[^'])*'|"(\\.|[^"'"])*"/g;
  var LITERAL = /^(?:'(\\.|[^'])*'|"(\\.|[^"'"])*"|true|false|null|([+-]?\d+(\.\d+)?))$/;
  var LITERALS = /('(\\.|[^'])*'|"(\\.|[^"'"])*"|true|false|null|([+-]?\d+(\.\d+)?))/g;
  //note: variable will also match true, false, null (and, or, not)
  var VARIABLE = /^(?:([a-z_]\w*)(\.\w+|\['(\\.|[^'])+'\]|\["(\\.|[^"'"])+"\])*)$/i;
  //all instances of literals and variables including dot and subscript notation
  var ALL_IDENTS = /([+-]?\d+(\.\d+)?)|(([a-z_]\w*)(\.\w+|\['(\\.|[^'])+'\]|\["(\\.|[^"'"])+"\])*)|('(\\.|[^'])*'|"(\\.|[^"'"])*")/ig;
  var OPERATORS = /(===?|!==?|>=?|<=?|&&|\|\||[+\-\*\/%])/g;
  var PROPS = /\.\w+|\['(\\.|[^'])+'\]|\["(\\.|[^"'"])+"\]/g;
  //extended (english) operators
  var EOPS = /\b(and|or|not)\b/g;

  var delimeters = {
    '{%': 'tag',
    '{{': 'output',
    '{#': 'comment'
  };

  var operators = {
    and: '&&',
    or: '||',
    not: '!'
  };

  function Parser() {
    this.nest = [];
    this.compiled = [];
    this.childBlocks = 0;
    this.parentBlocks = 0;
    this.isSilent = false;
  }

  Parser.prototype.push = function(line) {
    if (!this.isSilent) {
      this.compiled.push(line);
    }
  };

  Parser.prototype.parse = function(src) {
    this.tokenize(src);
    return this.compiled.join('\n');
  };

  Parser.prototype.tokenize = function(src) {
    var tagStart, tagEnd, prevEnd = 0, offset = 0;
    while ((tagStart = src.indexOf('{', prevEnd + offset)) >= 0) {
      tagEnd = -1;
      var delim = src.substr(tagStart, 2);
      if (delim == '{{') {
        tagEnd = src.indexOf('}}', tagStart + 2);
      } else
      if (delim in delimeters) {
        tagEnd = src.indexOf(delim.charAt(1) + '}', tagStart + 2);
      }
      if (tagEnd < 0) {
        offset ++;
        continue;
      }
      var text = src.slice(prevEnd, tagStart);
      this.textHandler(text);
      var tag = src.slice(tagStart, tagEnd + 2);
      this.tokenHandler(tag);
      prevEnd = tagEnd + 2;
      offset = 0;
    }
    text = src.slice(prevEnd);
    this.textHandler(text);
  };

  Parser.prototype.textHandler = function(text) {
    this.push('write(' + JSON.stringify(text) + ');');
  };

  Parser.prototype.tokenHandler = function(tag) {
    if (!tag) return;
    var type = delimeters[tag.slice(0, 2)];
    if (type == 'tag') {
      this.compileTag(tag.slice(2, -2));
    } else
    if (type == 'output') {
      var parts = tag.slice(2, -2).split('|');
      if (parts.length > 1) {
        var filters = parts.slice(1).map(this.parseFilter); //kinda risky: detaches 'this'
        this.push('filter(' + this.parseExpr(parts[0]) + ',' + filters.join(',') + ');');
      } else {
        this.push('filter(' + this.parseExpr(parts[0]) + ');');
      }
    }
  };

  Parser.prototype.compileTag = function(str) {
    str = str.trim();
    var directive = str.split(' ')[0];
    var handler = tagHandlers[directive];
    if (!handler) {
      throw new Error('Invalid tag: ' + str);
    }
    handler.call(this, str.slice(directive.length).trim());
  };

  Parser.prototype.parseFilter = function(src) {
    var parser = this;
    src = src.trim();
    var i = src.indexOf(':');
    //if (i < 0) i = src.indexOf('(');
    if (i < 0) return JSON.stringify([src]);
    var name = src.slice(0, i), args = src.slice(i + 1), arr = [JSON.stringify(name)];
    args.replace(LITERALS, function(_, arg) {
      arr.push(parser.parseQuoted(arg));
    });
    return '[' + arr.join(',') + ']';
  };

  Parser.prototype.extractEnt = function(src, regex, placeholder) {
    var subs = [];
    src = src.replace(regex, function(str) {
      subs.push(str);
      return placeholder;
    });
    return {src: src, subs: subs};
  };

  Parser.prototype.injectEnt = function(extracted, placeholder) {
    var src = extracted.src, subs = extracted.subs;
    var re = new RegExp('[' + placeholder + ']', 'g'), i = 0;
    src = src.replace(re, function(_) {
      return subs[i++];
    });
    return src;
  };

  //valid expressions: `a + 1 > b or c == null`, `a and b != c`, `(a < b) or (c < d and e)`
  Parser.prototype.parseExpr = function(src) {
    var parser = this;
    //first pass we extract string literals -> @
    var parsed1 = parser.extractEnt(src, STRINGS, '@');
    //replace and/or/not
    parsed1.src = parsed1.src.replace(EOPS, function(s) {
      return operators[s] || s;
    });
    //reconstruct
    src = parser.injectEnt(parsed1, '@');
    //sub out vars and literals
    parsed1 = parser.extractEnt(src, ALL_IDENTS, 'i');
    //parse variables
    parsed1.subs = parsed1.subs.map(parser.parseVar);
    //sub out operators
    var parsed2 = parser.extractEnt(parsed1.src, OPERATORS, '&');
    //remove white space
    var simplified = parsed2.src = parsed2.src.replace(/\s+/g, '');
    //allow 'not' unary operator
    simplified = simplified.replace(/!+i/g, 'i');
    //simplify logical grouping
    while (simplified != (simplified = simplified.replace(/\(i(&i)*\)/g, 'i')));
    if (!simplified.match(/^i(&i)*$/)) {
      throw new Error('Invalid expression: ' + src);
    }
    parsed1.src = parser.injectEnt(parsed2, '&');
    return parser.injectEnt(parsed1, 'i');
  };

  Parser.prototype.parseVar = function(src) {
    var parser = this;
    src = src.trim();
    if (LITERAL.test(src)) {
      return src;
    }
    var ident = src.match(VARIABLE);
    if (ident) {
      var parts = [ident[1]];
      src.replace(PROPS, function(s) {
        parts.push(s.charAt(0) == '.' ? s.slice(1) : parser.parseQuoted(s.slice(1, -1)));
      });
      return 'get(' + JSON.stringify(parts).slice(1, -1) + ')';
    }
    throw Error('Invalid literal or identifier: ' + src);
  };

  //escapes a name to be used as a javascript identifier
  Parser.prototype.escName = function(str) {
    return str.replace(/\W/g, function(s) {
      return '$' + s.charCodeAt(0).toString(16);
    });
  };

  Parser.prototype.parseQuoted = function(str) {
    if (str.charAt(0) == "'") {
      str = str.slice(1, -1).replace(/\\.|"/, function(s) {
        if (s == "\\'") return "'";
        return s.charAt(0) == '\\' ? s : ('\\' + s);
      });
      str = '"' + str + '"';
    }
    return JSON.parse(str);
  };


  //the context 'this' inside tagHandlers is the parser instance
  var tagHandlers = {
    'if': function(expr) {
      this.parseExpr(expr);
      this.push('if (' + this.parseExpr(expr) + ') {');
      this.nest.unshift('if');
    },
    'else': function() {
      if (this.nest[0] == 'for') {
        this.push('}, function() {');
      } else {
        this.push('} else {');
      }
    },
    'elseif': function(expr) {
      this.push('} else if (' + this.parseExpr(expr) + ') {');
    },
    'endif': function() {
      this.nest.shift();
      this.push('}');
    },
    'for': function(expr) {
      var pieces = expr.split(' in ');
      var loopvar = pieces[0].trim();
      this.push('each(' + this.parseVar(pieces[1]) + ',' + JSON.stringify(loopvar) + ',function() {');
      this.nest.unshift('for');
    },
    'endfor': function() {
      this.nest.shift();
      this.push('});');
    },
    'set': function(expr) {
      var i = expr.indexOf('=');
      var name = expr.slice(0, i).trim();
      var value = expr.slice(i + 1).trim();
      this.push('set(' + JSON.stringify(name) + ',' + this.parseExpr(value) + ');');
    },
    'block': function(name) {
      if (this.isParent) {
        ++this.parentBlocks;
        var blockName = 'block_' + (this.escName(name) || this.parentBlocks);
        this.push('renderBlock(typeof ' + blockName + ' == "function" ? ' + blockName + ' : function() {');
      } else
      if (this.hasParent) {
        this.isSilent = false;
        ++this.childBlocks;
        blockName = 'block_' + (this.escName(name) || this.childBlocks);
        this.push('function ' + blockName + '() {');
      }
      this.nest.unshift('block');
    },
    'endblock': function() {
      this.nest.shift();
      if (this.isParent) {
        this.push('});');
      } else
      if (this.hasParent) {
        this.push('}');
        this.isSilent = true;
      }
    },
    'extends': function(name) {
      name = this.parseQuoted(name);
      var parentSrc = this.readTemplateFile(name);
      this.isParent = true;
      this.tokenize(parentSrc);
      this.isParent = false;
      this.hasParent = true;
      //silence output until we enter a child block
      this.isSilent = true;
    },
    'include': function(name) {
      name = this.parseQuoted(name);
      var incSrc = this.readTemplateFile(name);
      this.isInclude = true;
      this.tokenize(incSrc);
      this.isInclude = false;
    }
  };

  //liquid style
  tagHandlers.assign = tagHandlers.set;
  //python/django style
  tagHandlers.elif = tagHandlers.elseif;

  var runtimeRender = function render(data, opts) {
    var defaults = {autoEscape: 'html'};
    var filters = {
      html: function(val) {
        return toString(val)
          .split('&').join('&amp;')
          .split('<').join('&lt;')
          .split('>').join('&gt;')
          .split('"').join('&quot;');
      },
      safe: function(val) {
        return val;
      }
    };
    var toString = function(val) {
      return (val == null || typeof val.toString != 'function') ? '' : '' + val.toString();
    };
    var extend = function(dest, src) {
      Object.keys(src).forEach(function(key) {
        dest[key] = src[key];
      });
      return dest;
    };
    opts = extend(defaults, opts || {});
    filters = extend(filters, opts.filters || {});
    var stack = [Object.create(data)], output = [];
    //get a value, lexically, starting in current context; a.b -> get("a","b")
    var get = function() {
      var val, n = arguments[0], c = stack.length;
      while (c--) {
        val = stack[c][n];
        if (typeof val != 'undefined') break;
      }
      for (var i = 1, len = arguments.length; i < len; i++) {
        if (val == null) continue;
        n = arguments[i];
        val = (n in val) ? val[n] : (typeof val._get == 'function' ? (val[n] = val._get(n)) : null);
      }
      return (val == null) ? null : val;
    };
    var set = function(n, val) {
      stack[stack.length - 1][n] = val;
    };
    var push = function(ctx) {
      stack.push(ctx || {});
    };
    var pop = function() {
      stack.pop();
    };
    var write = function(str) {
      output.push(str);
    };
    var filter = function(val) {
      for (var i = 1, len = arguments.length; i < len; i++) {
        var arr = arguments[i], name = arr[0], filter = filters[name];
        if (filter) {
          arr[0] = val; //now arr looks like [val, arg1, arg2]
          val = filter.apply(data, arr);
        } else {
          throw new Error('Invalid filter: ' + name);
        }
      }
      if (opts.autoEscape && name != opts.autoEscape && name != 'safe') {
        //auto escape if not explicitly safe or already escaped
        val = filters[opts.autoEscape].call(data, val);
      }
      output.push(val);
    };
    var each = function(obj, loopvar, fn1, fn2) {
      if (obj == null) return;
      var arr = Array.isArray(obj) ? obj : Object.keys(obj), len = arr.length;
      var ctx = {loop: {length: len}};
      push(ctx);
      for (var i = 0; i < len; i++) {
        extend(ctx.loop, {index: i + 1, index0: i});
        fn1(ctx[loopvar] = arr[i]);
      }
      if (len == 0 && fn2) fn2();
      pop();
    };
    var renderBlock = function(fn) {
      push();
      fn();
      pop();
    };
    ["CODE"]
    return output.join('');
  };

  var runtime;

  jinja.compile = function(markup) {
    var parser = new Parser();
    parser.readTemplateFile = this.readTemplateFile;
    var code = parser.parse(markup);
    runtime = runtime || (runtime = runtimeRender.toString());
    code = runtime.replace('["CODE"]', code);
    var fn = new Function('return (' + code + ')')();
    return {render: fn};
  };

  jinja.render = function(markup, data, opts) {
    var tmpl = jinja.compile(markup);
    return tmpl.render(data, opts);
  };

  jinja.readTemplateFile = function(name) {
    throw new Error('Not implemented: readTemplateFile');
  };

})(require, exports);