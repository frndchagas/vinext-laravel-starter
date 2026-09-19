FROM golang:1.26.8-alpine3.24 AS gosu

# Keep upstream privilege dropping while using a supported Go standard library.
RUN GOBIN=/out CGO_ENABLED=0 go install -trimpath -ldflags="-s -w" github.com/tianon/gosu@1.19

FROM postgres:17.11-alpine3.24

COPY --from=gosu /out/gosu /usr/local/bin/gosu

# The official image trails the Alpine repository between rebuilds, so the
# packages it ships carry fixes that are already published upstream.
RUN apk upgrade --no-cache \
    && gosu nobody sh -c 'test "$(id -u)" != 0'
