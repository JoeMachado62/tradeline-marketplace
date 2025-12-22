<?php
// PHP LOGIC - Keep as is
$consumer_key = 'ck_90cb93d1d38c5b84599121229c11ed2b8b5dfeff';
$consumer_secret = 'cs_4870c2bba527170a92520cdd4d486816e61e9a35';

$url = 'https://tradelinesupply.com/wp-json/wc/v3/pricing';

function join_with_equals_sign($params, $query_params = array(), $key = '')
{
  foreach ($params as $param_key => $param_value) {
    if ($key) {
      $param_key = $key . '%5B' . $param_key . '%5D';
    }
    if (is_array($param_value)) {
      $query_params = join_with_equals_sign($param_value, $query_params, $param_key);
    } else {
      $string = $param_key . '=' . $param_value;
      $query_params[] = wc_rest_urlencode_rfc3986($string);
    }
  }
  return $query_params;
}

function wc_rest_urlencode_rfc3986($value)
{
  if (is_array($value)) {
    return array_map('wc_rest_urlencode_rfc3986', $value);
  }
  return str_replace(array('+', '%7E'), array(' ', '~'), rawurlencode($value));
}

$time = time();
$params = [
  'oauth_consumer_key' => $consumer_key,
  'oauth_nonce' => $time,
  'oauth_signature_method' => 'HMAC-SHA1',
  'oauth_timestamp' => $time,
];
$query = [];
foreach ($params as $key => $value) {
  $query[] = $key . '=' . $value;
}
$http_method = 'GET';
$base_request_uri = rawurlencode($url);
$query_string = implode('%26', join_with_equals_sign($params));
$string_to_sign = $http_method . '&' . $base_request_uri . '&' . $query_string;
$hash_algorithm = strtolower(str_replace('HMAC-', '', $params['oauth_signature_method']));
$secret = $consumer_secret . '&';
$signature = base64_encode(hash_hmac($hash_algorithm, $string_to_sign, $secret, true));
$url = $url . "?" . implode('&', $query) . "&oauth_signature=" . $signature;

$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 30,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "GET",
  CURLOPT_HTTPHEADER => array(
    "cache-control: no-cache"
  ),
));

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
  return;
}
$data = json_decode($response, JSON_OBJECT_AS_ARRAY);
// Handle cases where data might be null or not an array
if (!$data || !is_array($data)) {
  $data = [];
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tradeline Pricing Table</title>
  <!-- Modern Inter Font -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
  <script src="stupidtable.js"></script>
  <style>
    :root {
      --text-color: #4a4a4a;
      --muted-color: #9b9b9b;
      --border-color: #f0f0f0;
      --stock-green: #27ae60;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: var(--text-color);
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
    }

    .widget-container {
      padding: 5px;
    }

    .table {
      margin-bottom: 0;
      border-collapse: collapse;
    }

    .table thead th {
      border-bottom: 1px solid #e0e0e0;
      padding: 15px 12px;
      font-weight: 500;
      color: #999999;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.8px;
      cursor: pointer;
      background: #ffffff;
      white-space: nowrap;
    }

    /* Arrows for sorting */
    .table thead th.sorting-asc::after {
      content: " \2191";
      opacity: 0.5;
    }

    .table thead th.sorting-desc::after {
      content: " \2193";
      opacity: 0.5;
    }

    .table tbody td {
      padding: 20px 12px;
      vertical-align: middle;
      border-bottom: 1px solid var(--border-color);
      color: #444444;
    }

    .table tbody tr:hover {
      background-color: #fafafa;
    }

    /* Column Specifics */
    .col-bank {
      min-width: 150px;
    }

    .col-id {
      color: #999999;
      font-size: 11px;
    }

    .col-price {
      font-weight: 600;
      text-align: right;
      color: #111111;
      font-size: 14px;
    }

    .bank-logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bank-logo {
      width: 28px;
      height: 28px;
      object-fit: contain;
      background: transparent;
    }

    .stock-status {
      color: var(--stock-green);
      font-weight: 400;
    }

    .stock-low {
      color: #e74c3c;
    }

    /* Hide the ugly scrollbar on some browsers */
    .table-responsive {
      scrollbar-width: thin;
      scrollbar-color: #eeeeee transparent;
    }
  </style>
</head>

<body>

  <?php
  /**
   * Clean function to strip any WooCommerce/HTML wrapping from fields
   */
  function clean_val($val)
  {
    if (!$val)
      return "";
    return trim(strip_tags($val));
  }
  ?>

  <div class="widget-container">
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th data-sort="string" class="col-bank">Tradeline</th>
            <th data-sort="int">ID</th>
            <th data-sort="float">Limit</th>
            <th data-sort="string">Opened</th>
            <th data-sort="string">Buy Date</th>
            <th data-sort="string">Reports</th>
            <th data-sort="int">Stock</th>
            <th data-sort="float" data-sort-onload="yes" style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>
          <?php if (count($data) > 0): ?>
            <?php foreach ($data as $line): ?>
              <?php
              $clean_limit = clean_val($line['credit_limit']);
              $clean_price = clean_val($line['price']);
              // Generate numeric values for sorting
              $limit_numeric = (float) preg_replace('/[^0-9.]/', '', $clean_limit);
              $price_numeric = (float) preg_replace('/[^0-9.]/', '', $clean_price);
              ?>
              <tr>
                <td>
                  <div class="bank-logo-container">
                    <?php if (!empty($line['image'])): ?>
                      <img src="<?php echo htmlspecialchars($line['image']); ?>" class="bank-logo" alt="">
                    <?php endif; ?>
                    <span class="fw-medium"><?php echo htmlspecialchars($line['bank_name']); ?></span>
                  </div>
                </td>
                <td class="col-id"><?php echo htmlspecialchars($line['card_id']); ?></td>
                <td data-sort-value="<?php echo $limit_numeric; ?>">
                  <?php echo $clean_limit; ?>
                </td>
                <td data-sort-value="<?php echo strtotime($line['date_opened']); ?>">
                  <?php echo htmlspecialchars($line['date_opened']); ?>
                </td>
                <td data-sort-value="<?php echo strtotime($line['purchase_deadline']); ?>">
                  <?php echo htmlspecialchars($line['purchase_deadline']); ?>
                </td>
                <td><?php echo htmlspecialchars($line['reporting_period'] ?? 'Monthly'); ?></td>
                <td data-sort-value="<?php echo (int) $line['stock']; ?>">
                  <span class="stock-status <?php echo ($line['stock'] < 3) ? 'stock-low' : ''; ?>">
                    <?php echo (int) $line['stock']; ?> in stock
                  </span>
                </td>
                <td data-sort-value="<?php echo $price_numeric; ?>" class="col-price">
                  <?php echo $clean_price; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php else: ?>
            <tr>
              <td colspan="8" class="text-center p-5 text-muted">
                No tradelines available at this time.
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    $(function () {
      const $table = $("table").stupidtable();

      // Resize Broadcast for GHL Iframe
      function updateHeight() {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      }

      updateHeight();
      $table.on("aftersort", updateHeight);
      window.addEventListener('resize', updateHeight);
      // Recurring check to catch lazy-loaded assets
      setInterval(updateHeight, 1500);
    });
  </script>

</body>

</html>