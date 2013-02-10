##Compatibility with Liquid

[Liquid markup][liquid] by Shopify is a Ruby template language very similar to Jinja (it is based on Django
just like Jinja) but it has a few differences. For compatibility, we have implemented the Liquid syntax as
well as the Jinja syntax in the following cases:

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
 - Object/Array literals are not valid in expressions; `for i in [1, 2]` is invalid
 - Filters are not valid in expressions; `foo|length > 1` is invalid

This is mostly to keep the codebase and rendering logic simple. The goal of this implementation is to
be slim and compile to readable JavaScript. There are other projects that aim to implement the complete
Jinja2 spec.

Also note:

 - `{% for n in object %}` will iterate the object's keys
 - subscript notation takes only literals, such as `a[0]` or `a["b"]`
 - filter arguments can only be literals
 - if property is not found, but method '_get' exists, it will be called with the property name (and cached)
