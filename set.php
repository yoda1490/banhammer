<?php
header('Content-Type: application/json');

require_once __DIR__ . '/dbinfo.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondJson(405, ['error' => 'METHOD_NOT_ALLOWED', 'message' => 'Only POST is supported']);
}

$authHeader = getAuthorizationHeader();
if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    // Debug: dump all server vars to find the header
    $allServerKeys = array_filter(array_keys($_SERVER), function($key) {
        return stripos($key, 'auth') !== false || stripos($key, 'http_') === 0;
    });
    $serverVars = [];
    foreach ($allServerKeys as $key) {
        $serverVars[$key] = $_SERVER[$key];
    }
    
    respondJson(401, [
        'error' => 'UNAUTHORIZED', 
        'message' => 'Missing or invalid bearer token', 
        'debug' => [
            'authHeader' => $authHeader ?: 'null',
            'apache_request_headers_exists' => function_exists('apache_request_headers'),
            'relevant_server_vars' => $serverVars
        ]
    ]);
}

$token = trim($matches[1]);
if ($token === '') {
    respondJson(401, ['error' => 'UNAUTHORIZED', 'message' => 'Empty bearer token']);
}

$tokenHash = hash('sha256', $token);
$account = fetchAccount($tokenHash, $link);
if (!$account) {
    respondJson(401, ['error' => 'UNAUTHORIZED', 'message' => 'Invalid bearer token']);
}

$payload = getPayload();
$action = strtolower(trim($_GET['action'] ?? ($payload['action'] ?? 'ban')));
$result = null;

switch ($action) {
    case 'ban':
        $result = handleBan($payload, $account, $link, $table);
        break;
    case 'unban':
        $result = handleUnban($payload, $link, $table);
        break;
    case 'flush':
        $result = handleFlush($link, $table);
        break;
    case 'start':
        $result = handleGeoUpdate(false);
        break;
    case 'stop':
        $result = handleGeoUpdate(true);
        break;
    default:
        $result = [
            'code' => 400,
            'payload' => [
                'error' => 'INVALID_ACTION',
                'message' => 'Supported actions: ban, unban, flush, start, stop'
            ]
        ];
        break;
}

if (isset($link) && $link) {
    mysqli_close($link);
}

respondJson($result['code'], $result['payload']);

function handleBan(array $payload, array $account, $link, $table)
{
    $ip = isset($payload['ip']) ? filter_var(trim($payload['ip']), FILTER_VALIDATE_IP) : null;
    if (!$ip) {
        return [
            'code' => 422,
            'payload' => ['error' => 'INVALID_IP', 'message' => 'Valid IPv4 or IPv6 address is required']
        ];
    }

    $name = isset($payload['name']) && trim($payload['name']) !== '' ? trim($payload['name']) : $account['name'];
    $protocol = isset($payload['protocol']) && trim($payload['protocol']) !== '' ? trim($payload['protocol']) : 'tcp';
    $rawPorts = $payload['ports'] ?? $payload['port'] ?? '0';
    $ports = trim($rawPorts) !== '' ? trim($rawPorts) : '0';
    $ban = isset($payload['ban']) ? (intval($payload['ban']) ? 1 : 0) : 1;

    if (!preg_match('/^[a-z0-9_-]{1,32}$/i', $protocol)) {
        return [
            'code' => 422,
            'payload' => ['error' => 'INVALID_PROTOCOL', 'message' => 'Protocol must be alphanumeric (max 32 chars)']
        ];
    }
    if (strlen($name) > 255) {
        $name = substr($name, 0, 255);
    }
    if (strlen($ports) > 64) {
        $ports = substr($ports, 0, 64);
    }

    $geo = geolocateIp($ip);
    $longitude = $geo && isset($geo->longitude) ? $geo->longitude : $account['longitude'];
    $latitude = $geo && isset($geo->latitude) ? $geo->latitude : $account['latitude'];
    $countryCode = $geo && isset($geo->country_code) ? $geo->country_code : '';
    $countryCode3 = $geo && isset($geo->country_code3) ? $geo->country_code3 : '';
    $city = $geo && isset($geo->city) ? $geo->city : '';
    $countryName = $geo && isset($geo->country_name) ? $geo->country_name : '';

    $longitudeParam = isset($longitude) ? (string)$longitude : null;
    $latitudeParam = isset($latitude) ? (string)$latitude : null;

    $stmt = mysqli_prepare($link, "INSERT INTO `$table` (name, protocol, ports, ip, longitude, latitude, code, code3, city, country, timestamp, ban, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)");
    if (!$stmt) {
        return [
            'code' => 500,
            'payload' => ['error' => 'DB_PREPARE_FAILED', 'message' => mysqli_error($link)]
        ];
    }

    mysqli_stmt_bind_param(
        $stmt,
        'ssssssssssii',
        $name,
        $protocol,
        $ports,
        $ip,
        $longitudeParam,
        $latitudeParam,
        $countryCode,
        $countryCode3,
        $city,
        $countryName,
        $ban,
        (int)$account['id']
    );

    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        return [
            'code' => 500,
            'payload' => ['error' => 'DB_INSERT_FAILED', 'message' => $error]
        ];
    }

    $insertId = mysqli_insert_id($link);
    mysqli_stmt_close($stmt);

    return [
        'code' => 201,
        'payload' => [
            'status' => 'ok',
            'id' => $insertId,
            'ip' => $ip,
            'name' => $name,
            'account_id' => (int)$account['id']
        ]
    ];
}

