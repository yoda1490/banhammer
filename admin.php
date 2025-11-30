<?php
session_start();
require_once __DIR__ . '/dbinfo.php';

$adminTokenHash = trim($adminTokenHash ?? getenv('ADMIN_TOKEN_HASH') ?: '');
if ($adminTokenHash === '') {
    die('ADMIN_TOKEN_HASH is not configured. Set it in dbinfo.php, .env, or environment.');
}

$errors = [];
$success = '';
$generatedToken = '';

if (isset($_GET['logout'])) {
    unset($_SESSION['admin_authenticated']);
    header('Location: admin.php');
    exit;
}

$action = $_POST['action'] ?? '';

if ($action === 'login') {
    $tokenInput = trim($_POST['admin_token'] ?? '');
    if ($tokenInput === '') {
        $errors[] = 'Please enter the admin token.';
    } elseif (!hashEquals(hash('sha256', $tokenInput), $adminTokenHash)) {
        $errors[] = 'Invalid admin token.';
    } else {
        $_SESSION['admin_authenticated'] = true;
        header('Location: admin.php');
        exit;
    }
}

$loggedIn = !empty($_SESSION['admin_authenticated']);

if ($loggedIn && $action === 'create_account') {
    $name = trim($_POST['account_name'] ?? '');
    $latitude = trim($_POST['latitude'] ?? '');
    $longitude = trim($_POST['longitude'] ?? '');
    $tokenMode = $_POST['token_mode'] ?? 'auto';
    $customToken = trim($_POST['custom_token'] ?? '');

    if ($name === '') {
        $errors[] = 'Account name is required.';
    }

    if ($latitude === '' || !is_numeric($latitude) || $latitude < -90 || $latitude > 90) {
        $errors[] = 'Latitude must be a number between -90 and 90.';
    }

    if ($longitude === '' || !is_numeric($longitude) || $longitude < -180 || $longitude > 180) {
        $errors[] = 'Longitude must be a number between -180 and 180.';
    }

    if ($tokenMode === 'manual') {
        if ($customToken === '') {
            $errors[] = 'Provide a custom token or switch to auto-generate.';
        } elseif (strlen($customToken) < 16) {
            $errors[] = 'Custom token must be at least 16 characters.';
        }
    }

    if (!$errors) {
        try {
            $rawToken = $tokenMode === 'manual' ? $customToken : bin2hex(random_bytes(32));
        } catch (Exception $e) {
            $errors[] = 'Failed to generate token. Try again.';
            $rawToken = null;
        }

        if ($rawToken) {
            $tokenHash = hash('sha256', $rawToken);
            $latValue = (float)$latitude;
            $lonValue = (float)$longitude;

            $stmt = mysqli_prepare($link, 'INSERT INTO banhammer_accounts (name, token_hash, latitude, longitude) VALUES (?, ?, ?, ?)');
            if (!$stmt) {
                $errors[] = 'Database prepare failed: ' . mysqli_error($link);
            } else {
                mysqli_stmt_bind_param($stmt, 'ssdd', $name, $tokenHash, $latValue, $lonValue);
                if (!mysqli_stmt_execute($stmt)) {
                    $errors[] = 'Database insert failed: ' . mysqli_stmt_error($stmt);
                } else {
                    $success = 'Account created successfully. Copy the token below; it will not be shown again.';
                    $generatedToken = $rawToken;
                }
                mysqli_stmt_close($stmt);
            }
        }
    }
}

$accounts = [];
if ($loggedIn) {
    $result = mysqli_query($link, 'SELECT id, name, latitude, longitude, created_at FROM banhammer_accounts ORDER BY created_at DESC');
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $accounts[] = $row;
        }
        mysqli_free_result($result);
    } else {
        $errors[] = 'Failed to load accounts: ' . mysqli_error($link);
    }
}

mysqli_close($link);

