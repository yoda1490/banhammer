<?php

header("Content-type: text/text");
 
require("dbinfo.php");
 
// Create an array to hold the data
 
$xx = array();
 
// Do each sql query and add teh results to the array
 
// Get total IPs logged
$xx['totalip'] = getdataset("SELECT COUNT(DISTINCT(ip)) as count FROM $table");
 
// Get total number of countries
$xx['totalcountry'] = getdataset("SELECT COUNT(Distinct country) as count FROM $table");
 
//number of attack per country
foreach(getdataset("SELECT code3, country, code, count(id) as count FROM $table group by country") as $c){
	$xx['totalpercountry'][$c['code3']]=$c;
}


// Get count for each protocol
$xx['protos'] = getdataset("SELECT name,COUNT(name) as count FROM $table GROUP BY name");
 
// Get total counts for each country
$xx['totals'] = getdataset("SELECT code,country,COUNT(*) as count FROM $table GROUP BY country ORDER BY count DESC LIMIT 5");
 
//Get last 5 Countries
$xx['last'] = getdataset("SELECT code,country,max(timestamp) as timestamp FROM $table GROUP BY country ORDER BY timestamp DESC limit 5");

//Get last IPs
$xx['lastips'] = getdataset("SELECT ip,code,country, timestamp FROM $table ORDER BY timestamp DESC limit 30");
 
// Return the data in json
print json_encode($xx);
 
// ** DONE **
 
// Function to take an SQL query and return all results as a PHP array
 
function getdataset($query)
{
    global $link;
    $result = mysqli_query($link,$query);
    if (!$result) {
      die('Invalid query: ' . mysqli_error($link));
    }
 
    $rows = array();
    while($r = mysqli_fetch_assoc($result)) {
        $rows[] = $r;
    }
 
    return $rows;
 
}
