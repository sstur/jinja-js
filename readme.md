#JavaScript templating engine based on Jinja2

Jinja is one of the most used [template engines for Python][jinja2]. This project is a JavaScript implementation with emphasis on simplicity and performance, compiling templates into [readable JavaScript][demo] that minifies well. It is designed to run on Node or in the [browser][demo] and weighs in at 8.3KB minified / 3.2K gzip'd.

Jinja is inspired by [Django's templating system][django], just like Ruby's [Liquid][liquid] and PHP's [Twig][twig]. They all have similar syntax for rendering variables, looping and filtering. This implementation aims to be compatible with Jinja2 and Liquid, but Twig is mostly the same also.

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

##Demo

[View Online Demo here.][demo]


##Features

This implementation of Jinja supports auto-escaping output by default, extensible filters, template inheritance, block scope, for/else and safe compilation to dependence-free javascript function.

We also add support for **dynamic getter methods**. For instance, lets say a given object `products` has a method `_get()` and a non-existent property is referenced like `{{ products.related }}`. Jinja will call `products._get('related')` and attach the result to products.related. Then it will continue processing the template.

It should run on any browser or JS environment that supports ES5 (use es5-shim on IE8 and below) and JSON. No other libraries required.


##Documentation

Detailed documentation [can be found here][docs].


##Compatibility with Liquid

[Liquid markup][liquid] by Shopify is a Ruby template language very similar to Jinja (it is based on Django just like Jinja) but it has a few differences. For compatibility, we have implemented the Liquid syntax as well as the Jinja syntax in the following cases:

 * Liquid: `{{{ html }}}` is equivalent to Jinja `{{ html | safe }}`
 * Liquid: `{{ string | split: ',' }}` is equivalent to Jinja: `{{ string | split(',') }}`
 * Liquid: `{{ assign a = 2 }}` is equivalent to Jinja: `{{ set a = 2 }}`

In those cases, this implementation will allow either syntax. However the following is not implemented:

 * Liquid: `{% comment %} my comment {% endcomment %}`

You must use Jinja's comment syntax: `{# my comment #}`


##Differences from Python's Jinja2

This implementation deviates from the official [Jinja2][jinja2] as follows:

 - Line statements, cycle, super, macros and block nesting are not implemented
 - Auto escapes html by default (the filter is "html" not "e")
 - Only "html" and "safe" filters are built in
 - Filters are not valid in expressions; `foo|length > 1` is not valid
 - Expression Tests (`if num is odd`) not implemented (`is` translates to `==` and `isnot` to `!=`)

This is mostly to keep the codebase and rendering logic simple. The goal of this implementation is to be slim and compile to readable JavaScript. There are other projects that aim to implement the complete Jinja2 spec.

Also note:

 - if property is not found, but method '_get' exists, it will be called with the property name (and cached)
 - `{% for n in obj %}` iterates the object's keys; get the value with `{% for n in obj %}{{ obj[n] }}{% endfor %}`
 - subscript notation `a[0]` takes literals or simple variables but not `a[item.key]`
 - `.2` is not a valid number literal; use `0.2`

To-Do:

 - ExpressJS Support
 - variables as functions: `getUser(4).name`
 - properties as methods: `users[0].getName()`


##Test Coverage

The tests use Mocha and were adapted from a similar and excellent [project][swig].


##Existing Implementations

There are several existing JavaScript implementations of the Jinja family of templating languages, many of which have different objectives than this project and may be suitable for some projects but not others. Some worth mentioning include [Nunjucks][nunjucks], [Swig][swig], [JinJS][jinjs], [Plate][plate] and [Liquid.js][liquidjs].


[docs]: docs/guide.md
[demo]: http://sstur.com/jinja-js/demo/
[django]: http://docs.djangoproject.com/en/dev/ref/templates/builtins/
[liquid]: http://liquidmarkup.org/
[twig]: http://twig.sensiolabs.org/
[jinja2]: http://jinja.pocoo.org/
[nunjucks]: http://github.com/jlongster/nunjucks
[swig]: http://github.com/paularmstrong/swig
[jinjs]: http://github.com/ravelsoft/node-jinjs
[plate]: http://github.com/chrisdickinson/plate
[liquidjs]: http://github.com/darthapo/liquid.js
