FROM composer:2.10.2 AS vendor

WORKDIR /app

COPY apps/api/composer.json apps/api/composer.lock ./
RUN set -eu; \
    install_dependencies() { \
        composer install \
            --no-dev \
            --no-interaction \
            --no-progress \
            --no-scripts \
            --optimize-autoloader \
            --ignore-platform-req=ext-pcntl \
            --prefer-dist; \
    }; \
    install_dependencies || { \
        sleep 5; \
        install_dependencies; \
    }

COPY apps/api ./
RUN composer dump-autoload \
    --classmap-authoritative \
    --no-dev \
    --no-interaction

FROM php:8.3.33-fpm-alpine3.24 AS runtime

RUN apk upgrade --no-cache \
    && apk add --no-cache libpq \
    && apk add --no-cache --virtual .build-dependencies \
        $PHPIZE_DEPS \
        linux-headers \
        postgresql-dev \
    && docker-php-ext-install -j"$(nproc)" \
        opcache \
        pcntl \
        pdo_pgsql \
        posix \
        sockets \
    && pecl install redis-6.2.0 \
    && docker-php-ext-enable redis \
    && apk del .build-dependencies

WORKDIR /var/www/html

COPY --from=vendor --chown=www-data:www-data /app ./
COPY infra/docker/api/php.ini /usr/local/etc/php/conf.d/production.ini

RUN mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
    CMD ["php-fpm", "-t"]

CMD ["php-fpm", "-F"]
