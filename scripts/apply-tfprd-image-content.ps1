# Applies image-accurate description + seoDescription patches to DynamoDB.
$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "scripts\data\tfprd-image-content-descriptions.json"))) {
  $root = (Get-Location).Path
}
Set-Location $root

$products = Get-Content "scripts\data\tfprd-image-content-descriptions.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$table = if ($env:PRODUCTS_TABLE) { $env:PRODUCTS_TABLE } else { "hr-ecom-products-prod" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$now = [DateTime]::UtcNow.ToString("o")
$tmp = Join-Path $root "scripts\data\_ddb_patch_tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$log = New-Object System.Collections.Generic.List[string]

foreach ($p in $products) {
  $keyPath = Join-Path $tmp ("key-{0}.json" -f $p.slug)
  $valPath = Join-Path $tmp ("val-{0}.json" -f $p.slug)
  $keyJson = (@{ PK = @{ S = ("PRODUCT#{0}" -f $p.slug) }; SK = @{ S = "META" } } | ConvertTo-Json -Compress -Depth 5)
  $valJson = (@{
    ":d" = @{ S = [string]$p.description }
    ":s" = @{ S = [string]$p.seoDescription }
    ":now" = @{ S = $now }
  } | ConvertTo-Json -Compress -Depth 5)
  [System.IO.File]::WriteAllText($keyPath, $keyJson)
  [System.IO.File]::WriteAllText($valPath, $valJson)

  $keyUri = "file://" + ($keyPath -replace '\\','/')
  $valUri = "file://" + ($valPath -replace '\\','/')
  $out = & $aws dynamodb update-item `
    --region $region `
    --table-name $table `
    --key $keyUri `
    --update-expression "SET description = :d, seoDescription = :s, updatedAt = :now" `
    --condition-expression "attribute_exists(PK)" `
    --expression-attribute-values $valUri `
    --return-values UPDATED_NEW 2>&1 | Out-String

  if ($LASTEXITCODE -eq 0) {
    $log.Add("OK $($p.slug)")
  } else {
    $log.Add("FAIL $($p.slug): $out")
  }
}

$logPath = Join-Path $root "scripts\data\_tfprd-patch-log.txt"
[System.IO.File]::WriteAllLines($logPath, $log)
$log | ForEach-Object { Write-Host $_ }
Write-Host ("DONE count={0}" -f $log.Count)
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
