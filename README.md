# banhammer
![Screenshot](https://raw.githubusercontent.com/yoda1490/banhammer/master/screenshot.png "Screenshot")

Based on http://www.byteme.org.uk/2014/04/21/ban-hammer-fail2ban-geo-ip-on-google-maps/


rjkreider updated this to work with PHP7.x, fixed the GeoIP Legacy updater and include the modified fail2sql
Demo https://kreider.io/banhammer/

I've updated this to work with OpenStreetMap as Google now ask credit card to use their API. 
I Also added some libs like Jquery/Bootstrap to improve the style and make it compatible with smartphones
Also implemented a country layer and colorized them regarding the number of attacks

Demo https://ban.boller.co

# Requirements
 - A working LAMP/WAMP installation (Apache - PHP - MySQL)
 - Valid SSL certificate on your domain (else, remove security headers in get.php)

# Installation Steps:
 - Deploy the code somewhere on your server
 - Create the needed table into your MySQL server, SQL code in fail2sql/fail2ban.sql
 - Copy dbinfo.php.example to dbinfo.php and edit the configuration
 - Copy the file fail2sql/banhammer.conf into the action folder of fail2ban
 - Add action banhammer into fail2ban configuration rules
