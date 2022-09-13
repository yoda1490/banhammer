
## Fail2SQL v2.0 by Amaury BOLLER
## From Fail2SQL v1.0 by Jordan Tomkinson <jordan@moodle.com>

# Installation
1. Create a MySQL database called fail2ban
2. Create fail2ban MySQL user to access fail2ban database (needs INSERT, UPDATE, DELETE)
3. Create table by piping fail2ban.sql into mysql (mysql -u fail2ban -p fail2ban < fail2ban.sql)
4. Edit ../dbinfo.php (copy from dbinfo.php.example if needed) and change home path and sql login details at the top of the file.
5. Update Geo IP Database (./fail2ban -u)
6. Tell fail2ban to call fail2sql by appending to actionban in your action script.

Example for /etc/fail2ban/action.d/iptables.conf

actionban = iptables -I fail2ban-<name> 1 -s <ip> -j DROP
            /usr/local/fail2sql/fail2sql -b <name> <protocol> <port> <ip>


# Usage
    Usage: ./fail2sql [-h|-l|-u|-b|-d]
         -h: This page
         -l: List entries in the database (max 50 showed)
         -f: Flush the database and start fresh (just set flag ban to 0 for all entries, does not remove any IP)
         -u: Update GeoIP database (Use legacy update from dl.miyuru.lk)
         -b  <name> <protocol> <ports> <ip> : to ban an IP
         -d <name> <ip>: to flag ip as unban        

# Installation in fail2ban
 - Copy banhammer.conf into fail2ban action folder
```shell
cp banhammer.conf /etc/fail2ban/action.d/
```

 - Add banhammer to actionban of your jail (or in default.jail if you want to enable it for all jails)
 ```shell
vi /etc/fail2ban/jail.d/default.conf
[DEFAULT]
backend   = systemd
maxretry  = 5
findtime  = 1d
bantime   = 2w
ignoreip  = 127.0.0.1/8
banaction = iptables-multiport
banhammer
```

# Contact
You can contact Original Author at jordan@moodle.com
You can contact me at banhammer@boller.co

