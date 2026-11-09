$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectPath
$packageInfo = Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json
$releaseVersion = $packageInfo.version
if ($releaseVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Unexpected version format' }
$releasePath = Join-Path $projectPath 'release'
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($browserName in @('chrome', 'edge')) {
    $buildPath = Join-Path $projectPath "dist\$browserName"
    $builtManifest = Get-Content -LiteralPath (Join-Path $buildPath 'manifest.json') -Raw | ConvertFrom-Json
    if ($builtManifest.name -ne 'Sean Lingo' -or $builtManifest.version -ne $releaseVersion) { throw 'Build metadata does not match package' }
    foreach ($noticeName in @('LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.txt')) {
        Copy-Item -LiteralPath (Join-Path $projectPath $noticeName) -Destination $buildPath -Force
    }
    # Vite's asset manifest is build metadata, not a browser extension manifest.
    # Create explicit ZIP entries so exclusions and forward-slash paths are reliable.
    $zipPath = Join-Path $releasePath "sean-lingo-$releaseVersion-$browserName.zip"
    $zipStream = [IO.File]::Open($zipPath, [IO.FileMode]::Create)
    $zipArchive = [IO.Compression.ZipArchive]::new($zipStream, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($buildFile in Get-ChildItem -LiteralPath $buildPath -Recurse -File -Force) {
            $entryPath = $buildFile.FullName.Substring($buildPath.Length + 1).Replace('\', '/')
            if ($entryPath.StartsWith('.vite/')) { continue }
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $buildFile.FullName, $entryPath, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    } finally {
        $zipArchive.Dispose()
        $zipStream.Dispose()
    }
    $verifiedZip = [IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $entryNames = @($verifiedZip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        $manifestEntries = @($entryNames | Where-Object { ($_ -split '/')[-1] -ieq 'manifest.json' })
        if ($manifestEntries.Count -ne 1 -or $manifestEntries[0] -cne 'manifest.json') {
            throw "Invalid extension ZIP: expected one root manifest.json, found $($manifestEntries -join ', ')"
        }
        if ($entryNames | Where-Object { $_.StartsWith('.vite/') }) { throw 'Build metadata leaked into extension ZIP' }
        foreach ($requiredEntry in @('service-worker-loader.js', 'legal/privacy.html', 'legal/open-source.html', 'LICENSE', 'THIRD_PARTY_NOTICES.txt')) {
            if ($entryNames -notcontains $requiredEntry) { throw "Missing runtime entry: $requiredEntry" }
        }
        Write-Output "$browserName ZIP validated: one root manifest.json; no .vite metadata."
    } finally { $verifiedZip.Dispose() }
}
$sourcePath = Join-Path $releasePath "source\sean-lingo-$releaseVersion"
New-Item -ItemType Directory -Force -Path $sourcePath | Out-Null
foreach ($sourceName in @('src', 'public', 'branding', 'scripts', 'publishing')) {
    Copy-Item -LiteralPath (Join-Path $projectPath $sourceName) -Destination $sourcePath -Recurse -Force
}
foreach ($sourceName in @('package.json', 'package-lock.json', 'manifest.config.ts', 'vite.config.ts', 'tsconfig.json', 'tsconfig.node.json', 'postcss.config.js', '.eslintrc.cjs', 'README.md', 'CHANGELOG.md', 'LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.txt')) {
    Copy-Item -LiteralPath (Join-Path $projectPath $sourceName) -Destination $sourcePath -Force
}
Compress-Archive -LiteralPath $sourcePath -DestinationPath (Join-Path $releasePath "sean-lingo-$releaseVersion-source.zip") -Force
Get-ChildItem -LiteralPath $releasePath -Filter "sean-lingo-$releaseVersion-*.zip" | Get-FileHash -Algorithm SHA256 | ForEach-Object {
    $_.Hash + '  ' + (Split-Path $_.Path -Leaf)
} | Set-Content -Encoding utf8 (Join-Path $releasePath "sean-lingo-$releaseVersion-SHA256SUMS.txt")
Write-Output "Packaged Sean Lingo $releaseVersion with corresponding source."
