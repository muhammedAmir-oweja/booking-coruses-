FROM php:8.3-apache AS php-base

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig5 libonig-dev libzip-dev zip unzip \
    && docker-php-ext-install bcmath mbstring opcache pdo_mysql zip \
    && apt-get purge -y --auto-remove libonig-dev libzip-dev \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

FROM php-base AS backend-dependencies

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

FROM php-base

WORKDIR /var/www/html

COPY . .
COPY --from=backend-dependencies /var/www/html/vendor ./vendor
COPY .php-ini/99-uploads.ini /usr/local/etc/php/conf.d/99-uploads.ini

RUN sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && printf '\n<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n' >> /etc/apache2/apache2.conf \
    && printf '\nDirectoryIndex index.php\n' >> /etc/apache2/apache2.conf \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=10000
EXPOSE 10000

CMD ["sh", "-c", "port=${PORT:-10000}; sed -i \"s/Listen 80/Listen ${port}/\" /etc/apache2/ports.conf; sed -i \"s/<VirtualHost \\*:80>/<VirtualHost *:${port}>/\" /etc/apache2/sites-available/000-default.conf; exec apache2-foreground"]
