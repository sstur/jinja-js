/*global require, describe, it*/
(function() {
  "use strict";

  var expect = require('expect.js');
  var jinja = require('./lib/helpers');

  describe('Tag: block', function () {

    it('basic', function () {
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

    it('can chain extends', function () {
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

  describe('Tag: else', function () {

    it('gets used', function () {
      var tpl = jinja.compile('{% if foo.length > 1 %}hi!{% else %}nope{% endif %}');
      expect(tpl({ foo: [1, 2, 3] })).to.equal('hi!');
      expect(tpl({ foo: [1] })).to.equal('nope');
    });

    it('throws if used outside of "if" context', function () {
      var fn = function () {
        jinja.compile('{% else %}');
      };
      expect(fn).to.throwException();
    });

    describe('elseif', function () {
      it('works nicely', function () {
        var tpl = jinja.compile('{% if foo.length > 2 %}foo{% elseif foo.length < 2 %}bar{% endif %}');
        expect(tpl({ foo: [1, 2, 3] })).to.equal('foo');
        expect(tpl({ foo: [1, 2] })).to.equal('');
        expect(tpl({ foo: [1] })).to.equal('bar');
      });

      it('accepts conditionals', function () {
        var tpl = jinja.compile('{% if foo %}foo{% elseif bar && baz %}bar{% endif %}');
        expect(tpl({ bar: true, baz: true })).to.equal('bar');
      });
    });

    it('can have multiple elseif and else conditions', function () {
      var tpl = jinja.compile('{% if foo %}foo{% elseif bar === "bar" %}bar{% elseif baz.length == 2 %}baz{% else %}bop{% endif %}');
      expect(tpl({ foo: true })).to.equal('foo');
      expect(tpl({ bar: "bar" })).to.equal('bar');
      expect(tpl({ baz: [3, 4] })).to.equal('baz');
      expect(tpl({ baz: [2] })).to.equal('bop');
      expect(tpl({ bar: false })).to.equal('bop');
    });

    //describe('in "for" tags', function () {
    //  it('can be used as fallback', function () {
    //    var tpl = jinja.compile('{% for foo in bar %}blah{% else %}hooray!{% endfor %}');
    //    expect(tpl({ bar: [] })).to.equal('hooray!');
    //    expect(tpl({ bar: {}})).to.equal('hooray!');
    //
    //    expect(tpl({ bar: [1] })).to.equal('blah');
    //    expect(tpl({ bar: { foo: 'foo' }})).to.equal('blah');
    //  });
    //
    //  it('throws if using "elseif"', function () {
    //    var fn = function () {
    //      jinja.compile('{% for foo in bar %}hi!{% elseif blah %}nope{% endfor %}');
    //    };
    //    expect(fn).to.throwException();
    //  });
    //});
  });

})();