# Template Designer Documentation

This document describes the syntax and semantics of the template engine and
 will be most useful as reference to those creating Jinja templates.

## Synopsis

A template is simply a text file. It can generate any text-based format
 (HTML, XML, CSV etc.). It doesn’t have a specific file extension,
 .html or .xml
 are just fine.

A template contains **variables** or **expressions**, which get replaced with
 values when the template is evaluated, and tags, which control the logic of
 the template. The template syntax is heavily inspired by Django and Python.

Below is a minimal template that illustrates a few basics. We will cover
 the details later in that document:

    
    
    
        My Webpage
    
    
        
        {% for item in navigation %}
            {{ item.caption }}
        {% endfor %}
        
    
        My Webpage
        {{ a_variabl
    
    
    

This covers the default settings. The application developer might have
 changed the syntax from {% foo %} to  or something similar.

There are two kinds of delimiters. {% ... %} and {{ ... }}. The first
 one is used to execute statements such as for-loops or assign values, the
 latter prints the result of the expression to the template.

 
## Variables

The application passes variables to the templates you can mess around in the
 template. Variables may have attributes or elements on them you can access
 too. How a variable looks like, heavily depends on the application providing
 those.

You can use a dot (.) to access attributes of a
 variable, alternative the
 so-called “subscript” syntax ([]) can be used. The
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

For convenience sake foo.bar in Jinja2 does the
 following things on
 the Python layer:

*   check if there is an attribute called bar on foo.
 
*   if there is not, check if there is an item 'bar' in
 foo.
 
 
*   if there is not, return an undefined object.
 

foo['bar'] on the other hand works mostly the same
 with the a small
 difference in the order:

*   check if there is an item 'bar' in foo.
 
 
*   if there is not, check if there is an attribute called bar on foo.
 
*   if there is not, return an undefined object.
 

This is important if an object has an item or attribute with the same
 name. Additionally there is the [attr()][1] filter that just looks up
 attributes.

 
## Filters

Variables can be modified by **filters**. Filters are separated from the
 variable by a pipe symbol (|) and may have optional
 arguments in
 parentheses. Multiple filters can be chained. The output of one filter is
 applied to the next.

{{ name|striptags|title }} for example will remove all HTML Tags from the
 name and title-cases it. Filters that accept arguments have parentheses
 around the arguments, like a function call. This example will join a list
 by commas: {{ list|join(', ') }}.

The [*List of Builtin Filters*][2] below describes all
 the builtin filters.

 
## Tests

Beside filters there are also so called “tests” available. Tests can be used
 to test a variable against a common expression. To test a variable or
 expression you add is plus the name of the test after the variable. For
 example to find out if a variable is defined you can do name
 is defined
 which will then return true or false depending on if name is defined.

Tests can accept arguments too. If the test only takes one argument you can
 leave out the parentheses to group them. For example the following two
 expressions do the same:

    {% if loop.index is divisibleby 3 %}
    {% if loop.index is divisibleby(3) %}
    

The [*List of Builtin Tests*][3] below describes all the
 builtin tests.

## Escaping

It is sometimes desirable or even necessary to have Jinja ignore parts it
 would otherwise handle as variables or blocks. For example if the default
 syntax is used and you want to use {{ as raw string in
 the template and
 not start a variable you have to use a trick.

The easiest way is to output the variable delimiter ({{)
 by using a
 variable expression:

For bigger sections it makes sense to mark a block raw. For example to
 put Jinja syntax as example into a template you can use this snippet:

    {% raw %}
        
        {% for item in seq %}
            {{ item }}
        {% endfor %}
        
    {% endraw %}
    

 
## Template Inheritance

The most powerful part of Jinja is template inheritance. Template inheritance
 allows you to build a base “skeleton” template that contains all the common
 elements of your site and defines **blocks** that child templates can override.

Sounds complicated but is very basic. It’s easiest to understand it by starting
 with an example.

### Base Template

This template, which we’ll call base.html, defines a
 simple HTML skeleton
 document that you might use for a simple two-column page. It’s the job of
 “child” templates to fill the empty blocks with content:

    
    
    
    
        {% block head %}
        
        {% block title %}{% endblock %} - My Webpage
        {% endblock %}
    
    
        {% block content %}{% endblock %}
        
            {% block footer %}
            © Copyright 2008 by you.
            {% endblock %}
        
    
    

In this example, the {% block
 %} tags define four blocks that child templates
 can fill in. All the block tag does is to tell the template engine that a
 child template may override those portions of the template.

### Child Template

A child template might look like this:

    {% extends "base.html" %}
    {% block title %}Index{% endblock %}
    {% block head %}
        {{ super() }}
        
            .important { color: #336699; }
        
    {% endblock %}
    {% block content %}
        Index
        
          Welcome on my awesome homepage.
        
    {% endblock %}
    

The {% extends %}
 tag is the key here. It tells the template engine that
 this template “extends” another template. When the template system evaluates
 this template, first it locates the parent. The extends tag should be the
 first tag in the template. Everything before it is printed out normally and
 may cause confusion. For details about this behavior and how to take
 advantage of it, see [*Null-Master
 Fallback*][4].

The filename of the template depends on the template loader. For example the
 FileSystemLoader allows you to access
 other templates by giving the
 filename. You can access templates in subdirectories with an slash:

    {% extends "layout/default.html" %}
    

But this behavior can depend on the application embedding Jinja. Note that
 since the child template doesn’t define the footer
 block, the value from
 the parent template is used instead.

You can’t define multiple {% block
 %} tags with the same name in the
 same template. This limitation exists because a block tag works in “both”
 directions. That is, a block tag doesn’t just provide a hole to fill - it
 also defines the content that fills the hole in the *parent*. If there
 were two similarly-named {% block
 %} tags in a template, that template’s
 parent wouldn’t know which one of the blocks’ content to use.

If you want to print a block multiple times you can however use the special
 self variable and call the block with that name:

    {% block title %}{% endblock %}
    {{ self.title() }}
    {% block body %}{% endblock %}
    

### Block Nesting and Scope

Blocks can be nested for more complex layouts. However per default blocks
 may not access variables from outer scopes:

    {% for item in seq %}
        {% block loop_item %}{{ item }}{% endblock %}
    {% endfor %}
    

This example would output empty  items
 because item is unavailable
 inside the block. The reason for this is that if the block is replaced by
 a child template a variable would appear that was not defined in the block or
 passed to the context.

Starting with Jinja 2.2 you can explicitly specify that variables are
 available in a block by setting the block to “scoped” by adding the scoped
 modifier to a block declaration:

    {% for item in seq %}
        {% block loop_item scoped %}{{ item }}{% endblock %}
    {% endfor %}
    

When overriding a block the scoped modifier does not have to be provided.

### Template Objects


 Changed in version 2.4.

If a template object was passed to the template context you can
 extend from that object as well. Assuming the calling code passes
 a layout template as layout_template to the environment, this
 code works:

    {% extends layout_template %}
    

Previously the layout_template variable had to be a string with
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
 include any of the following chars (&gt;, &lt;, &amp;, or ") you
 **have to** escape it unless the variable contains well-formed and trusted
 HTML. Escaping works by piping the variable through the |e filter:
 {{ user.username|e }}.

### Working with Automatic Escaping

When automatic escaping is enabled everything is escaped by default except
 for values explicitly marked as safe. Those can either be marked by the
 application or in the template by using the |safe filter. The main
 problem with this approach is that Python itself doesn’t have the concept
 of tainted values so the information if a value is safe or unsafe can get
 lost. If the information is lost escaping will take place which means that
 you could end up with double escaped contents.

Double escaping is easy to avoid however, just rely on the tools Jinja2
 provides and don’t use builtin Python constructs such as the string modulo
 operator.

Functions returning template data (macros, super, self.BLOCKNAME) return
 safe markup always.

String literals in templates with automatic escaping are considered unsafe
 too. The reason for this is that the safe string is an extension to Python
 and not every library will work properly with it.

## List of Control Structures

A control structure refers to all those things that control the flow of a
 program - conditionals (i.e. if/elif/else), for-loops, as well as things like
 macros and blocks. Control structures appear inside {% ... %} blocks
 in the default syntax.

### For

Loop over each item in a sequence. For example, to display a list of users
 provided in a variable called users:

    Members
    
    {% for user in users %}
      {{ user.username|
    {% endfor %}
    
    

Inside of a for loop block you can access some special variables:

Variable
 

Description
 

loop.index
 

The current iteration of the loop. (1 indexed)
 

loop.index0
 

The current iteration of the loop. (0 indexed)
 

loop.revindex
 

The number of iterations from the end of the loop
 (1 indexed)
 
 

loop.revindex0
 

The number of iterations from the end of the loop
 (0 indexed)
 
 

loop.first
 

True if first iteration.
 

loop.last
 

True if last iteration.
 

loop.length
 

The number of items in the sequence.
 

loop.cycle
 

A helper function to cycle between a list of
 sequences. See the explanation below.
 
 

Within a for-loop, it’s possible to cycle among a list of strings/variables
 each time through the loop by using the special loop.cycle helper:

    {% for row in rows %}
        {{ row }}
    {% endfor %}
    

With Jinja 2.1 an extra cycle helper exists that allows loop-unbound
 cycling. For more information have a look at the [*List of
 Global Functions*][5].

Unlike in Python it’s not possible to break or continue in a loop.
 You
 can however filter the sequence during iteration which allows you to skip
 items. The following example skips all the users which are hidden:

    {% for user in users if not user.hidden %}
        {{ user.username|
    {% endfor %}
    

The advantage is that the special loop variable will count correctly thus
 not counting the users not iterated over.

If no iteration took place because the sequence was empty or the filtering
 removed all the items from the sequence you can render a replacement block
 by using else:

    
    {% for user in users %}
        {{ user.username|
    {% else %}
        no users found
    {% endfor %}
    
    

It is also possible to use loops recursively. This is useful if you are
 dealing with recursive data such as sitemaps. To use loops recursively you
 basically have to add the recursive modifier to the loop definition and
 call the loop variable with the new iterable where you want to recurse.

The following example implements a sitemap with recursive loops:

    
    {% for item in sitemap recursive %}
        {{ item.titl
        {% if item.children %}
            {{ loop(item.children) }}
        {% endif %}
    {% endfor %}
    
    

### If

The if statement in Jinja is comparable with the if statements of Python.
 In the simplest form you can use it to test if a variable is defined, not
 empty or not false:

    {% if users %}
    
    {% for user in users %}
        {{ user.username|
    {% endfor %}
    
    {% endif %}
    

For multiple branches elif and else can be used like in Python. You can
 use more complex [*Expressions*][6] there too:

    {% if kenny.sick %}
        Kenny is sick.
    {% elif kenny.dead %}
        You killed Kenny!  You bastard!!!
    {% else %}
        Kenny looks okay --- so far
    {% endif %}
    

If can also be used as [*inline expression*][7] and for
 [*loop filtering*][8].

### Macros

Macros are comparable with functions in regular programming languages. They
 are useful to put often used idioms into reusable functions to not repeat
 yourself.

Here a small example of a macro that renders a form element:

    {% macro input(name, value='', type='text', size=20) %}
        
    {% endmacro %}
    

The macro can then be called like a function in the namespace:

    {{ input('username') }}
    {{ input('password', type='password') }}
    

If the macro was defined in a different template you have to
 [*import*][9] it first.

Inside macros you have access to three special variables:

varargs
 

If more positional arguments are passed to the macro than accepted by the
 macro they end up in the special varargs variable as list of values.
 
 

kwargs
 

Like varargs but for keyword arguments. All unconsumed keyword
 arguments are stored in this special variable.
 
 

caller
 

If the macro was called from a [*call*][10] tag the caller is
 stored
 in this variable as macro which can be called.
 
 

Macros also expose some of their internal details. The following attributes
 are available on a macro object:

name
 

The name of the macro. {{ input.name }} will print input.
 
 

arguments
 

A tuple of the names of arguments the macro accepts.
 

defaults
 

A tuple of default values.
 

catch_kwargs
 

This is true if the macro accepts extra keyword arguments (ie: accesses
 the special kwargs variable).
 
 

catch_varargs
 

This is true if the macro accepts extra positional arguments (ie:
 accesses the special varargs variable).
 
 

caller
 

This is true if the macro accesses the special caller variable and may
 be called from a [*call*][10] tag.
 
 

If a macro name starts with an underscore it’s not exported and can’t
 be imported.

 
### Call

In some cases it can be useful to pass a macro to another macro. For this
 purpose you can use the special call block. The following example shows
 a macro that takes advantage of the call functionality and how it can be
 used:

    {% macro render_dialog(title, class='dialog') %}
        
            {{ titl
            
                {{ caller() }}
            
        
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
        
        {% for user in users %}
            {{ user.username|{{ caller(user) }}
        {% endfor %}
        
    {% endmacro %}
    
    {% call(user) dump_users(list_of_user) %}
        
            Realname
            {{ user.realname|
            Description
            {{ user.description }}
        
    {% endcall %}
    

### Filters

Filter sections allow you to apply regular Jinja2 filters on a block of
 template data. Just wrap the code in the special filter section:

    {% filter upper %}
        This text becomes uppercase
    {% endfilter %}
    

### Assignments

Inside code blocks you can also assign values to variables. Assignments at
 top level (outside of blocks, macros or loops) are exported from the template
 like top level macros and can be imported by other templates.

Assignments use the set tag and can have multiple targets:

    {% set navigation = [('index.html', 'Index'), ('about.html', 'About')] %}
    {% set key, value = call_something() %}
    

### Extends

The extends tag can be used to extend a template from another one. You
 can have multiple of them in a file but only one of them may be executed
 at the time. See the section about [*Template
 Inheritance*][11] above.

### Block

Blocks are used for inheritance and act as placeholders and replacements
 at the same time. They are documented in detail as part of the section
 about [*Template Inheritance*][11].

### Include

The include statement is useful to include a template and return the
 rendered contents of that file into the current namespace:

    {% include 'header.html' %}
        Body
    {% include 'footer.html' %}
    

Included templates have access to the variables of the active context by
 default. For more details about context behavior of imports and includes
 see [*Import Context Behavior*][12].

From Jinja 2.2 onwards you can mark an include with ignore
 missing in
 which case Jinja will ignore the statement if the template to be ignored
 does not exist. When combined with with or without context it has
 to be placed *before* the context visibility statement. Here some valid
 examples:

    {% include "sidebar.html" ignore missing %}
    {% include "sidebar.html" ignore missing with context %}
    {% include "sidebar.html" ignore missing without context %}
    


 New in version 2.2.

You can also provide a list of templates that are checked for existence
 before inclusion. The first template that exists will be included. If
 ignore missing is given, it will fall back to rendering nothing if
 none of the templates exist, otherwise it will raise an exception.

Example:

    {% include ['page_detailed.html', 'page.html'] %}
    {% include ['special_sidebar.html', 'sidebar.html'] ignore missing %}
    


 Changed in version 2.4: If a template object was passed to the template context
 you can
 include that object using include.

 
### Import

Jinja2 supports putting often used code into macros. These macros can go into
 different templates and get imported from there. This works similar to the
 import statements in Python. It’s important to know that imports are cached
 and imported templates don’t have access to the current template variables,
 just the globals by defualt. For more details about context behavior of
 imports and includes see [*Import Context
 Behavior*][12].

There are two ways to import templates. You can import the complete template
 into a variable or request specific macros / exported variables from it.

Imagine we have a helper module that renders forms (called forms.html):

    {% macro input(name, value='', type='text') %}
        
    {% endmacro %}
    
    {% macro textarea(name, value='', rows=10, cols=40) %}
        {{ value|
    {% endmacro %}
    

The easiest and most flexible is importing the whole module into a variable.
 That way you can access the attributes:

    {% import 'forms.html' as forms %}
    
        Username
        {{ forms.input('username') }}
        Password
        {{ forms.input('password', type='password') }}
    
    {{ forms.textarea('comment') }}
    

Alternatively you can import names from the template into the current
 namespace:

    {% from 'forms.html' import input as input_field, textarea %}
    
        Username
        {{ input_field('username') }}
        Password
        {{ input_field('password', type='password') }}
    
    {{ textarea('comment') }}
    

Macros and variables starting with one ore more underscores are private and
 cannot be imported.


 Changed in version 2.4: If a template object was passed to the template context
 you can
 import from that object.

 
## Import Context Behavior

Per default included templates are passed the current context and imported
 templates not. The reason for this is that imports unlike includes are
 cached as imports are often used just as a module that holds macros.

This however can be changed of course explicitly. By adding with context
 or without context to the import/include directive the current context
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
    

The included template render_box.html is
 *not* able to access
 box in Jinja 2.0. As of Jinja 2.1 render_box.html *is* able
 to do so.

 
## Expressions

Jinja allows basic expressions everywhere. These work very similar to regular
 Python and even if you’re not working with Python you should feel comfortable
 with it.

### Literals

The simplest form of expressions are literals. Literals are representations
 for Python objects such as strings and numbers. The following literals exist:

“Hello World”:
 

Everything between two double or single quotes is a string. They are
 useful whenever you need a string in the template (for example as
 arguments to function calls, filters or just to extend or include a
 template).
 
 

42 / 42.23:
 

Integers and floating point numbers are created by just writing the
 number down. If a dot is present the number is a float, otherwise an
 integer. Keep in mind that for Python 42 and 42.0 is something
 different.
 
 

[‘list’, ‘of’, ‘objects’]:
 

Everything between two brackets is a list. Lists are useful to store
 sequential data in or to iterate over them. For example you can easily
 create a list of links using lists and tuples with a for loop:
 
 

    
    {% for href, caption in [('index.html', 'Index'), ('about.html', 'About'),
                             ('downloads.html', 'Downloads')] %}
        {{ caption }}
    {% endfor %}
    
    
 
 

(‘tuple’, ‘of’, ‘values’):
 

Tuples are like lists, just that you can’t modify them. If the tuple
 only has one item you have to end it with a comma. Tuples are usually
 used to represent items of two or more elements. See the example above
 for more details.
 
 

{‘dict’: ‘of’, ‘key’: ‘and’, ‘value’: ‘pairs’}:
 

A dict in Python is a structure that combines keys and values. Keys must
 be unique and always have exactly one value. Dicts are rarely used in
 templates, they are useful in some rare cases such as the [xmlattr()][13]
 filter.
 
 

true / false:
 

true is always true and false is always false.
 

Note

The special constants true, false and none are indeed
 lowercase.
 Because that caused confusion in the past, when writing True expands
 to an undefined variable that is considered false, all three of them can
 be written in title case too (True, False, and None). However for
 consistency (all Jinja identifiers are lowercase) you should use the
 lowercase versions.

### Math

Jinja allows you to calculate with values. This is rarely useful in templates
 but exists for completeness’ sake. The following operators are supported:

%2B
 

Adds two objects together. Usually the objects are numbers but if both are
 strings or lists you can concatenate them this way. This however is not
 the preferred way to concatenate strings! For string concatenation have
 a look at the ~ operator. {{ 1 %2B
 1 }} is 2.
 
 

-
 

Substract the second number from the first one. {{ 3 - 2 }} is
 1.
 
 

/
 

Divide two numbers. The return value will be a floating point number.
 {{ 1 /
 2 }} is {{
 0.5 }}.
 
 

//
 

Divide two numbers and return the truncated integer result.
 {{ 20 //
 7 }} is 2.
 
 

%
 

Calculate the remainder of an integer division. {{ 11 % 7 }}
 is 4.
 
 

*
 

Multiply the left operand with the right one. {{ 2 * 2 }}
 would
 return 4. This can also be used to repeat a string
 multiple times.
 {{ '=' *
 80 }} would print a bar of 80 equal signs.
 
 

**
 

Raise the left operand to the power of the right operand. {{ 2**3 }}
 would return 8.
 
 

### Comparisons

==


Compares two objects for equality.


!=


Compares two objects for inequality.


&gt;


true if the left hand side is greater than the right hand side.


&gt;=


true if the left hand side is greater or equal to the right hand side.


&lt;


true if the left hand side is lower than the right hand side.

&lt;=


true if the left hand side is lower or equal to the right hand side.


### Logic

For if statements, for filtering or if expressions it can be useful to
 combine multiple expressions:

and
 

Return true if the left and the right operand is true.
 

or
 

Return true if the left or the right operand is true.
 

not
 

negate a statement (see below).
 

(expr)
 

group an expression.
 

Note

The is and in operators support negation using an infix notation
 too: foo is not bar and foo
 not in bar instead of not foo is bar
 and not foo in bar. All other expressions require a prefix notation:
 not (foo and bar).

### Other Operators

The following operators are very useful but don’t fit into any of the other
 two categories:

in
 

Perform sequence / mapping containment test. Returns true if the left
 operand is contained in the right. {{ 1 in [1, 2,
 3] }} would for
 example return true.
 
 

is
 

Performs a [*test*][14].
 

|
 

Applies a [*filter*][15].
 

~
 

Converts all operands into strings and concatenates them.
 {{ "Hello " ~ name ~
 "!" }} would return (assuming name is
 'John') Hello John!.
 
 

()
 

Call a callable: {{ post.render() }}. Inside of the parentheses you
 can use positional arguments and keyword arguments like in python:
 {{ post.render(user, full=true) }}.
 
 

. / []
 

Get an attribute of an object. (See [*Variables*][16])
 
 

 
### If Expression

It is also possible to use inline if expressions. These are useful in some
 situations. For example you can use this to extend from one template if a
 variable is defined, otherwise from the default layout template:

    {% extends layout_template if layout_template is defined else 'master.html' %}
    

The general syntax is 
 if 
 else .

The else part is optional. If not provided the else block implicitly
 evaluates into an undefined object:

    {{ '[%s]' % page.title if page.titl

 [1]: https://dl.dropbox.com#attr "attr"
 [2]: https://dl.dropbox.com#builtin-filters
 [3]: https://dl.dropbox.com#builtin-tests
 [4]: https://dl.dropbox.com/tricks/#null-master-fallback
 [5]: https://dl.dropbox.com#builtin-globals
 [6]: https://dl.dropbox.com#expressions
 [7]: https://dl.dropbox.com#if-expression
 [8]: https://dl.dropbox.com#loop-filtering
 [9]: https://dl.dropbox.com#import
 [10]: https://dl.dropbox.com#call
 [11]: https://dl.dropbox.com#template-inheritance
 [12]: https://dl.dropbox.com#import-visibility
 [13]: https://dl.dropbox.com#xmlattr "xmlattr"
 [14]: https://dl.dropbox.com#tests
 [15]: https://dl.dropbox.com#filters
 [16]: https://dl.dropbox.com#variables

