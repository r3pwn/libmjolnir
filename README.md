# libmjolnir
A WebUSB implementation of the Odin protocol, used for interfacing with Samsung devices in "Download mode"

## Status
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
`yarn # only needs to be run once, to install dependencies`
`yarn build`

## Building the example project
`cd example`
`yarn dev --host`

## Unit tests
`yarn test`
