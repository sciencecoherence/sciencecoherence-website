<?php
declare(strict_types=1);

require_once __DIR__ . '/inc/bootstrap.php';

$existingUser = wr_current_user();
if ($existingUser && !empty($existingUser['is_admin'])) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wr_csrf_valid((string) ($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        $error = 'The page expired. Reload it and try again.';
    } else {
        $identifier = trim((string) ($_POST['ident'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        $statement = wr_db()->prepare('SELECT id, password_hash, is_admin FROM users WHERE email = ? OR username = ? LIMIT 1');
        $statement->execute([$identifier, $identifier]);
        $candidate = $statement->fetch();
        if ($candidate && !empty($candidate['is_admin']) && password_verify($password, (string) $candidate['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['wr_user_id'] = (int) $candidate['id'];
            $_SESSION['wr_csrf'] = bin2hex(random_bytes(24));
            header('Location: index.php');
            exit;
        }
        sleep(1);
        $error = 'No administrator account matches those details.';
    }
}

wr_security_headers();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Writing Room — Log in</title>
  <link rel="icon" href="../assets/mark.svg" type="image/svg+xml">
  <link rel="stylesheet" href="online.css">
</head>
<body>
  <main class="gateway">
    <a class="gateway-brand" href="../"><img src="../assets/mark.svg" alt=""><span>Science Coherence<small>THE WRITING ROOM</small></span></a>
    <p class="eyebrow"><i></i> PRIVATE EDITOR</p>
    <h1>Return to the room.</h1>
    <p class="intro">Use the same administrator account you use for the Science Coherence blog.</p>
    <?php if ($error !== ''): ?><p class="notice" role="alert"><?= wr_e($error) ?></p><?php endif; ?>
    <form method="post" action="login.php" class="gateway-form">
      <?= wr_csrf_field() ?>
      <label for="ident">Username or email</label>
      <input id="ident" name="ident" type="text" maxlength="190" autocomplete="username" required value="<?= wr_e((string) ($_POST['ident'] ?? '')) ?>">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Open the Writing Room <span>↗</span></button>
    </form>
    <p class="fine-print">Article editing is restricted to the site administrator.</p>
  </main>
</body>
</html>
