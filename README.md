# libmjolnir
A WebUSB implementation of the Odin protocol, used for interfacing with Samsung devices in "Download mode"

## Status
### Build status
- [![Build Library](https://github.com/r3pwn/libmjolnir/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/r3pwn/libmjolnir/actions/workflows/build.yml)
- [![Unit Tests](https://github.com/r3pwn/libmjolnir/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/r3pwn/libmjolnir/actions/workflows/unit-tests.yml)
- [![Deploy to Github Pages](https://github.com/r3pwn/libmjolnir/actions/workflows/deploy.yml/badge.svg)](https://github.com/r3pwn/libmjolnir/actions/workflows/deploy.yml)

### [Known issues](https://github.com/r3pwn/libmjolnir/wiki/Known-issues)

### Working features
- PIT parsing
- Odin handshake
- Download PIT
- Device Reboot
- Erase userdata
- Flash partition

### Planned features
- Upload PIT

## Building
```sh
yarn # only needs to be run once, to install dependencies
yarn build
```

## Building the example project
```sh
cd example
yarn dev --host
```

## Unit tests
`yarn test`
