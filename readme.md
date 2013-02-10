#JavaScript templating engine based on Jinja2

Jinja is one of the most used template engines for Python. This project is a JavaScript implementation with emphasis
on simplicity and performance, compiling templates into [readable JavaScript][demo] that minifies well. It is designed
to run on Node or in the [browser][demo] and weighs in around 2.8K (min + gzip).

Jinja was inspired by [Django's templating system][django], just like Ruby's [Liquid][liquid] and PHP's [Twig][twig].
They all have similar syntax for rendering variables, looping and filtering.

Like its [homepage](http://jinja.pocoo.org/) says, "Jinja is beautiful":

```
{% extends "layout.html" %}
{% block body %}
  <ul>
  {% for user in users %}
    <li><a href="{{ user.url }}">{{ user.username }}</a></li>
  {% endfor %}
  </ul>
{% endblock %}
```

[View Online Demo][demo]

##Features

This implementation of Jinja supports auto-escaping output (by default html), extensible filters, template
inheritance, block scope, for/else and safe compilation to dependence-free javascript function.

It should run on any browser or JS environment that supports ES5 (use es5-shim on IE8 and below) and JSON.

##Documentation

Thorough documentation for Jinja2 can be found [here][jinjadocs], however ours deviates from the
official implementation as follows:

 - Line statements, whitespace control, cycle, super, macros are not implemented
 - auto escapes html by default (the filter is "html" not "e")
 - Only "html" and "safe" filters are built in
 - Object/Array literals are not valid in expressions; `for i in [1, 2]` is invalid
 - Filters are not valid in expressions; `foo|length > 1` is invalid

Note:

 - `{% for n in object %}` will iterate the object's keys
 - subscript notation takes only literals, such as `a[0]` or `a["b"]`
 - filter arguments can only be literals
 - if property is not found, but method '_get' exists, it will be called with the property name (and cached)

##Test Coverage

The tests use Mocha and were adapted from another excellent [project][swig].

##Existing Implementations

There are several existing JavaScript implementations of the Jinja family of templating languages, many of which have
different objectives than this project and may be suitable for some projects but not others. Some worth mentioning
include [Nunjucks][nunjucks], [Swig][swig], [JinJS][jinjs], [Plate][plate] and [Liquid.js][liquidjs].

[demo]: http://sstur.com/jinja/demo/
[django]: http://docs.djangoproject.com/en/dev/ref/templates/builtins/
[liquid]: http://liquidmarkup.org/
[twig]: http://twig.sensiolabs.org/
[jinjadocs]: http://jinja.pocoo.org/docs/templates/
[nunjucks]: http://github.com/jlongster/nunjucks
[swig]: http://github.com/paularmstrong/swig
[jinjs]: http://github.com/ravelsoft/node-jinjs
[plate]: http://github.com/chrisdickinson/plate
[liquidjs]: http://github.com/darthapo/liquid.js
