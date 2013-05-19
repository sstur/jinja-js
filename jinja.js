/*!
 * Jinja Templating for JavaScript v0.1.4
 * https://github.com/sstur/jinja
 *
 * This is a slimmed-down Jinja2 implementation [http://jinja.pocoo.org/]
 * In the interest of simplicity, it deviates from Jinja2 as follows:
 * - Line statements, cycle, super, macros and block nesting are not implemented
 * - auto escapes html by default (the filter is "html" not "e")
 * - Only "html" and "safe" filters are built in
 * - Filters are not valid in expressions; `foo|length > 1` is not valid
 * - Expression Tests (`if num is odd`) not implemented (`is` translates to `==` and `isnot` to `!=`)
 * Note:
 * - `{% for n in object %}` will iterate the object's keys
 * - subscript notation takes literals `a[0]` or simple variables `a[n]` but not `a[item.key]`
 * - `.2` is not a valid number literal; use `0.2`
 * - if property is not found, but method '_get' exists, it will be called with the property name (and cached)
 *
 */
/*global require, exports, module, define */
var jinja;
(function(definition) {
  if (typeof exports == 'object' && typeof module == 'object') {
    // CommonJS/Node
    return definition(require, exports, module);
  }
  if (typeof define == 'function') {
    //AMD or Other
    return define.amd ? define(['exports'], definition) : define('jinja', definition);
  }
  definition(function() {}, jinja = {});
})(function(require, jinja) {
  "use strict";
  var TOKENS = /\{\{\{('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}\}|\{\{('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}|\{%('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?%\}|\{#('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?#\}/g;
  var STRINGS = /'(\\.|[^'])*'|"(\\.|[^"'"])*"/g;
  var IDENS_AND_NUMS = /([$_a-z][$\w]*)|([+-]?\d+(\.\d+)?)/g;
  var NUMBER = /^[+-]?\d+(\.\d+)?$/;
  //non-primitive literals (array and object literals)
  var NON_PRIMITIVES = /\[[@#~](,[@#~])*\]|\[\]|\{([@i]:[@#~])(,[@i]:[@#~])*\}|\{\}/g;
  //bare identifiers in object literals: {foo: 'value'}
  var OBJECT_IDENTS = /[$_a-z][$\w]*/ig;
  //note: supports a.$b but not a.2; a[2] is fine
  var VARIABLES = /([$_a-z][$\w]*)(\.[$_a-z][$\w]*|\[[@#]\])*/ig;
  var OPERATORS = /(===?|!==?|>=?|<=?|&&|\|\||[+\-\*\/%])/g;
  //extended (english) operators
  var EOPS = /(^|[^$\w])(and|or|not|is|isnot)([^$\w]|$)/g;
  var L_SPACE = /^\s+/;
  var T_SPACE = /\s+$/;

  var delimeters = {
    '{%': 'directive',
    '{{': 'output',
    '{#': 'comment'
  };

  var operators = {
    and: '&&',
    or: '||',
    not: '!',
    is: '==',
    isnot: '!='
  };

  var constants = {
    'true': true,
    'false': false,
    'null': null
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
    return this.compiled;
  };

  Parser.prototype.tokenize = function(src) {
    var lastEnd = 0, parser = this, trimLeading = false;
    src.replace(TOKENS, function(token) {
      var tagStart = arguments[arguments.length - 2], len = token.length;
      var text = src.slice(lastEnd, tagStart);
      if (trimLeading) text = text.replace(L_SPACE, '');
      token = token.replace(/^(\{+)-/, function(_, delim) {
        text = text.replace(T_SPACE, '');
        return delim;
      });
      token = token.replace(/-(\}+)$/, function(_, delim) {
        trimLeading = true;
        return delim;
      });
      if (token.slice(0, 3) == '{{{') {
        //liquid-style: make {{{x}}} => {{x|safe}}
        token = token.slice(1, -3) + '|safe}}';
      }
      parser.textHandler(text);
      parser.tokenHandler(token);
      lastEnd = tagStart + len;
    });
    var text = src.slice(lastEnd);
    if (trimLeading) text = text.replace(L_SPACE, '');
    this.textHandler(text);
  };

  Parser.prototype.textHandler = function(text) {
    this.push('write(' + JSON.stringify(text) + ');');
  };

  Parser.prototype.tokenHandler = function(tag) {
    if (!tag) return;
    var type = delimeters[tag.slice(0, 2)];
    tag = tag.slice(2, -2).trim();
    if (type == 'directive') {
      this.compileTag(tag);
    } else
    if (type == 'output') {
      var extracted = this.extractEnt(tag, STRINGS, '@');
      //replace || operators with ~
      extracted.src = extracted.src.replace(/\|\|/g, '~').split('|');
      //put back || operators
      extracted.src = extracted.src.map(function(part) {
        return part.split('~').join('||');
      });
      var parts = this.injectEnt(extracted, '@');
      if (parts.length > 1) {
        var filters = parts.slice(1).map(this.parseFilter.bind(this));
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
    src = src.trim();
    var match = src.match(/[:(]/);
    var i = match ? match.index : -1;
    if (i < 0) return JSON.stringify([src]);
    var name = src.slice(0, i);
    var args = src.charAt(i) == ':' ? src.slice(i + 1) : src.slice(i + 1, -1);
    args = this.parseExpr(args, {terms: true});
    return '[' + JSON.stringify(name) + ',' + args + ']';
  };

  Parser.prototype.extractEnt = function(src, regex, placeholder) {
    var subs = [], isFunc = typeof placeholder == 'function';
    src = src.replace(regex, function(str) {
      var replacement = isFunc ? placeholder(str) : placeholder;
      if (replacement) {
        subs.push(str);
        return replacement;
      }
      return str;
    });
    return {src: src, subs: subs};
  };

  Parser.prototype.injectEnt = function(extracted, placeholder) {
    var src = extracted.src, subs = extracted.subs, isArr = Array.isArray(src);
    var arr = (isArr) ? src : [src];
    var re = new RegExp('[' + placeholder + ']', 'g'), i = 0;
    arr.forEach(function(src, index) {
      arr[index] = src.replace(re, function(_) {
        return subs[i++];
      });
    });
    return isArr ? arr : arr[0];
  };

  //replace complex literals without mistaking subscript notation with array literals
  Parser.prototype.replaceComplex = function(s) {
    var parsed = this.extractEnt(s, /i(\[[@#]\])+/g, 'v');
    parsed.src = parsed.src.replace(NON_PRIMITIVES, '~');
    return this.injectEnt(parsed, 'v');
  };

  //parse expression containing literals (including objects/arrays) and variables (including dot and subscript notation)
  //valid expressions: `a + 1 > b.c or c == null`, `a and b[1] != c`, `(a < b) or (c < d and e)`, 'a || [1]`
  Parser.prototype.parseExpr = function(src, opts) {
    opts = opts || {};
    //extract string literals -> @
    var parsed1 = this.extractEnt(src, STRINGS, '@');
    //note: this will catch {not: 1} and a.is; could we replace temporarily and then check adjacent chars?
    parsed1.src = parsed1.src.replace(EOPS, function(s, before, op, after) {
      return (op in operators) ? before + operators[op] + after : s;
    });
    //sub out non-string literals (numbers/true/false/null) -> #
    // the distinction is necessary because @ can be object identifiers, # cannot
    var parsed2 = this.extractEnt(parsed1.src, IDENS_AND_NUMS, function(s) {
      return (s in constants || NUMBER.test(s)) ? '#' : null;
    });
    //sub out object/variable identifiers -> i
    var parsed3 = this.extractEnt(parsed2.src, OBJECT_IDENTS, 'i');
    //remove white-space
    parsed3.src = parsed3.src.replace(/\s+/g, '');

    //the rest of this is simply to boil the expression down and check validity
    var simplified = parsed3.src;
    //sub out complex literals (objects/arrays) -> ~
    // the distinction is necessary because @ and # can be subscripts but ~ cannot
    while (simplified != (simplified = this.replaceComplex(simplified)));
    //now @ represents strings, # represents other primitives and ~ represents non-primitives
    //replace dot/subscript notation
    while (simplified != (simplified = simplified.replace(/i(\.i|\[[@#i]\])+/, 'i')));
    //sub in "i" for @ and # and ~ (now "i" represents all literals)
    simplified = simplified.replace(/[@#~]/g, 'i');
    //sub out operators
    simplified = simplified.replace(OPERATORS, '&');
    //allow 'not' unary operator
    simplified = simplified.replace(/!+[i]/g, 'i');
    var terms = opts.terms ? simplified.split(',') : [simplified];
    terms.forEach(function(term) {
      //simplify logical grouping
      while (term != (term = term.replace(/\(i(&i)*\)/g, 'i')));
      if (!term.match(/^i(&i)*$/)) {
        throw new Error('Invalid expression: ' + src);
      }
    });

    parsed2.src = this.injectEnt(parsed3, 'i');
    parsed2.src = parsed2.src.replace(VARIABLES, this.parseVar.bind(this));
    parsed1.src = this.injectEnt(parsed2, '#');
    return this.injectEnt(parsed1, '@');
  };

  Parser.prototype.parseVar = function(src) {
    var args = Array.prototype.slice.call(arguments);
    var str = args.pop(), index = args.pop() + src.length;
    //quote bare object identifiers (might be a reserved word like {while: 1})
    if (str.charAt(index) == ':') {
      return '"' + src + '"';
    }
    src = src.replace(/\[([@#])\]/g, '.$1');
    src = src.replace(/\[.*?\]/g, '.$&');
    src = src.split('.').map(function(s) {
      return (s == '@') ? s : ((s.charAt(0) == '[') ? 'get("' + s.slice(1, -1) + '")' : '"' + s + '"');
    });
    return 'get(' + src.join(', ') + ')';
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
    //todo: try/catch or deal with invalid characters (linebreaks, control characters)
    return JSON.parse(str);
  };


  //the context 'this' inside tagHandlers is the parser instance
  var tagHandlers = {
    'if': function(expr) {
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
    'for': function(str) {
      var i = str.indexOf(' in ');
      var name = str.slice(0, i).trim();
      var expr = str.slice(i + 4).trim();
      this.push('each(' + this.parseExpr(expr) + ',' + JSON.stringify(name) + ',function() {');
      this.nest.unshift('for');
    },
    'endfor': function() {
      this.nest.shift();
      this.push('});');
    },
    'set': function(stmt) {
      var i = stmt.indexOf('=');
      var name = stmt.slice(0, i).trim();
      var expr = stmt.slice(i + 1).trim();
      this.push('set(' + JSON.stringify(name) + ',' + this.parseExpr(expr) + ');');
    },
    'block': function(name) {
      if (this.isParent) {
        ++this.parentBlocks;
        var blockName = 'block_' + (this.escName(name) || this.parentBlocks);
        this.push('block(typeof ' + blockName + ' == "function" ? ' + blockName + ' : function() {');
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

  var getRuntime = function runtime(data, opts) {
    var defaults = {autoEscape: 'html'};
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var toString = function(val) {
      return (val == null || typeof val.toString != 'function') ? '' : '' + val.toString();
    };
    var extend = function(dest, src) {
      Object.keys(src).forEach(function(key) {
        dest[key] = src[key];
      });
      return dest;
    };
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
        val = (_hasOwnProperty.call(val, n)) ? val[n] : (typeof val._get == 'function' ? (val[n] = val._get(n)) : null);
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
          arr[0] = val;
          //now arr looks like [val, arg1, arg2]
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
      var ctx = {loop: {length: len, first: arr[0], last: arr[len - 1]}};
      push(ctx);
      for (var i = 0; i < len; i++) {
        extend(ctx.loop, {index: i + 1, index0: i});
        fn1(ctx[loopvar] = arr[i]);
      }
      if (len == 0 && fn2) fn2();
      pop();
    };
    var block = function(fn) {
      push();
      fn();
      pop();
    };
    var render = function() {
      return output.join('');
    };
    data = data || {};
    opts = extend(defaults, opts || {});
    var filters = extend({
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
    }, opts.filters || {});
    var stack = [Object.create(data || {})], output = [];
    return {get: get, set: set, push: push, pop: pop, write: write, filter: filter, each: each, block: block, render: render};
  };

  var runtime;

  jinja.compile = function(markup, opts) {
    opts = opts || {};
    var parser = new Parser();
    parser.readTemplateFile = this.readTemplateFile;
    var code = [];
    code.push('function render($) {');
    code.push('var get = $.get, set = $.set, push = $.push, pop = $.pop, write = $.write, filter = $.filter, each = $.each, block = $.block;');
    code.push.apply(code, parser.parse(markup));
    code.push('return $.render();');
    code.push('}');
    code = code.join('\n');
    if (opts.runtime === false) {
      var fn = new Function('data', 'options', 'return (' + code + ')(runtime(data, options))');
    } else {
      runtime = runtime || (runtime = getRuntime.toString());
      fn = new Function('data', 'options', 'return (' + code + ')((' + runtime + ')(data, options))');
    }
    return {render: fn};
  };

  jinja.render = function(markup, data, opts) {
    var tmpl = jinja.compile(markup);
    return tmpl.render(data, opts);
  };

  jinja.readTemplateFile = function(name) {
    throw new Error('Not implemented: readTemplateFile');
  };

});