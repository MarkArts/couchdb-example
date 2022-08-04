# Couchdb example with fetch api

## setup

Dependencies:

- nix package manager (to install deno)
- docker + docker-compose

To setup the environment run:

```
nix-shell -p env.nix
```

This repo assumes you use vscode and will generate a vscode config that has deno
and auto formating enabled. You will still need to install the vs code DENO
plugin

## How to run

```
deno run main.ts
```
