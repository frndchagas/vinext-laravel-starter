FROM postgres:17.11-alpine3.24

# The official image trails the Alpine repository between rebuilds, so the
# packages it ships carry fixes that are already published upstream.
RUN apk upgrade --no-cache