function handleUnban(array $payload, $link, $table)
{
    $ip = isset($payload['ip']) ? filter_var(trim($payload['ip']), FILTER_VALIDATE_IP) : null;
    if (!$ip) {
        return [
            'code' => 422,
            'payload' => ['error' => 'INVALID_IP', 'message' => 'IP is required for unban action']
        ];
    }

    $name = isset($payload['name']) ? trim($payload['name']) : '';
    $sql = "UPDATE `$table` SET ban=0 WHERE ip=?";
    $types = 's';
    $params = [$ip];

    if ($name !== '') {
        $sql .= ' AND name=?';
        $types .= 's';
        $params[] = $name;
    }

    $stmt = mysqli_prepare($link, $sql);
    if (!$stmt) {
        return [
            'code' => 500,
            'payload' => ['error' => 'DB_PREPARE_FAILED', 'message' => mysqli_error($link)]
        ];
    }

    mysqli_stmt_bind_param($stmt, $types, ...$params);
    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        return [
            'code' => 500,
            'payload' => ['error' => 'DB_UPDATE_FAILED', 'message' => $error]
        ];
    }

    $updated = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    return [
        'code' => 200,
        'payload' => ['status' => 'ok', 'updated' => $updated]
    ];
}

function handleFlush($link, $table)
{
    $query = "UPDATE `$table` SET ban=0";
    if (!mysqli_query($link, $query)) {
        return [
            'code' => 500,
            'payload' => ['error' => 'DB_UPDATE_FAILED', 'message' => mysqli_error($link)]
        ];
    }

    return [
        'code' => 200,
        'payload' => ['status' => 'ok', 'updated' => mysqli_affected_rows($link)]
    ];
}

function handleGeoUpdate($force = false)
{
    try {
        $result = updateGeoDb($force);
        return [
            'code' => 200,
            'payload' => ['status' => 'ok'] + $result
        ];
    } catch (RuntimeException $e) {
        return [
            'code' => 500,
            'payload' => ['error' => 'GEOIP_UPDATE_FAILED', 'message' => $e->getMessage()]
        ];
    }
}

function getAuthorizationHeader()
{
    // Try apache_request_headers first (works without .htaccess)
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            return $headers['Authorization'];
        }
        if (isset($headers['authorization'])) {
            return $headers['authorization'];
        }
    }

    // Try Apache-style REDIRECT_ prefix
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // Try getallheaders as fallback
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            return $headers['Authorization'];
        }
        if (isset($headers['authorization'])) {
            return $headers['authorization'];
        }
    }

    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }

    return null;
}

function fetchAccount($tokenHash, $link)
{
    $stmt = mysqli_prepare($link, 'SELECT id, name, latitude, longitude FROM banhammer_accounts WHERE token_hash = ? LIMIT 1');
    if (!$stmt) {
        respondJson(500, ['error' => 'DB_PREPARE_FAILED', 'message' => mysqli_error($link)]);
    }

    mysqli_stmt_bind_param($stmt, 's', $tokenHash);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $account = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    return $account ?: null;
}

function getPayload()
{
    if (!empty($_POST)) {
        return $_POST;
    }

    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
        return $data;
    }

    parse_str($raw, $formData);
    return $formData;
}

function geolocateIp($ip)
{
    $geoCityFile = __DIR__ . '/fail2sql/GeoLiteCity.dat';
    if (!file_exists($geoCityFile)) {
        return null;
    }

    require_once __DIR__ . '/fail2sql/geoipcity.inc';
    require_once __DIR__ . '/fail2sql/geoipregionvars.php';

    $db = @geoip_open($geoCityFile, GEOIP_STANDARD);
    if (!$db) {
        return null;
    }

    $record = @geoip_record_by_addr($db, $ip);
    geoip_close($db);

    return $record ?: null;
}

function updateGeoDb($force = false)
{
    $geoCityFile = __DIR__ . '/fail2sql/GeoLiteCity.dat';
    $geoIpUrl = getenv('GEOIP_URL') ?: 'https://dl.miyuru.lk/geoip/dbip/city/dbip4.dat.gz';

    if (!$force && file_exists($geoCityFile) && (time() - filemtime($geoCityFile) < 86400)) {
        return ['status' => 'skipped', 'message' => 'GeoIP database already up to date', 'path' => $geoCityFile];
    }

    $gzData = @file_get_contents($geoIpUrl);
    if ($gzData === false) {
        throw new RuntimeException('Unable to download GeoIP database from ' . $geoIpUrl);
    }

    $decoded = @gzdecode($gzData);
    if ($decoded === false) {
        throw new RuntimeException('Failed to decode GeoIP database payload');
    }

    if (@file_put_contents($geoCityFile, $decoded) === false) {
        throw new RuntimeException('Unable to write GeoIP database to ' . $geoCityFile);
    }

    return ['status' => 'updated', 'message' => 'GeoIP database refreshed', 'path' => $geoCityFile];
}

function respondJson($statusCode, array $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}
?>
