<?php
#SECURITY
header("Access-Control-Allow-Origin: ".$webServer);
header("Strict-Transport-Security: max-age = 63072000; includeSubDomains; preload");
header("X-Frame-Options: NEVER");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block"); //for old browser
//header("Content-Security-Policy: default-src 'self'; img-src *;script-src 'unsafe-inline'");
header("Content-Security-Policy: block-all-mixed-content");
header("Referrer-Policy: same-origin");
header("Permissions-Policy: geolocation=(),midi=(),microphone=(),camera=(),autoplay=()");

header("Content-type: application/json");
 
require("dbinfo.php");
 

function get_stats(){
    global $table;
    // Create an array to hold the data
    $xx = array();
    // Do each sql query and add teh results to the array
     
    // Get total IPs logged
    $xx['totalip'] = getdataset("SELECT COUNT(DISTINCT(ip)) as count FROM $table");

    //get currenlty banned IPs
    $xx['ipban'] = getdataset("SELECT COUNT(DISTINCT(ip)) as count FROM $table where `ban`=1");
     
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
    $xx['last'] = getdataset("SELECT code,country,max(`timestamp`) as `timestamp` FROM $table GROUP BY country ORDER BY timestamp DESC limit 5");

    //Get last IPs
    $xx['lastips'] = getdataset("SELECT ip,code,country,`timestamp`,id FROM $table ORDER BY timestamp DESC limit 30");
     
    // Return the data in json
    return $xx;
}

function get_markers() {
    global $link;
    global $table;
    $query = "SELECT id, name, protocol, ports, GROUP_CONCAT(CONCAT(id,':',ip) SEPARATOR ',') as ips, COUNT(id) as count, longitude, latitude, code, code3, country, city, MAX(timestamp) as timestamp, MAX(ban) as ban FROM `".$table."` WHERE ban=1 group by longitude,latitude order by id ASC";
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

//retrieve IP in table to prevent any whois query from this service
function get_banned_whois(){
    global $table;
    if(isset($_GET['ip']) && is_numeric($_GET['ip']) && intval($_GET['ip']) > 0 ){
        $query='SELECT ip FROM '.$table.' WHERE `id`='.intval($_GET['ip']);
        $data=getdataset($query);
        if(sizeof($data) != 1){
            return ["exit_code"=>3, "message"=>"IP not found"];
        }else{
            require_once('lib/whois.php');
            $ip=$data[0]['ip'];
            return ['ip'=> $ip, 'whois'=>get_whois($ip)];
        }
        
    }else{
        return ["exit_code"=>2, "message"=>"No ip id"];
    }
    
}

$return=null;
if(isset($_GET['action']) && $_GET['action'] == 'markers'){
    $return=get_markers();
}elseif(isset($_GET['action']) && $_GET['action'] == 'stats'){
    $return=get_stats();
}elseif(isset($_GET['action']) && $_GET['action'] == 'whois'){
    $return=get_banned_whois();
}else{
    $return=["exit_code"=>1, "message"=>"No action"];
}

echo json_encode($return);
mysqli_close($link);
