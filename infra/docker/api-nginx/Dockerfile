FROM alpine:3.24.1

RUN apk upgrade --no-cache \
    && apk add --no-cache nginx \
    && mkdir -p /var/lib/nginx/logs \
    && ln -sf /dev/stderr /var/lib/nginx/logs/error.log

COPY infra/docker/api-nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx apps/api/public /var/www/html/public

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
    CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:8080/up"]

ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
