/*global require, describe, it*/
(function() {
  "use strict";

  var expect = require('expect.js');
  var jinja = require('./lib/helpers');

  describe('Tag: block', function () {

    it('basic', function () {
      var tpl,
        extends_base = [
          'This is from the "extends_base.html" template.',
          '',
          '{% block one %}',
          '  This is the default content in block \'one\'',
          '{% endblock %}',
          '',
          '{% block two %}',
          '  This is the default content in block \'two\'',
          '{% endblock %}'
        ].join('\n'),
        extends1 = [
          '{% extends "extends_base.html" %}',
          'This is content from "extends_1.html", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_1.html" content in block \'one\'',
          '{% endblock %}'
        ].join('\n');

      jinja.compile(extends_base, { filename: 'extends_base.html' });
      tpl = jinja.compile(extends1, { filename: 'extends1.html' });
      expect(tpl({})).to.equal('This is from the "extends_base.html" template.\n\n\n  This is the "extends_1.html" content in block \'one\'\n\n\n  This is the default content in block \'two\'\n');
    });

    it('can chain extends', function () {
      var tpl,
        extends_base = [
          'This is from the "extends_base.html" template.',
          '',
          '{% block one %}',
          '  This is the default content in block \'one\'',
          '{% endblock %}',
          '',
          '{% block two %}',
          '  This is the default content in block \'two\'',
          '{% endblock %}'
        ].join('\n'),
        extends1 = [
          '{% extends "extends_base.html" %}',
          'This is content from "extends_1.html", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_1.html" content in block \'one\'',
          '{% endblock %}'
        ].join('\n'),
        extends2 = [
          '{% extends "extends1.html" %}',
          'This is content from "extends_2.html", you should not see it',
          '',
          '{% block one %}',
          '  This is the "extends_2.html" content in block \'one\'',
          '{% endblock %}'
        ].join('\n');

      jinja.compile(extends_base, { filename: 'extends_base.html' });
      jinja.compile(extends1, { filename: 'extends1.html' });
      tpl = jinja.compile(extends2, { filename: 'extends2.html' });
      expect(tpl({})).to.equal('This is from the "extends_base.html" template.\n\n\n  This is the "extends_2.html" content in block \'one\'\n\n\n  This is the default content in block \'two\'\n');
    });

  });

})();