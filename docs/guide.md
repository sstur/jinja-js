#Template Designer Documentation

This document describes the syntax and semantics of the template engine and
 will be most useful as reference to those creating Jinja templates. Most of
 this content is adapted from the official [Jinja2 Docs][jinjadocs].

## Synopsis

A template is simply a text file. It can generate any text-based format
 (HTML, XML, CSV etc.). It doesn't have a specific file extension, `.html`
 or `.xml` are just fine.

A template contains **variables** and **expressions**, which get replaced with
 values when the template is evaluated, and tags, which control the logic of
 the template. The template syntax is heavily inspired by Django and [almost
 completely compatible][liquid_compatibility] with [Liquid][liquid].

Below is a minimal template that illustrates a few basics. We will cover
 the details later in that document:

    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>My Webpage</title>
    </head>
    <body>
      <ul id="navigation">
      {% for item in navigation %}
        <li><a href="">{{ item.caption }}</a></li>
      {% endfor %}
      </ul>
      <h1>My Webpage</h1>
      {{ a_variable }}
    </body>
    </html>

There are two kinds of delimiters. `{% ... %}` and `{{ ... }}`. The first
 one is used to execute statements such as for-loops or assign values, the
 latter prints the result of the expression to the template.

## Variables

The application passes variables to the templates you can mess around in the
 template. Variables may have properties or elements on them you can access
 too. How a variable looks, heavily depends on the application providing
 those.

You can use dot-notation (`.`) to access properties of a variable, or the
 "subscript" syntax (`[]`) can be used. The following lines do the same:

    {{ foo.bar }}
    {{ foo['bar'] }}

It's important to know that the curly braces are *not* part of the variable.

If a variable or property does not exist you will get back `undefined` which
 will evaluate to an empty string if printed. Jinja will not throw an error
 if you try to access a property on undefined, but return undefined.

Implementation

In Jinja `foo.bar` (or `foo['bar']`) does the following:

*   check if there is a property *bar* on *foo*.
 
*   if there is not, check if there is a method `_get` on *foo*.

*   if so, call `_get('bar') and save the result on the property
    *bar* so we don't have to call _get again next time.

*   if there is not, return undefined.


## Filters

Variables can be modified by **filters**. Filters are separated from the
 variable by a pipe symbol (`|`) and may have optional arguments in
 parentheses (or using the "liquid" syntax). Multiple filters can be
 chained. The output of one filter is applied to the next.

`{{ name|striptags|upcase }}` for example might remove all HTML Tags from the
 *name* and then uppercase it. Filters that accept arguments have parentheses
 around the arguments, like a function call:

 `{{ list|join(', ') }}`.

 or the alternate "liquid" syntax with a colon:

 `{{ list|join: ", " }}`.

The only built-in filters are `html` and `safe` for use with escaping, but
 you can add filters passed to render(data, options) as part of the options
 argument.

## Output Literals

Jinja will honor anything in a string literal (single- or double-quoted) so
 the following will output a "}}" without treating it as part of a token:

 `{{ '}}' }}`

## Template Inheritance

The most powerful part of Jinja is template inheritance. Template inheritance
 allows you to build a base "skeleton" template that contains all the common
 elements of your site and define **blocks** that child templates can override.

Sounds complicated but is very basic. It's easiest to understand it by starting
 with an example.

### Base Template

This template, which we'll call `base`, defines a simple HTML skeleton
 document that you might use for a simple two-column page. It's the job of
 "child" templates to fill the empty blocks with content:

    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>{{ title }} - My Website</title>
      {% block head %}
      <link rel="stylesheet" href="style.css" />
      {% endblock %}
    </head>
    <body>
      <div id="content">{% block content %}{% endblock %}</div>
      <div id="footer">
        {% block footer %}
        (c) Copyright 2013 by <a href="http://example.com/">you</a>.
        {% endblock %}
      </div>
    </body>
    </html>

In this example, the `{% block %}` tags define four blocks that child templates
 can fill in. All the *block* tag does is to tell the template engine that a
 child template *may* override those portions of the template.

### Child Template

A child template might look like this:

    {% set title = "Home" %}
    {% extends "base" %}
    {% block head %}
      <link rel="stylesheet" href="home.css" />
    {% endblock %}
    {% block content %}
      <h1>Index</h1>
      <p class="important">
        Welcome on my awesome homepage.
      </p>
    {% endblock %}

The `{% extends %}` tag is the key here. It tells the template engine that
 this template "extends" another template. When the template system evaluates
 this template, first it locates the parent. The extends tag should be before
 any content or blocks. Everything before it is printed out normally and
 may cause confusion. However set/assign statements can be before it to set
 variables that will be available inside the parent template.

Note that since the child template doesn't define the `footer` block, the
 value from the parent template is used instead.

The name of the template must be a string literal and will be passed to the
 template loader. For example the `FileSystemLoader` allows you to access
 other templates by giving the filename. You can pass any string including
 with path-like name that may be interpreted by your *readTemplateFile*
 method:

    {% extends "layout/main" %}

But this behavior can depend on the application's *readTemplateFile* method.

You can't define multiple `{% block %}` tags with the same name in the
 same template. This limitation exists because a block tag works in "both"
 directions. That is, a block tag doesn't just provide a hole to fill - it
 also defines the content that fills the hole in the *parent*. If there
 were two similarly-named `{% block %}` tags in a template, that template's
 parent wouldn't know which one of the blocks' content to use.

### Block Nesting

Blocks can not be nested at this time. This feature is not implemented and
 may cause unpredictable results.


## HTML Escaping

When generating HTML from templates, there's always a risk that a variable will
 include characters that affect the resulting HTML. There are two approaches:
 manually escaping each variable or automatically escaping everything by default.

Jinja supports both, but what is used depends on the application configuration.
 The default configuration is automatic escaping.

### Working with Automatic Escaping

When automatic escaping is enabled (on by default) everything is escaped except
 expressions explicitly marked as safe. Those are marked by using the *|safe*
 filter `{{ user.description | safe }}` or by using the "liquid" syntax
 `{{{ user.description }}}` both of which are equivelent.

### Working with Automatic Escaping Disabled

If automatic escaping is disabled it's **your** responsibility to escape
 variables if needed. What to escape? In HTML, if you have a variable that
 *may* include any of the following chars (`>`, `<`, `&`, or `"`) you
 must escape it unless the variable contains well-formed and trusted
 HTML. As a rule of thumb, you should escape anything that came from an
 outside source (like a form post or on the query-string) to help prevent
 against cross-site scripting attacks. Escaping works by piping the
 variable through the `|html` filter: `{{ user.username | html }}`.

