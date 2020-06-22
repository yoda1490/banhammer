<?php
//header("Content-type: application/json");
header("Content-type: text/text");
 
require("dbinfo.php");
 
// Start XML file, create parent node
 
// Opens a connection to a MySQL server
 
$connection=mysqli_connect ($db_host, $db_user, $db_pwd, $database);
if (!$connection) {  die('Not connected : ' . mysqli_error($connection));}
 
 
 
$query = "SELECT id, name, protocol, ports, ip, COUNT(id) as count, longitude, latitude, code, code3, country, city, MAX(timestamp) as timestamp, MAX(ban) as ban FROM `".$table."` group by ip order by id DESC";
$result = mysqli_query($connection,$query);
if (!$result) {
  die('Invalid query: ' . mysqli_error($connection));
}
 
$rows = array();
while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}
 
print json_encode($rows);
