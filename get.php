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
    if(!empty($cache) && !empty($cache[0]['stats_json'])){
        $decoded = json_decode($cache[0]['stats_json'], true);
        // If cache is not empty JSON, return it
        if(!empty($decoded)){
            return $decoded;
        }
    }
    
    // Rebuild full stats if cache doesn't exist or is empty
    return rebuild_stats();
}

function rebuild_stats($incremental = true){
    global $table, $link;
    
    $xx = array();
    $xx['totalip'] = array();
    $xx['ipban'] = array();
    $xx['totalcountry'] = array();
    $xx['totalpercountry'] = array();
    $xx['protos'] = array();
    $xx['totals'] = array();
    $xx['last'] = array();
    $xx['lastips'] = array();
    
    $whereClause = "";
    $lastIdProcessed = 0;
    $previousStats = array();
    
    // If incremental, only get new records since last_id_processed
    if($incremental){
        $cache = getdataset("SELECT last_id_processed, stats_json FROM banhammer_stats WHERE id=1");
        if(!empty($cache) && isset($cache[0]['last_id_processed'])){
            $lastIdProcessed = intval($cache[0]['last_id_processed']);
            // Load previous stats for merging
            if(!empty($cache[0]['stats_json'])){
                $previousStats = json_decode($cache[0]['stats_json'], true);
            }
            if($lastIdProcessed > 0){
                $whereClause = " WHERE id > " . $lastIdProcessed;
            }
        }
    }
    
    // Aggregate counts in a single query
    $agg = getdataset("SELECT 
        COUNT(DISTINCT ip) AS totalip,
        COUNT(DISTINCT CASE WHEN ban=1 THEN ip END) AS ipban,
        COUNT(DISTINCT country) AS totalcountry
        FROM $table" . $whereClause);
    
    if(!empty($agg)) {
        $xx['totalip']      = array(array('count' => $agg[0]['totalip']));
        $xx['ipban']        = array(array('count' => $agg[0]['ipban']));
        $xx['totalcountry'] = array(array('count' => $agg[0]['totalcountry']));
    }

    // In incremental mode, merge with previous stats for per-country, protos, and totals
    $perCountry = getdataset("SELECT code3, country, code, COUNT(id) AS count FROM $table" . $whereClause . " GROUP BY country");
    
    if($incremental && !empty($previousStats['totalpercountry'])){
        // Start with previous stats
        $xx['totalpercountry'] = $previousStats['totalpercountry'];
        // Add new counts to existing countries
        foreach($perCountry as $c){
            if(isset($xx['totalpercountry'][$c['code3']])){
                $xx['totalpercountry'][$c['code3']]['count'] += $c['count'];
            } else {
                $xx['totalpercountry'][$c['code3']] = $c;
            }
        }
    } else {
        // Full rebuild: use only new results
        foreach($perCountry as $c){
            $xx['totalpercountry'][$c['code3']] = $c;
        }
    }

    // Get new protocol counts
    $newProtos = getdataset("SELECT name, COUNT(name) AS count FROM $table" . $whereClause . " GROUP BY name");
    if($incremental && !empty($previousStats['protos'])){
        // Start with previous stats
        $xx['protos'] = $previousStats['protos'];
        // Merge new proto counts
        foreach($newProtos as $proto){
            $found = false;
            foreach($xx['protos'] as &$p){
                if($p['name'] == $proto['name']){
                    $p['count'] += $proto['count'];
                    $found = true;
                    break;
                }
            }
            if(!$found){
                $xx['protos'][] = $proto;
            }
        }
    } else {
        $xx['protos'] = $newProtos;
    }

    // Get new top 5 countries (will be recalculated from totalpercountry)
    $totalsArray = array();
    foreach($xx['totalpercountry'] as $country){
        $totalsArray[] = $country;
    }
    // Sort by count descending and take top 5
    usort($totalsArray, function($a, $b) { return $b['count'] - $a['count']; });
    $xx['totals'] = array_slice($totalsArray, 0, 5);

    // Always get latest 5 countries by timestamp and latest 30 IPs (not cumulative)
    $xx['last']   = getdataset("SELECT code, country, MAX(`timestamp`) AS `timestamp` FROM $table GROUP BY country ORDER BY timestamp DESC LIMIT 5");
    $xx['lastips']= getdataset("SELECT ip, code, country, `timestamp`, id FROM $table ORDER BY timestamp DESC LIMIT 30");

    // Get max ID for incremental updates
    $maxId = getdataset("SELECT MAX(id) as max_id FROM $table");
    $lastId = (!empty($maxId) && isset($maxId[0]['max_id'])) ? $maxId[0]['max_id'] : 0;
    
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
}elseif(isset($_GET['action']) && $_GET['action'] == 'stats-full'){
    // Force full regeneration of stats (not incremental)
    $return = rebuild_stats(false);
}elseif(isset($_GET['action']) && $_GET['action'] == 'whois'){
    $return=get_banned_whois();
}else{
    $return=["exit_code"=>1, "message"=>"No action"];
}

echo json_encode($return);
mysqli_close($link);
