<?php

header("Content-type: text/text");
 
require("dbinfo.php");
 
// Opens a connection to a MySQL server
 
$connection=mysqli_connect ($db_host, $db_user, $db_pwd);
if (!$connection) {  die('Not connected : ' . mysqli_error($connection));}
 
// Set the active MySQL database
 
$db_selected = mysqli_select_db($connection,$database);
if (!$db_selected) {
  die ('Can\'t use db : ' . mysqli_error($connection));
}
 
// Create an array to hold the data
 
$xx = array();
 
// Do each sql query and add teh results to the array
 
// Get total IPs logged
$xx['totalip'] = getdataset("SELECT COUNT(*) as count FROM $table");
 
// Get total number of countries
$xx['totalcountry'] = getdataset("SELECT COUNT(Distinct country) as count FROM $table");
 
// Get count for each protocol
$xx['protos'] = getdataset("SELECT name,COUNT(name) as count FROM $table");
 
// Get total counts for each country
$xx['totals'] = getdataset("SELECT country,COUNT(*) as count FROM $table GROUP BY country ORDER BY count DESC");
 
//Get last 5 Countires
$xx['last'] = getdataset("SELECT country,timestamp FROM $table ORDER BY timestamp DESC limit 5");
 
// Return the data in json
print json_encode($xx);
 
// ** DONE **
 
// Function to take an SQL query and return all results as a PHP array
 
function getdataset($query)
{
 global $connection;
    $result = mysqli_query($connection,$query);
    if (!$result) {
      die('Invalid query: ' . mysqli_error($connection));
    }
 
    $rows = array();
    while($r = mysqli_fetch_assoc($result)) {
        $rows[] = $r;
    }
 
    return $rows;
 
}
