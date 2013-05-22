/*global require, describe, it*/
(function() {
  "use strict";

  var expect = require('expect.js');
  var jinja = require('./lib/helpers');

  var filters = {
    add: function(val, i) {
      return val + i;
    },
    split: function(str, sep) {
      return String(str).split(sep + '');
    },
    join: function(arr, sep) {
      return Array.isArray(arr) ? arr.join(sep + '') : '';
    }
  };

  describe('Values and Literals:', function() {

    it('tests string literals', function() {
      var tpl = jinja.compile('{{ "abc" }}');
      expect(tpl({})).to.equal('abc');

      tpl = jinja.compile("{{ 'abc' }}");
      expect(tpl({})).to.equal('abc');

      tpl = jinja.compile("{{ '}}' }}");
      expect(tpl({})).to.equal('}}');
    });

    it('tests other literals', function() {
      var tpl = jinja.compile("{{ 0 }}");
      expect(tpl({})).to.equal('0');

      tpl = jinja.compile("{{ true }}");
      expect(tpl({})).to.equal('true');

      tpl = jinja.compile("{{ false }}");
      expect(tpl({})).to.equal('false');

      tpl = jinja.compile("{{ null }}");
      expect(tpl({})).to.equal('');
    });

  });

  describe('Variables and Subscript Access:', function() {

    it('tests string literals', function() {
      var tpl = jinja.compile('{{ foo.bar }}');
      expect(tpl({foo: {bar: 'baz'}})).to.equal('baz');

      tpl = jinja.compile('{{ foo["bar"] }}');
      expect(tpl({foo: {bar: 0}})).to.equal('0');

      tpl = jinja.compile("{{ foo[''] }}");
      expect(tpl({foo: {'': false}})).to.equal('false');

      tpl = jinja.compile("{{ a[b].c }}");
      expect(tpl({a: {x: {c: 1}}, b: 'x'})).to.equal('1');

      tpl = jinja.compile('{{ foo[1] }}');
      expect(tpl({foo: {'1': 2}})).to.equal('2');

      tpl = jinja.compile("{{ foo[0] }}");
      expect(tpl({foo: [3, 4]})).to.equal('3');
    });

  });

  it('throws on bad accessor syntax', function() {
    var fn1 = function() {
      jinja.compile('{{ a.b[] }}');
    };
    var fn2 = function() {
      jinja.compile('{{ a.b & a.c }}');
    };
    var fn3 = function() {
      jinja.compile('{{ item.2 }}');
    };
    expect(fn1).to.throwException();
    expect(fn2).to.throwException();
    expect(fn3).to.throwException();
  });

  describe('Unescaped Output:', function() {

    it('tests string literals', function() {
      var tpl = jinja.compile("{{{ text }}}");
      expect(tpl({text: 'plain'})).to.equal('plain');

      tpl = jinja.compile("{{{ html }}}");
      expect(tpl({html: '<br>'})).to.equal('<br>');

      tpl = jinja.compile('{{{ "a>c" }}}');
      expect(tpl({})).to.equal('a>c');
    });

  });

  describe('Raw Output:', function() {

    it('tests content within {%raw%} blocks', function() {
      var tpl = jinja.compile("{%raw%}{{{a}}}{{endraw}}{%'endraw'%}{#comment#}{%}%}{{{{%endraw%}");
      expect(tpl({text: 'plain'})).to.equal("{{{a}}}{{endraw}}{%'endraw'%}{#comment#}{%}%}{{{");

      tpl = jinja.compile("{%raw%}{%{%endraw%}");
      expect(tpl({})).to.equal('{%');

      tpl = jinja.compile("{%raw-%} {% {%-endraw%}");
      expect(tpl({})).to.equal('{%');
    });

  });

  describe('Tag: set/assign:', function() {

    it('sets any value as a variable in the current context', function() {
      expect(jinja.compile('{% assign count = 0 %}{{ count }}')({})).to.equal('0');
      expect(jinja.compile('{% set foo = "bar" %} {{ foo }}')({})).to.equal(' bar');
      expect(jinja.compile('{% set foo = ["hi", "bye"] %} {{ foo[0] }}')({})).to.equal(' hi');
      expect(jinja.compile('{% set foo = { bar: "bar" } %} {{ foo.bar }}')({})).to.equal(' bar');
      expect(jinja.compile('{% set foo = 99 %} {{ foo }}')({})).to.equal(' 99');
      expect(jinja.compile('{% set foo = true %}{% if foo == true %}hi{% endif %}')({})).to.equal('hi');
    });

    it('sets for current context', function() {
      expect(jinja.compile('{% set foo = true %}{% if foo %}{% set foo = false %}{% endif %}{{ foo }}')()
      )
          .to.equal('false');
    });

    it('sets across blocks', function() {
      expect(jinja.compile('{% set foo = "foo" %}{% block a %}{{ foo }}{% set foo = "bar" %}{% endblock %}{{ foo }}{% block b %}{{ foo }}{% endblock %}')())
          .to.equal('foobarbar');
    });

    //it('sets across extends', function() {
    //  jinja.compile('{% block a %}{{ foo }}{% endblock %}', { filename: 'a' });
    //  expect(jinja.compile('{% extends "a" %}{% set foo = "bar" %}')()
    //  ).to.equal('bar');
    //});
  });

  describe('Filter:', function() {
    var opts = {filters: filters};

    function testFilter(filter, input, output, message) {
      it(message, function() {
        var tpl = jinja.compile('{{ v|' + filter + ' }}');
        expect(tpl(input, opts)).to.eql(output);
      });
    }

    describe('numbers and strings:', function() {
      var tpl = jinja.compile('{{ 0|add(1) }}');
      expect(tpl({}, opts)).to.equal('1');

      tpl = jinja.compile("{{ '0'|add(1) }}");
      expect(tpl({}, opts)).to.equal('01');

      testFilter('add(2)', { v: 1 }, '3', 'add numbers');
      testFilter('add(2)', { v: '1' }, '12', 'string number is not real number');
      testFilter('add(2)', { v: 'foo' }, 'foo2', 'string var turns addend into a string');
      testFilter('add("bar")', { v: 'foo' }, 'foobar', 'strings concatenated');
      testFilter('split("|")|join(":")', { v: 'a|b|c' }, 'a:b:c', 'string split join with pipe and colon');
      testFilter('split:":" | join:")"', { v: 'a:b:c' }, 'a)b)c', 'test alternate (liquid-style) filter args');

      tpl = jinja.compile("{{ 0 || [1, 'a', false] | join('|') }}");
      expect(tpl({}, opts)).to.equal('1|a|false');
    });

    it('set number is really a number', function() {
      var opts = {filters: filters};
      expect(jinja.compile('{% set foo = 1 %}{{ foo|add(1) }}')({}, opts))
          .to.equal('2');
      expect(jinja.compile('{% set foo = "1" %}{{ foo|add(1) }}')({}, opts))
          .to.equal('11');
      expect(jinja.compile('{% set bar = 1 %} {% set foo = bar %}{{ foo|add(1) }}')({}, opts))
          .to.equal(' 2');
    });

    describe('html:', function() {
      testFilter('html', { v: '<&>' }, '&lt;&amp;&gt;', 'Unescaped output');
    });

    describe('safe:', function() {
      testFilter('safe', { v: '<&>' }, '<&>', 'Unescaped output');
    });

    describe('alternate syntax:', function() {
      var tpl = jinja.compile('{{ 0 | add: 1 }}');
      expect(tpl({}, opts)).to.equal('1');

      tpl = jinja.compile('{{ "a" | add: "b" }}');
      expect(tpl({}, opts)).to.equal('ab');
    });

  });

  describe('Whitespace Control:', function() {

    it('leading and trailing whitespace', function() {
      var tpl = jinja.compile(' {{- "abc" }} ');
      expect(tpl({})).to.equal('abc ');

      tpl = jinja.compile(" {{ 'abc' -}} ");
      expect(tpl({})).to.equal(' abc');

      tpl = jinja.compile(' {{{- "a>c" }}} ');
      expect(tpl({})).to.equal('a>c ');

      tpl = jinja.compile(" {{{ 'a&c' -}}} ");
      expect(tpl({})).to.equal(' a&c');
    });

  });

  describe('Tag: if:', function() {

    it('tests truthy and falsy values', function() {
      var tpl = jinja.compile('{% if foo %}hi!{% endif %}{% if bar %}nope{% endif %}');
      expect(tpl({ foo: 1, bar: false })).to.equal('hi!');

      tpl = jinja.compile('{% if !foo %}hi!{% endif %}{% if !bar %}nope{% endif %}');
      expect(tpl({ foo: 1, bar: false }))
        .to.equal('nope');
    });

    it('can use not in place of !', function() {
      var tpl = jinja.compile('{% if not foo %}hi!{% endif %}{% if not bar %}nope{% endif %}');
      expect(tpl({ foo: true, bar: false }))
        .to.equal('nope', 'not operator');
    });

    it('can use && and ||', function() {
      var tpl = jinja.compile('{% if foo && (bar || baz) %}hi!{% endif %}');
      expect(tpl({ foo: true, bar: true })).to.equal('hi!');
      expect(tpl({ foo: true, baz: true })).to.equal('hi!');
      expect(tpl({ foo: false })).to.equal('');
      expect(tpl({ foo: true, bar: false, baz: false })).to.equal('');
    });

    it('can use "and" and "or" instead', function() {
      var tpl = jinja.compile('{% if foo and bar %}hi!{% endif %}');
      expect(tpl({ foo: true, bar: true })).to.equal('hi!');

      tpl = jinja.compile('{% if foo or bar %}hi!{% endif %}');
      expect(tpl({ foo: false, bar: true })).to.equal('hi!');
    });

    it('can use the "%" operator', function() {
      var tpl = jinja.compile('{% if foo % 2 == 0 %}hi!{% endif %}');
      expect(tpl({ foo: 4 })).to.equal('hi!');

      tpl = jinja.compile('{% if foo % 2 == 0 %}hi!{% endif %}');
      expect(tpl({ foo: 5 })).to.equal('');

      tpl = jinja.compile('{% if foo % 2 %}hi!{% endif %}');
      expect(tpl({ foo: 4 })).to.equal('');

      tpl = jinja.compile('{% if foo % 2 %}hi!{% endif %}');
      expect(tpl({ foo: 3 })).to.equal('hi!');

    });

    it('throws on bad conditional syntax', function() {
      var fn1 = function() {
          jinja.compile('{% if foo bar %}{% endif %}');
        },
        fn2 = function() {
          jinja.compile('{% if foo !== > bar %}{% endif %}');
        },
        fn3 = function() {
          jinja.compile('{% if (foo %}{% endif %}');
        },
        fn4 = function() {
          jinja.compile('{% if foo > bar) %}{% endif %}');
        };
      expect(fn1).to.throwException();
      expect(fn2).to.throwException();
      expect(fn3).to.throwException();
      expect(fn4).to.throwException();
    });

    it('can accept some arbitrary parentheses', function() {
      var tpl = jinja.compile('{% if (foo) %}bar{% endif %}');
      expect(tpl({ foo: true })).to.equal('bar');

      tpl = jinja.compile('{% if ( foo ) %}bar{% endif %}');
      expect(tpl({ foo: true })).to.equal('bar');

      tpl = jinja.compile('{% if ( foo && (bar)) %}bar{% endif %}');
      expect(tpl({ foo: true, bar: true })).to.equal('bar');

      tpl = jinja.compile('{% if (( foo && (bar )) ) %}bar{% endif %}');
      expect(tpl({ foo: true, bar: true })).to.equal('bar');
    });

  });

  describe('Tag: else:', function() {

    it('gets used', function() {
      var tpl = jinja.compile('{% if foo.length > 1 %}hi!{% else %}nope{% endif %}');
      expect(tpl({ foo: [1, 2, 3] })).to.equal('hi!');
      expect(tpl({ foo: [1] })).to.equal('nope');
    });

    it('throws if used outside of "if" context', function() {
      var fn = function() {
        jinja.compile('{% else %}');
      };
      expect(fn).to.throwException();
    });

    describe('elseif:', function() {
      it('works nicely', function() {
        var tpl = jinja.compile('{% if foo.length > 2 %}foo{% elseif foo.length < 2 %}bar{% endif %}');
        expect(tpl({ foo: [1, 2, 3] })).to.equal('foo');
        expect(tpl({ foo: [1, 2] })).to.equal('');
        expect(tpl({ foo: [1] })).to.equal('bar');
      });

      it('accepts conditionals', function() {
        var tpl = jinja.compile('{% if foo %}foo{% elseif bar && baz %}bar{% endif %}');
        expect(tpl({ bar: true, baz: true })).to.equal('bar');
      });
    });

    it('can have multiple elseif and else conditions', function() {
      var tpl = jinja.compile('{% if foo %}foo{% elseif bar === "bar" %}bar{% elseif baz.length == 2 %}baz{% else %}bop{% endif %}');
      expect(tpl({ foo: true })).to.equal('foo');
      expect(tpl({ bar: "bar" })).to.equal('bar');
      expect(tpl({ baz: [3, 4] })).to.equal('baz');
      expect(tpl({ baz: [2] })).to.equal('bop');
      expect(tpl({ bar: false })).to.equal('bop');
    });

    describe('in "for" tags:', function() {
      it('can be used as fallback', function() {
        var tpl = jinja.compile('{% for foo in bar %}blah{% else %}hooray!{% endfor %}');
        expect(tpl({ bar: [] })).to.equal('hooray!');
        expect(tpl({ bar: {}})).to.equal('hooray!');

        expect(tpl({ bar: [1] })).to.equal('blah');
        expect(tpl({ bar: { foo: 'foo' }})).to.equal('blah');
      });

      it('throws if using "elseif"', function() {
        var fn = function() {
          jinja.compile('{% for foo in bar %}hi!{% elseif blah %}nope{% endfor %}');
        };
        expect(fn).to.throwException();
      });
    });
  });

  describe('Tag: for:', function() {

    var tpl = jinja.compile('{% for foo in bar %}{{ foo }}, {% endfor %}');
    it('loops arrays', function() {
      expect(tpl({ bar: ['foo', 'bar', 'baz'] })).to.equal('foo, bar, baz, ');
    });

    it('loops objects', function() {
      expect(tpl({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }})).to.equal('baz, pow, foo, ');
    });

    it('loops object literals', function() {
      tpl = jinja.compile("{% for foo in {baz: 'foo', pow: 'bar'} %}{{ foo }}, {% endfor %}");
      expect(tpl({})).to.equal('baz, pow, ');
    });

    it('loops object literals', function() {
      tpl = jinja.compile('{%for n in {a: 1, b: "b"} %}{{ foo[n] }}{% endfor %}');
      expect(tpl({foo: {a: 'a', b: 2}})).to.equal('a2');
    });

    describe('loop object:', function() {
      it('index0', function() {
        var tpl = jinja.compile('{% for foo in bar %}[{{ loop.index0 }}, {{ foo }}]{% endfor %}');
        expect(tpl({ bar: ['foo', 'bar', 'baz'] })).to.equal('[0, foo][1, bar][2, baz]');
        expect(tpl({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }})).to.equal('[0, baz][1, pow][2, foo]');
      });

      it('context', function() {
        var inner = jinja.compile('{{ f }}', { filename: "inner" }),
          tpl = jinja.compile('{{ f }}{% for f in bar %}{{ f }}{% include "inner" %}{{ f }}{% endfor %}{{ f }}');
        expect(tpl({ f: 'z', bar: ['a'] })).to.equal('zaaaz');
        expect(tpl({ bar: ['a'] })).to.equal('aaa');
      });

      it('index', function() {
        var tpl = jinja.compile('{% for foo in bar %}{{ loop.index }}{% endfor %}');
        expect(tpl({ bar: ['foo', 'bar', 'baz'] })).to.equal('123');
        expect(tpl({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }})).to.equal('123');
      });

      it('index0', function() {
        var tpl = jinja.compile('{% for foo in bar %}{{ loop.index0 }}{% endfor %}');
        expect(tpl({ bar: ['foo', 'bar', 'baz'] })).to.equal('012');
        expect(tpl({ bar: { baz: 'foo', pow: 'bar', foo: 'baz' }})).to.equal('012');
      });

    });

  });

  describe('Tag: include:', function() {

    it('includes the given template', function() {
      jinja.compile('{{array.length}}', { filename: 'included_2.html' });
      expect(jinja.compile('{% include "included_2.html" %}')({ array: ['foo'] }))
        .to.equal('1');
    });

    it('includes from parent templates', function() {
      jinja.compile('foobar', { filename: 'foobar' });
      jinja.compile('{% include "foobar" %}', { filename: 'parent' });
      expect(jinja.compile('{% extends "parent" %}')())
        .to.equal('foobar');
    });

  });

  //describe('Tag: extends:', function() {
  //
  //  it('throws on circular references', function() {
  //    var circular1 = "{% extends 'extends_circular2.html' %}{% block content %}Foobar{% endblock %}",
  //      circular2 = "{% extends 'extends_circular1.html' %}{% block content %}Barfoo{% endblock %}",
  //      fn = function() {
  //        jinja.compile(circular1, { filename: 'extends_circular1.html' });
  //        jinja.compile(circular2, { filename: 'extends_circular2.html' })();
  //      };
  //    expect(fn).to.throwException();
  //  });
  //
  //  it('throws if not first tag', function() {
  //    var fn = function() {
  //      jinja.compile('asdf {% extends foo %}')();
  //    };
  //    expect(fn).to.throwException();
  //  });
  //});

  describe('Tag: block:', function() {

    it('basic', function() {
      var tpl,
        extends_base = [
          'This is from the "extends_base" template.',
          '',
          '{% block one %}',
          '  This is the default content in block `one`',
          '{% endblock %}',
          '',
          '{% block two %}',
          '  This is the default content in block `two`',
          '{% endblock %}'
        ].join('\n'),
        extends1 = [
          '{% extends "extends_base" %}',
          'This is content from "extends_1", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_1" content in block `one`',
          '{% endblock %}'
        ].join('\n');

      jinja.compile(extends_base, { filename: 'extends_base' });
      tpl = jinja.compile(extends1, { filename: 'extends1' });
      expect(tpl({})).to.equal('This is from the "extends_base" template.\n\n\n  This is the "extends_1" content in block `one`\n\n\n\n  This is the default content in block `two`\n');
    });

    it('can chain extends', function() {
      var tpl,
        extends_base = [
          'This is from the "extends_base" template.',
          '',
          '{% block one %}',
          '  This is the default content in block `one`',
          '{% endblock %}',
          '',
          '{% block two %}',
          '  This is the default content in block `two`',
          '{% endblock %}'
        ].join('\n'),
        extends1 = [
          '{% extends "extends_base" %}',
          'This is content from "extends_1", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_1" content in block `one`',
          '{% endblock %}'
        ].join('\n'),
        extends2 = [
          '{% extends "extends1" %}',
          'This is content from "extends_2", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_2" content in block `one`',
          '{% endblock %}'
        ].join('\n');

      jinja.compile(extends_base, { filename: 'extends_base' });
      jinja.compile(extends1, { filename: 'extends1' });
      tpl = jinja.compile(extends2, { filename: 'extends2' });
      expect(tpl({})).to.equal('This is from the "extends_base" template.\n\n\n  This is the "extends_2" content in block `one`\n\n\n\n  This is the default content in block `two`\n');
    });

  });

})();