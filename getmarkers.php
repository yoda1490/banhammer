<?php
//header("Content-type: application/json");
header("Content-type: text/text");
 
require("dbinfo.php");
 
// Start XML file, create parent node
 
// Opens a link to a MySQL server
 
$link=mysqli_connect ($db_host, $db_user, $db_pwd, $database);
if (!$link) {  die('Not connected : ' . mysqli_error($connection));}
 
 
 
$query = "SELECT id, name, protocol, ports, GROUP_CONCAT(ip SEPARATOR ',') as ips, COUNT(id) as count, longitude, latitude, code, code3, country, city, MAX(timestamp) as timestamp, MAX(ban) as ban FROM `".$table."` group by longitude,latitude order by id ASC";
$result = mysqli_query($link,$query);
if (!$result) {
  die('Invalid query: ' . mysqli_error($link));
}
 
$rows = array();
while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}
 
print json_encode($rows);
