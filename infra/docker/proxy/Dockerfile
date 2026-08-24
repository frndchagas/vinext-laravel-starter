FROM golang:1.26.7-alpine3.24 AS build

WORKDIR /src

COPY infra/docker/proxy/build/go.mod infra/docker/proxy/build/go.sum ./

RUN apk add --no-cache patch \
    && go mod download

COPY infra/docker/proxy/build/caddy-cel-go-0.29.patch ./

RUN caddy_source="$(go env GOMODCACHE)/github.com/caddyserver/caddy/v2@v2.11.4" \
    && chmod u+w "$caddy_source/modules/caddyhttp/celmatcher.go" \
    && patch --directory="$caddy_source" --strip=1 < caddy-cel-go-0.29.patch

COPY infra/docker/proxy/build/main.go ./

RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w -X github.com/caddyserver/caddy/v2.CustomVersion=v2.11.4" \
    -o /usr/bin/caddy \
    .

FROM alpine:3.24.1

COPY infra/docker/proxy/Caddyfile /etc/caddy/Caddyfile

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && addgroup --system --gid 1000 caddy \
    && adduser --system --disabled-password --uid 1000 --ingroup caddy caddy

COPY --from=build /usr/bin/caddy /usr/bin/caddy

ENV XDG_CONFIG_HOME=/tmp/config \
    XDG_DATA_HOME=/tmp/data

USER caddy

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
    CMD wget --quiet --spider --header "Host: $APP_HOST" http://127.0.0.1:8080/up

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
