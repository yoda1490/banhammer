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
// Ensure proper charset for performance & correctness
if(isset($link)) { mysqli_set_charset($link, 'utf8mb4'); }
 

function get_stats_cached(){
    global $table, $link;
    
    // Check if cache exists in DB
    $cache = getdataset("SELECT stats_json, last_id_processed FROM banhammer_stats WHERE id=1");
    if(!empty($cache)){
        return json_decode($cache[0]['stats_json'], true);
    }
    
    // Rebuild full stats if cache doesn't exist
    return rebuild_stats();
}

function rebuild_stats(){
    global $table, $link;
    
    $xx = array();
    // Aggregate counts in a single query
    $agg = getdataset("SELECT 
        COUNT(DISTINCT ip) AS totalip,
        COUNT(DISTINCT CASE WHEN ban=1 THEN ip END) AS ipban,
        COUNT(DISTINCT country) AS totalcountry
        FROM $table");
    $xx['totalip']      = array(array('count' => $agg[0]['totalip']));
    $xx['ipban']        = array(array('count' => $agg[0]['ipban']));
    $xx['totalcountry'] = array(array('count' => $agg[0]['totalcountry']));

    foreach(getdataset("SELECT code3, country, code, COUNT(id) AS count FROM $table GROUP BY country") as $c){
        $xx['totalpercountry'][$c['code3']] = $c;
    }

    $xx['protos'] = getdataset("SELECT name, COUNT(name) AS count FROM $table GROUP BY name");
    $xx['totals'] = getdataset("SELECT code, country, COUNT(*) AS count FROM $table GROUP BY country ORDER BY count DESC LIMIT 5");
    $xx['last']   = getdataset("SELECT code, country, MAX(`timestamp`) AS `timestamp` FROM $table GROUP BY country ORDER BY timestamp DESC LIMIT 5");
    $xx['lastips']= getdataset("SELECT ip, code, country, `timestamp`, id FROM $table ORDER BY timestamp DESC LIMIT 30");

    // Get max ID for incremental updates
    $maxId = getdataset("SELECT MAX(id) as max_id FROM $table");
    $lastId = $maxId[0]['max_id'] ?? 0;
    
    // Store in DB cache (upsert)
    $statsJson = json_encode($xx);
    $query = "INSERT INTO banhammer_stats (id, stats_json, last_id_processed, updated_at) 
              VALUES (1, '" . mysqli_real_escape_string($link, $statsJson) . "', " . intval($lastId) . ", NOW())
              ON DUPLICATE KEY UPDATE stats_json=VALUES(stats_json), last_id_processed=VALUES(last_id_processed), updated_at=NOW()";
    mysqli_query($link, $query);
    
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
    $return = get_markers();
}elseif(isset($_GET['action']) && $_GET['action'] == 'stats'){
    $return = get_stats_cached();
}elseif(isset($_GET['action']) && $_GET['action'] == 'whois'){
    $return=get_banned_whois();
}else{
    $return=["exit_code"=>1, "message"=>"No action"];
}

echo json_encode($return);
mysqli_close($link);
