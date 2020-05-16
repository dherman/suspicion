# Suspicion

`suspicion` is a node.js module for spawning child applications (such as ssh) and
seamlessly controlling them using javascript callbacks. It has a long chain of
inspiration:
- [node-suspect][4] by Andrew Stucki, which was inspired by...
- [nexpect][2], which was inspired by...
- [pexpected][1], by Noah Spurrier.

## Motivation

node.js has good built in control for spawning child processes. `suspicion` builds
on these core methods and allows developers to easily pipe data to child
processes and assert the expected response. `suspicion` also chains, so you can
compose complex terminal interactions.

## Installation

``` bash
  $ npm install suspicion
```

## Usage

### require('suspicion')

The module exposes a single function, `.spawn`.

### function spawn(command, [params], [options])

* command {string|Array} The command that you wish to spawn, a string will be
  split on `' '` to find the params if params not provided (so do not use the
  string variant if any arguments have spaces in them)
* params {Array} **Optional** Argv to pass to the child process
* options {Object} **Optional** An object literal which may contain
  - cwd {string} Current working directory of the child process.
  - env {Object} Environment key-value pairs.
  - argv0 {string} Explicitly set the value of `argv[0]` sent to the child
    process. This will be set to `command` if not specified.
  - stdio {Array|string} Child's stdio configuration
  - detached {boolean} Prepare child to run independently of its parent
    process. Specific behavior depends on the platform.
  - uid {number} Sets the user identity of the process (see setuid(2)).
  - gid {number} Sets the group identity of the process (see setgid(2)).
  - shell {boolean|string} If `true`, runs `command` inside of a shell. Uses
    `'/bin/sh'` on UNIX, and `process.env.ComSpec` on Windows. A different
    shell can be specified as a string. **Default:** `false` (no shell).
  - stream: Expectations can be written against 'stdout', 'stderr', or 'all', which
    runs expectations against both stdout and stderr. **Default:** `stdout`

Top-level entry point for `suspicion` that liberally parses the arguments
and then returns a new chain with the specified `command`, `params`, and `options`.

### function expect (expectation)

* expectation {string|RegExp} Output to assert on the target stream

Expect that the next line of output matches the expectation.
Throw an error if it does not.

The expectation can be a string (the line should contain the expected value as
a substring) or a RegExp (the line should match the expression).

### function wait (expectation, callback)

* expectation {string|RegExp} Output to assert on the target stream
* callback {Function} **Optional** Callback to be called when output matches stream

Wait for a line of output that matches the expectation, discarding lines
that do not match.

Throw an error if no such line was found.

The expectation can be a string (the line should contain the expected value as
a substring) or a RegExp (the line should match the expression).

The callback will be called for every line that matches the expectation.

### function sendline (line)

* line {string} Output to write to the child process.

Adds a write line to the child process `stdin`.

### function sendEof ()

Close child's stdin stream, let the child know there are no more data coming.

This is useful for testing apps that are using inquirer,
as `inquirer.prompt()` calls `stdin.resume()` at some point,
which causes the app to block on input when the input stream is a pipe.

### function run (callback)

* callback {function} Called when child process closes, with arguments
  * err {Error|null} Error if any occurred
  * output {Array} Array of lines of output examined
  * exit {number|string} Numeric exit code, or String name of signal

Called at the end of the subprocess invocation.

## Example

Let's take a look at some example usage:

``` js
import { spawn } from 'suspicion'

spawn("echo", ["hello"]).expect("hello").run(err => !err && console.log("hello was echoed"))
```

## Authors

[Dave Herman][5]. Credit for the original goes to [Andrew Stucki][3].

[0]: http://search.cpan.org/~rgiersig/Expect-1.21/Expect.pod
[1]: http://pexpect.sourceforge.net/pexpect.html
[2]: https://github.com/nodejitsu/nexpect
[3]: http://github.com/andrewstucki
[4]: https://github.com/andrewstucki/node-suspect
[5]: https://github.com/dherman
