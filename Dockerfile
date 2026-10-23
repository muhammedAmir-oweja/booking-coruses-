FROM node:22-alpine AS frontend-build

WORKDIR /frontend

COPY ["Front End/package.json", "Front End/package-lock.json", "./"]
RUN npm ci

COPY ["Front End/", "./"]
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM php:8.3-apache AS php-base

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig5 libonig-dev libzip5 libzip-dev libpq5 libpq-dev zip unzip \
    && docker-php-ext-install bcmath mbstring opcache pdo_mysql pdo_pgsql zip \
    && apt-get purge -y --auto-remove libonig-dev libzip-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

FROM php-base AS backend-dependencies

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY ["Back End/composer.json", "Back End/composer.lock", "./"]
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

FROM php-base

WORKDIR /var/www/html

COPY ["Back End/", "./"]
COPY --from=backend-dependencies /var/www/html/vendor ./vendor
COPY --from=frontend-build /frontend/dist/ ./public/
COPY ["Back End/.php-ini/99-uploads.ini", "/usr/local/etc/php/conf.d/99-uploads.ini"]

RUN sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && printf '\n<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n    DirectoryIndex index.html\n</Directory>\n' >> /etc/apache2/apache2.conf \
    && printf '%s\n' \
        '<IfModule mod_rewrite.c>' \
        '    Options -MultiViews -Indexes' \
        '    RewriteEngine On' \
        '    RewriteCond %{HTTP:Authorization} .' \
        '    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]' \
        '    RewriteCond %{HTTP:x-xsrf-token} .' \
        '    RewriteRule .* - [E=HTTP_X_XSRF_TOKEN:%{HTTP:X-XSRF-Token}]' \
        '    RewriteCond %{REQUEST_URI} ^/(api|sanctum)(/|$) [NC]' \
        '    RewriteRule ^ index.php [L]' \
        '    RewriteCond %{REQUEST_FILENAME} -f [OR]' \
        '    RewriteCond %{REQUEST_FILENAME} -d' \
        '    RewriteRule ^ - [L]' \
        '    RewriteRule ^ index.html [L]' \
        '</IfModule>' \
        > public/.htaccess \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=10000
# .env files are not copied into the image, so without this Laravel falls back
# to a log file inside the container and errors never reach the host's logs.
ENV LOG_CHANNEL=stderr
EXPOSE 10000

CMD ["sh", "-c", "if [ -z \"$APP_KEY\" ]; then echo 'APP_KEY is not set - add it to the service environment' >&2; exit 1; fi; port=${PORT:-10000}; sed -i \"s/Listen 80/Listen ${port}/\" /etc/apache2/ports.conf; sed -i \"s/<VirtualHost \\*:80>/<VirtualHost *:${port}>/\" /etc/apache2/sites-available/000-default.conf; tries=0; until php artisan migrate --force; do tries=$((tries+1)); if [ $tries -ge 5 ]; then echo 'php artisan migrate failed 5 times - check the DB_* environment variables' >&2; exit 1; fi; sleep 5; done; chown -R www-data:www-data storage bootstrap/cache; exec apache2-foreground"]
