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

})();