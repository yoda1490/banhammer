<?php
//header("Content-type: application/json");
header("Content-type: text/text");
 
require("dbinfo.php");
 
// Start XML file, create parent node
 
// Opens a connection to a MySQL server
 
$connection=mysqli_connect ($db_host, $db_user, $db_pwd);
if (!$connection) {  die('Not connected : ' . mysqli_error($connection));}
 
// Set the active MySQL database
 
$db_selected = mysqli_select_db($connection,$database);
if (!$db_selected) {
  die ('Can\'t use db : ' . mysqli_error($connection));
}
 
$query = "SELECT * FROM $table";
$result = mysqli_query($connection,$query);
if (!$result) {
  die('Invalid query: ' . mysqli_error($connection));
}
 
$rows = array();
while($r = mysqli_fetch_assoc($result)) {
    $rows[] = $r;
}
 
print json_encode($rows);
