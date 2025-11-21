FROM php:8-apache

# Update all packages and enable required PHP extensions
RUN apt update && apt upgrade -y &&\
    docker-php-ext-install mysqli && \
    docker-php-ext-enable mysqli && \
    a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Copy dbinfo.php.example to dbinfo.php so it uses ENV vars
RUN cp /var/www/html/dbinfo.php.example /var/www/html/dbinfo.php

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["apache2-foreground"]
