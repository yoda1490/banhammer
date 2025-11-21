FROM php:8.2-apache

# Enable required PHP extensions
RUN docker-php-ext-install mysqli && \
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

# Set environment defaults (can be overridden at runtime)
ENV DB_HOST=mariadb
ENV DB_USER=fail2ban
ENV DB_PASSWORD=fail2ban
ENV DB_NAME=fail2ban
ENV DB_TABLE=fail2ban
ENV WEB_SERVER=*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["apache2-foreground"]
