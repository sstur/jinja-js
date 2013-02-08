
[Permalink](https://dl.dropbox.com/u/341900/guide.html "Permalink to ")

# 

This document describes the syntax and semantics of the template engine and
 will be most useful as reference to those creating Jinja templates.

## Synopsis

A template is simply a text file. It can generate any text-based format
 (HTML, XML, CSV etc.). It doesn’t have a specific file extension,
 `.html` or `.xml`
 are just fine.

A template contains **variables** or **expressions**, which get replaced with
 values when the template is evaluated, and tags, which control the logic of
 the template. The template syntax is heavily inspired by Django and Python.

Below is a minimal template that illustrates a few basics. We will cover
 the details later in that document:

    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">
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
        {{ a_variabl
    </body>
    </html>

There are two kinds of delimiters. `{% ... %}` and `{{ ... }}`. The first
 one is used to execute statements such as for-loops or assign values, the
 latter prints the result of the expression to the template.

## Variables

The application passes variables to the templates you can mess around in the
 template. Variables may have attributes or elements on them you can access
 too. How a variable looks like, heavily depends on the application providing
 those.

You can use a dot (`.`) to access attributes of a
 variable, alternative the
 so-called “subscript” syntax (`[]`) can be used. The
 following lines do
 the same:

    {{ foo.bar }}
    {{ foo['bar'] }}

It’s important to know that the curly braces are *not* part of the variable
 but the print statement. If you access variables inside tags don’t put the
 braces around.

If a variable or attribute does not exist you will get back an undefined
 value. What you can do with that kind of value depends on the application
 configuration, the default behavior is that it evaluates to an empty string
 if printed and that you can iterate over it, but every other operation fails.

Implementation

For convenience sake `foo.bar` in Jinja2 does the
 following things on
 the Python layer:

*   check if there is an attribute called *bar* on *foo*.
 
*   if there is not, check if there is an item `'bar'` in
 *foo*.
 
 
*   if there is not, return an undefined object.
 

`foo['bar']` on the other hand works mostly the same
 with the a small
 difference in the order:

*   check if there is an item `'bar'` in *foo*.
 
 
*   if there is not, check if there is an attribute called *bar* on *foo*.
 
*   if there is not, return an undefined object.
 

This is important if an object has an item or attribute with the same
 name. Additionally there is the [`attr()`][1] filter that just looks up
 attributes.

## Filters

Variables can be modified by **filters**. Filters are separated from the
 variable by a pipe symbol (`|`) and may have optional
 arguments in
 parentheses. Multiple filters can be chained. The output of one filter is
 applied to the next.

`{{ name|striptags|titl` for example will remove all HTML Tags from the
 *name* and title-cases it. Filters that accept arguments have parentheses
 around the arguments, like a function call. This example will join a list
 by commas: `{{ list|join(', ') }}`.

The [*List of Builtin Filters*][2] below describes all
 the builtin filters.

## Escaping

It is sometimes desirable or even necessary to have Jinja ignore parts it
 would otherwise handle as variables or blocks. For example if the default
 syntax is used and you want to use `{{` as raw string in
 the template and
 not start a variable you have to use a trick.

The easiest way is to output the variable delimiter (`{{`)
 by using a
 variable expression:

For bigger sections it makes sense to mark a block *raw*. For example to
 put Jinja syntax as example into a template you can use this snippet:

    {% raw %}
        <ul>
        {% for item in seq %}
            <li>{{ item }}</li>
        {% endfor %}
        </ul>
    {% endraw %}

## Template Inheritance

The most powerful part of Jinja is template inheritance. Template inheritance
 allows you to build a base “skeleton” template that contains all the common
 elements of your site and defines **blocks** that child templates can override.

Sounds complicated but is very basic. It’s easiest to understand it by starting
 with an example.

### Base Template

This template, which we’ll call `base.html`, defines a
 simple HTML skeleton
 document that you might use for a simple two-column page. It’s the job of
 “child” templates to fill the empty blocks with content:

    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">
    <html lang="en">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        {% block head %}
        <link rel="stylesheet" href="https://dl.dropbox.com/style.css" />
        <title>{% block title %}{% endblock %} - My Webpage</title>
        {% endblock %}
    </head>
    <body>
        <div id="content">{% block content %}{% endblock %}</div>
        <div id="footer">
            {% block footer %}
            © Copyright 2008 by <a href="http://domain.invalid/">you</a>.
            {% endblock %}
        </div>
    </body>

In this example, the `{% block %}` tags define four blocks that child templates
 can fill in. All the *block* tag does is to tell the template engine that a
 child template may override those portions of the template.

### Child Template

A child template might look like this:

    {% extends "base.html" %}
    {% block title %}Index{% endblock %}
    {% block head %}
        {{ super() }}
        <style type="text/css">
            .important { color: #336699; }
        </style>
    {% endblock %}
    {% block content %}
        <h1>Index</h1>
        <p class="important">
          Welcome on my awesome homepage.
        </p>
    {% endblock %}

The `{% extends %}`
 tag is the key here. It tells the template engine that
 this template “extends” another template. When the template system evaluates
 this template, first it locates the parent. The extends tag should be the
 first tag in the template. Everything before it is printed out normally and
 may cause confusion. For details about this behavior and how to take
 advantage of it, see [*Null-Master
 Fallback*][3].

The filename of the template depends on the template loader. For example the
 `FileSystemLoader` allows you to access
 other templates by giving the
 filename. You can access templates in subdirectories with an slash:

    {% extends "layout/default.html" %}

But this behavior can depend on the application embedding Jinja. Note that
 since the child template doesn’t define the `footer`
 block, the value from
 the parent template is used instead.

You can’t define multiple `{% block %}` tags with the same name in the
 same template. This limitation exists because a block tag works in “both”
 directions. That is, a block tag doesn’t just provide a hole to fill - it
 also defines the content that fills the hole in the *parent*. If there
 were two similarly-named `{% block %}` tags in a template, that template’s
 parent wouldn’t know which one of the blocks’ content to use.

If you want to print a block multiple times you can however use the special
 *self* variable and call the block with that name:

    <title>{% block title %}{% endblock %}</title>
    <h1>{{ self.title() }}</h1>
    {% block body %}{% endblock %}

### Block Nesting and Scope

Blocks can be nested for more complex layouts. However per default blocks
 may not access variables from outer scopes:

    {% for item in seq %}
        <li>{% block loop_item %}{{ item }}{% endblock %}</li>
    {% endfor %}

This example would output empty `<li>` items
 because *item* is unavailable
 inside the block. The reason for this is that if the block is replaced by
 a child template a variable would appear that was not defined in the block or
 passed to the context.

Starting with Jinja 2.2 you can explicitly specify that variables are
 available in a block by setting the block to “scoped” by adding the *scoped*
 modifier to a block declaration:

    {% for item in seq %}
        <li>{% block loop_item scoped %}{{ item }}{% endblock %}</li>
    {% endfor %}

When overriding a block the *scoped* modifier does not have to be provided.

### Template Objects


 Changed in version 2.4.

If a template object was passed to the template context you can
 extend from that object as well. Assuming the calling code passes
 a layout template as *layout_template* to the environment, this
 code works:

    {% extends layout_template %}

Previously the *layout_template* variable had to be a string with
 the layout template’s filename for this to work.

## HTML Escaping

When generating HTML from templates, there’s always a risk that a variable will
 include characters that affect the resulting HTML. There are two approaches:
 manually escaping each variable or automatically escaping everything by default.

Jinja supports both, but what is used depends on the application configuration.
 The default configuaration is no automatic escaping for various reasons:

*   escaping everything except of safe values will also mean that Jinja is
 escaping variables known to not include HTML such as numbers which is
 a huge performance hit.
 
 
*   The information about the safety of a variable is very fragile. It could
 happen that by coercing safe and unsafe values the return value is double
 escaped HTML.
 
 

### Working with Manual Escaping

If manual escaping is enabled it’s **your** responsibility to escape
 variables if needed. What to escape? If you have a variable that *may*
 include any of the following chars (>, <, &amp;, or ") you
 **have to** escape it unless the variable contains well-formed and trusted
 HTML. Escaping works by piping the variable through the `|html` filter:
 `{{ user.username|html }}`.

### Working with Automatic Escaping

When automatic escaping is enabled everything is escaped by default except
 for values explicitly marked as safe. Those can either be marked by the
 application or in the template by using the *|safe* filter. The main
 problem with this approach is that Python itself doesn’t have the concept
 of tainted values so the information if a value is safe or unsafe can get
 lost. If the information is lost escaping will take place which means that
 you could end up with double escaped contents.

Double escaping is easy to avoid however, just rely on the tools Jinja2
 provides and don’t use builtin Python constructs such as the string modulo
 operator.

Functions returning template data (macros, *super*, *self.BLOCKNAME*) return
 safe markup always.

String literals in templates with automatic escaping are considered unsafe
 too. The reason for this is that the safe string is an extension to Python
 and not every library will work properly with it.

## List of Control Structures

A control structure refers to all those things that control the flow of a
 program - conditionals (i.e. if/elif/else), for-loops, as well as things like
 macros and blocks. Control structures appear inside `{% ... %}` blocks
 in the default syntax.

### For

Loop over each item in a sequence. For example, to display a list of users
 provided in a variable called *users*:

    <h1>Members</h1>
    <ul>
    {% for user in users %}
      <li>{{ user.username|</li>
    {% endfor %}
    </ul>

Inside of a for loop block you can access some special variables:

Variable
 

Description
 

*loop.index*
 

The current iteration of the loop. (1 indexed)
 

*loop.index0*
 

The current iteration of the loop. (0 indexed)
 

*loop.revindex*
 

The number of iterations from the end of the loop
 (1 indexed)
 
 

*loop.revindex0*
 

The number of iterations from the end of the loop
 (0 indexed)
 
 

*loop.first*
 

True if first iteration.
 

*loop.last*
 

True if last iteration.
 

*loop.length*
 

The number of items in the sequence.
 

*loop.cycle*
 

A helper function to cycle between a list of
 sequences. See the explanation below.
 
 

Within a for-loop, it’s possible to cycle among a list of strings/variables
 each time through the loop by using the special *loop.cycle* helper:

    {% for row in rows %}
        <li class="{{ loop.cycle('odd', 'even') }}">{{ row }}</li>
    {% endfor %}

With Jinja 2.1 an extra *cycle* helper exists that allows loop-unbound
 cycling. For more information have a look at the [*List of
 Global Functions*][4].

Unlike in Python it’s not possible to *break* or *continue* in a loop.
 You
 can however filter the sequence during iteration which allows you to skip
 items. The following example skips all the users which are hidden:

    {% for user in users if not user.hidden %}
        <li>{{ user.username|</li>
    {% endfor %}

The advantage is that the special *loop* variable will count correctly thus
 not counting the users not iterated over.

If no iteration took place because the sequence was empty or the filtering
 removed all the items from the sequence you can render a replacement block
 by using *else*:

    <ul>
    {% for user in users %}
        <li>{{ user.username|</li>
    {% else %}
        <li><em>no users found</em></li>
    {% endfor %}
    </ul>

It is also possible to use loops recursively. This is useful if you are
 dealing with recursive data such as sitemaps. To use loops recursively you
 basically have to add the *recursive* modifier to the loop definition and
 call the *loop* variable with the new iterable where you want to recurse.

The following example implements a sitemap with recursive loops:

    <ul class="sitemap">
    {% for item in sitemap recursive %}
        <li><a href="|">{{ item.titl</a>
        {% if item.children %}
            <ul class="submenu">{{ loop(item.children) }}</ul>
        {% endif %}</li>
    {% endfor %}
    </ul>

### If

The *if* statement in Jinja is comparable with the if statements of Python.
 In the simplest form you can use it to test if a variable is defined, not
 empty or not false:

    {% if users %}
    <ul>
    {% for user in users %}
        <li>{{ user.username|</li>
    {% endfor %}
    </ul>
    {% endif %}

For multiple branches *elif* and *else* can be used like in Python. You can
 use more complex [*Expressions*][5] there too:

    {% if kenny.sick %}
        Kenny is sick.
    {% elif kenny.dead %}
        You killed Kenny!  You bastard!!!
    {% else %}
        Kenny looks okay --- so far
    {% endif %}

If can also be used as [*inline expression*][6] and for
 [*loop filtering*][7].

### Macros

Macros are comparable with functions in regular programming languages. They
 are useful to put often used idioms into reusable functions to not repeat
 yourself.

Here a small example of a macro that renders a form element:

    {% macro input(name, value='', type='text', size=20) %}
        <input type="{{ typ" name="{{ nam" value="{{
            value|" size="{{ siz">
    {% endmacro %}

The macro can then be called like a function in the namespace:

    <p>{{ input('username') }}</p>
    <p>{{ input('password', type='password') }}</p>

If the macro was defined in a different template you have to
 [*import*][8] it first.

Inside macros you have access to three special variables:

*   *varargs*: If more positional arguments are passed to the macro than accepted by the
 macro they end up in the special *varargs* variable as list of values.
 
 
*   *kwargs*: Like *varargs* but for keyword arguments. All unconsumed keyword
 arguments are stored in this special variable.
 
 
*   *caller*: If the macro was called from a [*call*][9] tag the caller is
 stored
 in this variable as macro which can be called.
 
 

Macros also expose some of their internal details. The following attributes
 are available on a macro object:

*   *name*: The name of the macro. `{{ input.nam` will print `input`.
 
 
*   *arguments*: A tuple of the names of arguments the macro accepts.
 
*   *defaults*: A tuple of default values.
 
*   *catch_kwargs*: This is *true* if the macro accepts extra keyword arguments (ie: accesses
 the special *kwargs* variable).
 
 
*   *catch_varargs*: This is *true* if the macro accepts extra positional arguments (ie:
 accesses the special *varargs* variable).
 
 
*   *caller*: This is *true* if the macro accesses the special *caller* variable and may
 be called from a [*call*][9] tag.
 
 

If a macro name starts with an underscore it’s not exported and can’t
 be imported.

### Call

In some cases it can be useful to pass a macro to another macro. For this
 purpose you can use the special *call* block. The following example shows
 a macro that takes advantage of the call functionality and how it can be
 used:

    {% macro render_dialog(title, class='dialog') %}
        <div class="{{ class }}">
            <h2>{{ titl</h2>
            <div class="contents">
                {{ caller() }}
            </div>
        </div>
    {% endmacro %}
    
    {% call render_dialog('Hello World') %}
        This is a simple dialog rendered by using a macro and
        a call block.
    {% endcall %}

It’s also possible to pass arguments back to the call block. This makes it
 useful as replacement for loops. Generally speaking a call block works
 exactly like an macro, just that it doesn’t have a name.

Here an example of how a call block can be used with arguments:

    {% macro dump_users(users) %}
        <ul>
        {% for user in users %}
            <li><p>{{ user.username|</p>{{ caller(user) }}</li>
        {% endfor %}
        </ul>
    {% endmacro %}
    
    {% call(user) dump_users(list_of_user) %}
        <dl>
            <dl>Realname</dl>
            <dd>{{ user.realname|</dd>
            <dl>Description</dl>
            <dd>{{ user.description }}</dd>
        </dl>
    {% endcall %}

### Filters

Filter sections allow you to apply regular Jinja2 filters on a block of
 template data. Just wrap the code in the special *filter* section:

    {% filter upper %}
        This text becomes uppercase
    {% endfilter %}

### Assignments

Inside code blocks you can also assign values to variables. Assignments at
 top level (outside of blocks, macros or loops) are exported from the template
 like top level macros and can be imported by other templates.

Assignments use the *set* tag and can have multiple targets:

    {% set navigation = [('index.html', 'Index'), ('about.html', 'About')] %}
    {% set key, value = call_something() %}

### Extends

The *extends* tag can be used to extend a template from another one. You
 can have multiple of them in a file but only one of them may be executed
 at the time. See the section about [*Template
 Inheritance*][10] above.

### Block

Blocks are used for inheritance and act as placeholders and replacements
 at the same time. They are documented in detail as part of the section
 about [*Template Inheritance*][10].

### Include

The *include* statement is useful to include a template and return the
 rendered contents of that file into the current namespace:

    {% include 'header.html' %}
        Body
    {% include 'footer.html' %}

Included templates have access to the variables of the active context by
 default. For more details about context behavior of imports and includes
 see [*Import Context Behavior*][11].

From Jinja 2.2 onwards you can mark an include with `ignore missing` in
 which case Jinja will ignore the statement if the template to be ignored
 does not exist. When combined with `with` or `without context` it has
 to be placed *before* the context visibility statement. Here some valid
 examples:

    {% include "sidebar.html" ignore missing %}
    {% include "sidebar.html" ignore missing with context %}
    {% include "sidebar.html" ignore missing without context %}


 New in version 2.2.

You can also provide a list of templates that are checked for existence
 before inclusion. The first template that exists will be included. If
 *ignore missing* is given, it will fall back to rendering nothing if
 none of the templates exist, otherwise it will raise an exception.

Example:

    {% include ['page_detailed.html', 'page.html'] %}
    {% include ['special_sidebar.html', 'sidebar.html'] ignore missing %}


 Changed in version 2.4: If a template object was passed to the template context
 you can
 include that object using *include*.

### Import

Jinja2 supports putting often used code into macros. These macros can go into
 different templates and get imported from there. This works similar to the
 import statements in Python. It’s important to know that imports are cached
 and imported templates don’t have access to the current template variables,
 just the globals by defualt. For more details about context behavior of
 imports and includes see [*Import Context
 Behavior*][11].

There are two ways to import templates. You can import the complete template
 into a variable or request specific macros / exported variables from it.

Imagine we have a helper module that renders forms (called *forms.html*):

    {% macro input(name, value='', type='text') %}
        <input type="{{ typ" value="{{ value|" name="{{ nam">
    {% endmacro %}
    
    {% macro textarea(name, value='', rows=10, cols=40) %}
        <textarea name="{{ nam" rows="{{ rows }}" cols="{{ cols
            }}">{{ value|</textarea>
    {% endmacro %}

The easiest and most flexible is importing the whole module into a variable.
 That way you can access the attributes:

    {% import 'forms.html' as forms %}
    <dl>
        <dt>Username</dt>
        <dd>{{ forms.input('username') }}</dd>
        <dt>Password</dt>
        <dd>{{ forms.input('password', type='password') }}</dd>
    </dl>
    <p>{{ forms.textarea('comment') }}</p>

Alternatively you can import names from the template into the current
 namespace:

    {% from 'forms.html' import input as input_field, textarea %}
    <dl>
        <dt>Username</dt>
        <dd>{{ input_field('username') }}</dd>
        <dt>Password</dt>
        <dd>{{ input_field('password', type='password') }}</dd>
    </dl>
    <p>{{ textarea('comment') }}</p>

Macros and variables starting with one ore more underscores are private and
 cannot be imported.


 Changed in version 2.4: If a template object was passed to the template context
 you can
 import from that object.

## Import Context Behavior

Per default included templates are passed the current context and imported
 templates not. The reason for this is that imports unlike includes are
 cached as imports are often used just as a module that holds macros.

This however can be changed of course explicitly. By adding *with context*
 or *without context* to the import/include directive the current context
 can be passed to the template and caching is disabled automatically.

Here two examples:

    {% from 'forms.html' import input with context %}
    {% include 'header.html' without context %}

Note

In Jinja 2.0 the context that was passed to the included template
 did not include variables defined in the template. As a matter of
 fact this did not work:

    {% for box in boxes %}
        {% include "render_box.html" %}
    {% endfor %}

The included template `render_box.html` is
 *not* able to access
 *box* in Jinja 2.0. As of Jinja 2.1 `render_box.html` *is* able
 to do so.

 [1]: https://dl.dropbox.com#attr
 [2]: https://dl.dropbox.com#builtin-filters
 [3]: https://dl.dropbox.com/tricks/#null-master-fallback
 [4]: https://dl.dropbox.com#builtin-globals
 [5]: https://dl.dropbox.com#expressions
 [6]: https://dl.dropbox.com#if-expression
 [7]: https://dl.dropbox.com#loop-filtering
 [8]: https://dl.dropbox.com#import
 [9]: https://dl.dropbox.com#call
 [10]: https://dl.dropbox.com#template-inheritance
 [11]: https://dl.dropbox.com#import-visibility  