Funbucks
=================

Funbucks is tool for generating Fluent Bit templated configurations for servers and Kubernetes (OpenShift) deployments.

## Required development tools

* node (>v20 higher)
* podman (latest)

## How to generate a Fluent Bit configuration

Example 1: Generate for a server

```
$ ./bin/dev gen -l -s localhost
```

The '-l' flag here ensures log paths are setup for local testing in a Podman container. It also sends the output to a local http server instead of the production location. This is useful for sending to a locally running version of the event-driven compute (AWS Lambda) that will process the output.

Example 2: Generate for a server and a specific application

```
$ ./bin/dev gen -l -s midway -a rrt-war
```

The '-a' flag here limits the generated output to only this "application" id. This may be useful if you are dealing with a server with many applications on it.

Example 3: Generate for a server (local testing and override some context variables)

```
$ ./bin/dev gen -l -s localhost -c deploy_1:inputPath//metrics/\* -c outputAwsKinesisEnabled/true -c outputLocalLambdaEnabled/
```

Finally, you can override the context sent to the template engine to try out values.


Example 4: Generate for OpenShift

```
$ ./bin/dev gen -s knox
$ ./bin/dev oc -s knox
```
The [output_pack](./output_pack/) folder will now contain a ConfigMap and Volume for pasting into a Kubernetes deployment config.

## Running a configuration against the local lambda (nr-apm-stack/event-stream-processing)