## List of Control Structures

A control structure refers to all those things that control the flow of a
 program - conditionals (i.e. if/elseif/else), for-loops, as well as things like
 macros and blocks. Control structures appear inside `{% ... %}` blocks
 in the default syntax.

### For

Loop over each item in a sequence. For example, to display a list of users
 provided in a variable called *users*:

    <h1>Members</h1>
    <ul>
    {% for user in users %}
      <li>{{ user.username }}</li>
    {% endfor %}
    </ul>

Inside of a for loop block you can access some special variables:

 - *loop.index*: The current iteration of the loop. (1 indexed)

 - *loop.index0*: The current iteration of the loop. (0 indexed)

 - *loop.first*: True if first iteration.

 - *loop.last*: True if last iteration.

 - *loop.length*: The number of items in the sequence.

It's not possible to *break* or *continue* in a loop. You can however
 filter the sequence during iteration which allows you to skip items.
 The following example skips all the users which are hidden:

    {% for user in users %}
      {% if not user.hidden %}
        <li>{{ user.username }}</li>
      {% endif %}
    {% endfor %}

If no iteration took place because the sequence was empty you can render a
 replacement block by using *else*:

    <ul>
    {% for user in users %}
      <li>{{ user.username }}</li>
    {% else %}
      <li><em>no users found</em></li>
    {% endfor %}
    </ul>

### If

The *if* statement in Jinja is just like the if statement in JavaScript but
 the parentheses are optional. In the simplest form you can use it to test
 if a variable is defined and not falsy (null, undefined, 0 or empty
 string):

    {% if users %}
    <ul>
    {% for user in users %}
      <li>{{ user.username }}</li>
    {% endfor %}
    </ul>
    {% endif %}

For multiple branches *elseif* and *else* can be used (for compatibility
 *elif* can be used as an alternative to *elseif*). You can use more complex
 expressions there too:

    {% if kenny.sick %}
      Kenny is sick.
    {% elseif kenny.dead %}
      You killed Kenny!
    {% else %}
      Kenny looks okay --- so far
    {% endif %}

### Extends

The *extends* tag can be used to extend a template from another one. You
 can have multiple of them in a file but only one of them may be executed
 at the time. See the section *Template
 Inheritance* above.

### Block

Blocks are used for inheritance and act as placeholders and replacements
 at the same time. They are documented in detail as part of the section
 *Template Inheritance* above.

### Include

The *include* statement is useful to include a template and return the
 rendered contents of that file into the current namespace:

    {% include 'header' %}
      Body
    {% include 'footer' %}

Included templates have access to the variables of the active context by
 default.

[jinjadocs]: http://jinja.pocoo.org/docs/templates/
[liquid]: http://liquidmarkup.org/
[liquid_compatibility]: /compatibility.md