function esc($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function hashEquals($known, $user)
{
    if (function_exists('hash_equals')) {
        return hash_equals($known, $user);
    }
    if (strlen($known) !== strlen($user)) {
        return false;
    }
    $res = $known ^ $user;
    $ret = 0;
    for ($i = strlen($res) - 1; $i >= 0; $i--) {
        $ret |= ord($res[$i]);
    }
    return !$ret;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BanHammer Admin</title>
    <style>
        body { font-family: Arial, sans-serif; background:#f5f6fa; margin:0; padding:0; }
        .container { max-width: 960px; margin: 40px auto; background:#fff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); padding:30px; }
        h1 { margin-top:0; }
        form { margin-top:20px; }
        label { display:block; margin:12px 0 4px; font-weight:bold; }
        input[type="text"], input[type="password"], input[type="number"], textarea { width:100%; padding:10px; border:1px solid #ccd1d9; border-radius:4px; }
        input[type="submit"], button { background:#007bff; color:#fff; border:none; padding:10px 16px; border-radius:4px; cursor:pointer; }
        input[type="submit"]:hover, button:hover { background:#0056b3; }
        .alert { padding:12px 16px; border-radius:4px; margin-bottom:16px; }
        .alert-error { background:#ffe5e5; color:#c00; border:1px solid #f5c2c2; }
        .alert-success { background:#e6ffed; color:#0f5132; border:1px solid #badbcc; }
        .token-box { background:#1e1e1e; color:#0f0; padding:12px; border-radius:4px; font-family:monospace; word-break:break-all; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        th, td { padding:10px; border-bottom:1px solid #eee; text-align:left; }
        th { background:#fafafa; }
        .logout { float:right; }
        .token-options { display:flex; gap:20px; align-items:center; margin-top:10px; }
        .token-options label { font-weight:normal; display:flex; align-items:center; gap:6px; }
    </style>
</head>
<body>
<div class="container">
    <h1>BanHammer Admin</h1>
    <?php if ($loggedIn): ?>
        <a class="logout" href="?logout=1">Logout</a>
    <?php endif; ?>

    <?php if ($errors): ?>
        <div class="alert alert-error">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?php echo esc($error); ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <?php if ($success): ?>
        <div class="alert alert-success"><?php echo esc($success); ?></div>
    <?php endif; ?>

    <?php if (!$loggedIn): ?>
        <form method="post">
            <input type="hidden" name="action" value="login">
            <label for="admin_token">Admin Token</label>
            <input type="password" id="admin_token" name="admin_token" autocomplete="current-password" required>
            <input type="submit" value="Login">
        </form>
    <?php else: ?>
        <section>
            <h2>Create Account</h2>
            <form method="post">
                <input type="hidden" name="action" value="create_account">
                <label for="account_name">Account Name</label>
                <input type="text" id="account_name" name="account_name" maxlength="255" required>

                <label>Token Mode</label>
                <div class="token-options">
                    <label><input type="radio" name="token_mode" value="auto" checked> Auto-generate secure token</label>
                    <label><input type="radio" name="token_mode" value="manual"> Provide custom token</label>
                </div>

                <label for="custom_token">Custom Token (optional)</label>
                <input type="text" id="custom_token" name="custom_token" placeholder="Leave blank for auto token">

                <label for="latitude">Latitude</label>
                <input type="number" step="0.000001" id="latitude" name="latitude" min="-90" max="90" required>

                <label for="longitude">Longitude</label>
                <input type="number" step="0.000001" id="longitude" name="longitude" min="-180" max="180" required>

                <input type="submit" value="Create Account">
            </form>

            <?php if ($generatedToken): ?>
                <h3>New Token</h3>
                <p>Copy this token now. It will not be displayed again:</p>
                <div class="token-box"><?php echo esc($generatedToken); ?></div>
            <?php endif; ?>
        </section>

        <section>
            <h2>Existing Accounts</h2>
            <?php if ($accounts): ?>
                <table>
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Created</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($accounts as $acc): ?>
                        <tr>
                            <td><?php echo esc($acc['id']); ?></td>
                            <td><?php echo esc($acc['name']); ?></td>
                            <td><?php echo esc($acc['latitude']); ?></td>
                            <td><?php echo esc($acc['longitude']); ?></td>
                            <td><?php echo esc($acc['created_at']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>No accounts created yet.</p>
            <?php endif; ?>
        </section>
    <?php endif; ?>
</div>
</body>
</html>