1. Generate your server's configuration using the local (-l) flag and (-a) flag
2. Place any documents in ./lambda/data. You will need to lay the files out relative to the log directory like they would be on the server. Check the generated files (inputs.conf) in ./output if you are confused.
3. Ensure the local lambda is running. See: [nr-apm-stack repository readme](https://github.com/BCDevOps/nr-apm-stack/blob/master/event-stream-processing/README.md)
4. Run ```./lambda/podman-run.sh```

### Why should I use the -a flag for local testing?

Mostly, it would be too noisy. Some input plugins are not supported by the container as well.

For servers with a large number of applications, the generated configuration may contain too many filters and other objects for a single Fluentbit agent to handle. In this case, you would need to use the '-a' or application flag to limit the generation for the configuration to a specific application for local testing.

## How to add or modify the configuration
### Server configuration

Location: [./config/server](./config/server)

A server configuration file has information about the "server" and list all the applications on them. Some of the server configurations are OpenShift applications.

| Key | Type | Reqd. | Kube | Description |
| --- | --- | --- | --- | --- |
| address | string | | "" | The address of the server. |
| proxy | string | | "" | Proxy server address |
| logsProxyDisabled | boolean | Yes | true | Disables setting proxy information |
| os | string | Yes | | Used to determine how to deploy. Values: linux, windows, openshift |
| os_variant | string | | X | Used to determine how to deploy. Values: rhel7, rhel8 |
| vault_cd_user_field | string | | X | CD user field in Vault |
| vault_cd_pass_field | string | | X | CD password field in Vault |
| vault_cd_path | string | | X | CD path in Vault |
| apps | array | Yes | | Set of applications on this server |
| apps[].id | string | Yes | | The unique id (within this file) used to render directories, tags, etc and specify using the -a option in the gen command. |
| apps[].type | string | Yes | | The template 'type' that this application will be rendered as |
| apps[].context | string | Yes | | Context values to set for this application |
| context | object | Yes | | Context values to set for this server |

The X in the Kube column indicates properties that can be safely dropped from the configuration file.

### Template configuration

Location: [./config/templates](./config/templates)

The type templates is stored in a folder containing a json file with the same name as the folder.

| Key | Type | Description |
| --- | --- | --- |
| measurementType | string | Determines if this is historic or instant. An instant measurement will have a timestamp generated for it. Must be: "historic" or "instant" |
| semver | string | Optional. A semver (semantic version) clause to limit output to FluentBit agents that match it. |
| os | string[] | Optional. A set of supported operating systems. This prevents output of a type on an unsupported operating system. |
| context | string | Context values to set for this type |
| files[].tmpl | string | Path to the template. The path is expected to be &lt;type&gt;/&lt;filename&gt;. If the filename ends in '.njk' it will be rendered as a Nunjucks template with the '.njk' dropped. |
| files[].type | string | Values: filter, input, lua, parser, script. |

# CLI Documentation

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [CLI Documentation](#cli-documentation)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage

**Note:** These usage notes are generated by oclif. For testing configurations and development, do not run `npm install -g nr-funbucks`. Subsitute `./bin/dev gen` for `nr-funbucks`.

<!-- usage -->
```sh-session
$ npm install -g nr-funbucks
$ nr-funbucks COMMAND
running command...
$ nr-funbucks (--version)
nr-funbucks/1.0.0 darwin-arm64 node-v22.1.0
$ nr-funbucks --help [COMMAND]
USAGE
  $ nr-funbucks COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`nr-funbucks gen`](#nr-funbucks-gen)
* [`nr-funbucks help [COMMAND]`](#nr-funbucks-help-command)
* [`nr-funbucks oc`](#nr-funbucks-oc)
* [`nr-funbucks plugins`](#nr-funbucks-plugins)
* [`nr-funbucks plugins add PLUGIN`](#nr-funbucks-plugins-add-plugin)
* [`nr-funbucks plugins:inspect PLUGIN...`](#nr-funbucks-pluginsinspect-plugin)
* [`nr-funbucks plugins install PLUGIN`](#nr-funbucks-plugins-install-plugin)
* [`nr-funbucks plugins link PATH`](#nr-funbucks-plugins-link-path)
* [`nr-funbucks plugins remove [PLUGIN]`](#nr-funbucks-plugins-remove-plugin)
* [`nr-funbucks plugins reset`](#nr-funbucks-plugins-reset)
* [`nr-funbucks plugins uninstall [PLUGIN]`](#nr-funbucks-plugins-uninstall-plugin)
* [`nr-funbucks plugins unlink [PLUGIN]`](#nr-funbucks-plugins-unlink-plugin)
* [`nr-funbucks plugins update`](#nr-funbucks-plugins-update)

## `nr-funbucks gen`

generate fluentbit configuration

```
USAGE
  $ nr-funbucks gen -s <value> [-l] [-a <value>] [-c <value>] [-m]

FLAGS
  -a, --app=<value>         limits output to only this application id
  -c, --context=<value>...  [default: ] context override. Examples: appPathJq//tmp/jq, deploy_1:inputPath//tmp/file
  -l, --local               render for sending logs to local lambda
  -m, --multiple            multiple configuration output mode. A single Fluent Bit has an upper bound to the number of
                            filters it can handle. Do not combine with oc command.
  -s, --server=<value>      (required) server configuration to render

DESCRIPTION
  generate fluentbit configuration

EXAMPLES
  $ nr-funbucks gen
```

_See code: [src/commands/gen.ts](https://github.com/mbystedt/hello-world/blob/v1.0.0/src/commands/gen.ts)_

## `nr-funbucks help [COMMAND]`

Display help for nr-funbucks.

```
USAGE
  $ nr-funbucks help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nr-funbucks.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.22/src/commands/help.ts)_

## `nr-funbucks oc`

repackage fluentbit configuration for OC

```
USAGE
  $ nr-funbucks oc -s <value>

FLAGS
  -s, --server=<value>  (required) server to render the config for

DESCRIPTION
  repackage fluentbit configuration for OC

EXAMPLES
  $ nr-funbucks oc
```

_See code: [src/commands/oc.ts](https://github.com/mbystedt/hello-world/blob/v1.0.0/src/commands/oc.ts)_

## `nr-funbucks plugins`

List installed plugins.

```
USAGE
  $ nr-funbucks plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nr-funbucks plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/index.ts)_

## `nr-funbucks plugins add PLUGIN`

Installs a plugin into nr-funbucks.

```
USAGE
  $ nr-funbucks plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nr-funbucks.

  Uses bundled npm executable to install plugins into /Users/mbystedt/.local/share/oex

  Installation of a user-installed plugin will override a core plugin.

  Use the NR_FUNBUCKS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NR_FUNBUCKS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nr-funbucks plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ nr-funbucks plugins add myplugin

  Install a plugin from a github url.

    $ nr-funbucks plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nr-funbucks plugins add someuser/someplugin
```

## `nr-funbucks plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ nr-funbucks plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nr-funbucks plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/inspect.ts)_

## `nr-funbucks plugins install PLUGIN`

Installs a plugin into nr-funbucks.

```
USAGE
  $ nr-funbucks plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nr-funbucks.

  Uses bundled npm executable to install plugins into /Users/mbystedt/.local/share/oex

  Installation of a user-installed plugin will override a core plugin.

  Use the NR_FUNBUCKS_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NR_FUNBUCKS_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nr-funbucks plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ nr-funbucks plugins install myplugin

  Install a plugin from a github url.

    $ nr-funbucks plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nr-funbucks plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/install.ts)_

## `nr-funbucks plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ nr-funbucks plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ nr-funbucks plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/link.ts)_

## `nr-funbucks plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nr-funbucks plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nr-funbucks plugins unlink
  $ nr-funbucks plugins remove

EXAMPLES
  $ nr-funbucks plugins remove myplugin
```

## `nr-funbucks plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ nr-funbucks plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/reset.ts)_

## `nr-funbucks plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nr-funbucks plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nr-funbucks plugins unlink
  $ nr-funbucks plugins remove

EXAMPLES
  $ nr-funbucks plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/uninstall.ts)_

## `nr-funbucks plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nr-funbucks plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nr-funbucks plugins unlink
  $ nr-funbucks plugins remove

EXAMPLES
  $ nr-funbucks plugins unlink myplugin
```

## `nr-funbucks plugins update`

Update installed plugins.

```
USAGE
  $ nr-funbucks plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.21/src/commands/plugins/update.ts)_
<!-- commandsstop -->
