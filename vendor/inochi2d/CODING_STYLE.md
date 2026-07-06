# Inochi2D Coding Style

This document describes the coding style used by the Inochi2D Project,
any contributions must follow this coding style for consistency

## Brace & Identation Style
Inochi2D uses a modified [OTBS](https://en.wikipedia.org/wiki/Indentation_style#One_True_Brace) coding style, incorporating some things from K&R style with some additions.

The following rules apply to the bracing style:

1. The brace always begins on the same line as its scope begins
2. Single-statement blocks do not use curlybraces, unless context becomes vague.
3. The bracing style applies to type definitions, etc. as well.
4. The final brace in a chain is on its own line, only follow-up keywords may be on the same line.

### Example
```d
bool exampleFunction(int x) @nogc nothrow {
    if (x < 0) {
        callSomeFunction();
        return true;
    } else if (x == 0) {
        callSomeOtherFunction();
        return false;
    } else {
        if (callSomeThirdFunction())
            return true;
    }

    // More code would go here.
}
```

## Early return

When writing functions it is preferred if said functions return early when it makes sense,
for example, it is preferred if a function checks for invalid input states early and returns
at the start of the function, instead of later down in the function.

It is recommended that you document these error states as well in a brief comment.

### Example
```d
void exampleFunction(int* myValue) @nogc nothrow {
    
    // We can't process a null value.
    if (!myValue)
        return;

    // Negative values are not allowed.
    if (*myValue < 0)
        return;

    // Functionality follows...
}
```

## Attributes
Attributes such as `@nogc` and `nothrow` should be at the end of a function's definition,
other attributes should be at the start, such as `@property`.

# On auto-formatting
When making a pull-request your code may be automatically formatted by dfmt, in cases where this formatting makes your code hard to read,
surround the code in question with `// dfmt off` and `// dfmt on` comments.