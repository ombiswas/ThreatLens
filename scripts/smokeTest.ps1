<#
.SYNOPSIS
    Production & Staging Smoke Test for AI CyberShield.
.DESCRIPTION
    Validates server health, ML microservice readiness, security headers,
    JWT administrator authentication, threat detection pipeline, and client headers.
.PARAMETER ServerUrl
    Base URL of the Express API server (e.g. https://ai-cybershield-server.onrender.com).
.PARAMETER ClientUrl
    Base URL of the React client on Vercel (e.g. https://ai-cybershield.vercel.app).
.PARAMETER MlServiceUrl
    Base URL of the FastAPI microservice on Hugging Face Spaces (e.g. https://username-space.hf.space).
.PARAMETER AdminEmail
    Administrator account email (default: admin@cybershield.org).
.PARAMETER AdminPassword
    Administrator account password.
.EXAMPLE
    .\scripts\smokeTest.ps1 -ServerUrl "https://ai-cybershield-server.onrender.com" -ClientUrl "https://ai-cybershield.vercel.app" -AdminEmail "admin@cybershield.org" -AdminPassword "SuperSecurePassword2026!"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ServerUrl = "http://localhost:5000",

    [Parameter(Mandatory = $false)]
    [string]$ClientUrl = "http://localhost:5173",

    [Parameter(Mandatory = $false)]
    [string]$MlServiceUrl = "http://localhost:7860",

    [Parameter(Mandatory = $false)]
    [string]$AdminEmail = "admin@cybershield.org",

    [Parameter(Mandatory = $false)]
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   AI CyberShield - Post-Deployment Smoke Test Suite" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Report-Check {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Details = ""
    )
    if ($Success) {
        $script:passed++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
    } else {
        $script:failed++
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        if ($Details) { Write-Host "         $Details" -ForegroundColor Yellow }
    }
}

# ----------------------------------------------------
# 1. Server Health & Database Connectivity Check
# ----------------------------------------------------
Write-Host "1. Testing Express API Server Health ($ServerUrl/api/health)..." -ForegroundColor White
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $healthResp = Invoke-WebRequest -Uri "$ServerUrl/api/health" -Method Get -TimeoutSec 15
    $sw.Stop()
    $healthJson = $healthResp.Content | ConvertFrom-Json

    $isHealthy = ($healthResp.StatusCode -eq 200) -and ($healthJson.data.database -eq "connected")
    Report-Check "Server Health & DB Connection" $isHealthy "HTTP $($healthResp.StatusCode), DB: $($healthJson.data.database), Latency: $($sw.ElapsedMilliseconds)ms"

    # Security Headers Verification
    $headers = $healthResp.Headers
    $hasNosniff = $headers["X-Content-Type-Options"] -eq "nosniff"
    $noPoweredBy = -not $headers.ContainsKey("X-Powered-By")
    Report-Check "Security Header: X-Content-Type-Options: nosniff" $hasNosniff
    Report-Check "Security Header: X-Powered-By suppressed" $noPoweredBy
} catch {
    Report-Check "Server Health & DB Connection" $false $_.Exception.Message
}

# ----------------------------------------------------
# 2. ML Inference Microservice Health Check
# ----------------------------------------------------
if ($MlServiceUrl) {
    Write-Host "`n2. Testing ML Microservice Health ($MlServiceUrl/health)..." -ForegroundColor White
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $mlResp = Invoke-WebRequest -Uri "$MlServiceUrl/health" -Method Get -TimeoutSec 20
        $sw.Stop()
        $mlJson = $mlResp.Content | ConvertFrom-Json

        $isMlHealthy = ($mlResp.StatusCode -eq 200) -and ($mlJson.status -eq "healthy") -and ($mlJson.model_loaded -eq $true)
        Report-Check "ML Microservice Readiness" $isMlHealthy "HTTP $($mlResp.StatusCode), Model: $($mlJson.model_version), Latency: $($sw.ElapsedMilliseconds)ms"
    } catch {
        Report-Check "ML Microservice Readiness" $false $_.Exception.Message
    }
}

# ----------------------------------------------------
# 3. Administrator Authentication & JWT Issuance
# ----------------------------------------------------
$token = $null
if ($AdminPassword) {
    Write-Host "`n3. Testing Admin Authentication ($ServerUrl/api/auth/login)..." -ForegroundColor White
    try {
        $loginBody = @{
            email = $AdminEmail
            password = $AdminPassword
        } | ConvertTo-Json

        $loginResp = Invoke-WebRequest -Uri "$ServerUrl/api/auth/login" `
            -Method Post `
            -Body $loginBody `
            -ContentType "application/json" `
            -TimeoutSec 15

        $loginJson = $loginResp.Content | ConvertFrom-Json
        $token = $loginJson.data.token
        $role = $loginJson.data.user.role

        $loginSuccess = ($loginResp.StatusCode -eq 200) -and ($role -eq "admin") -and ($token.Length -gt 20)
        Report-Check "Admin Login & JWT Issuance" $loginSuccess "Authenticated as '$($loginJson.data.user.email)' (Role: $role)"
    } catch {
        Report-Check "Admin Login & JWT Issuance" $false $_.Exception.Message
    }
} else {
    Write-Host "`n3. Skipping Admin Login (No -AdminPassword supplied)" -ForegroundColor DarkGray
}

# ----------------------------------------------------
# 4. Threat Detection Core Pipeline (ML + Heuristic + Scoring)
# ----------------------------------------------------
if ($token) {
    Write-Host "`n4. Testing Live Threat Detection Pipeline ($ServerUrl/api/detect/flow)..." -ForegroundColor White
    try {
        # Sample DoS flow fixture with standard 67 CIC-IDS2017 features
        $flowData = @{
            "Destination Port" = 80
            "Flow Duration" = 1200000
            "Total Fwd Packets" = 12
            "Total Backward Packets" = 1
            "Total Length of Fwd Packets" = 1800
            "Total Length of Bwd Packets" = 0
            "Fwd Packet Length Max" = 400
            "Fwd Packet Length Min" = 0
            "Fwd Packet Length Mean" = 150.0
            "Fwd Packet Length Std" = 50.0
            "Bwd Packet Length Max" = 0
            "Bwd Packet Length Min" = 0
            "Bwd Packet Length Mean" = 0.0
            "Bwd Packet Length Std" = 0.0
            "Flow Bytes/s" = 1500.0
            "Flow Packets/s" = 10.83
            "Flow IAT Mean" = 100000.0
            "Flow IAT Std" = 15000.0
            "Flow IAT Max" = 150000.0
            "Flow IAT Min" = 5000.0
            "Fwd IAT Total" = 1200000.0
            "Fwd IAT Mean" = 109090.0
            "Fwd IAT Std" = 12000.0
            "Fwd IAT Max" = 150000.0
            "Fwd IAT Min" = 5000.0
            "Bwd IAT Total" = 0.0
            "Bwd IAT Mean" = 0.0
            "Bwd IAT Std" = 0.0
            "Bwd IAT Max" = 0.0
            "Bwd IAT Min" = 0.0
            "Fwd PSH Flags" = 0
            "Bwd PSH Flags" = 0
            "Fwd URG Flags" = 0
            "Bwd URG Flags" = 0
            "Fwd Header Length" = 384
            "Bwd Header Length" = 32
            "Fwd Packets/s" = 10.0
            "Bwd Packets/s" = 0.83
            "Min Packet Length" = 0
            "Max Packet Length" = 400
            "Packet Length Mean" = 138.46
            "Packet Length Std" = 52.1
            "Packet Length Variance" = 2714.4
            "FIN Flag Count" = 0
            "SYN Flag Count" = 1
            "RST Flag Count" = 0
            "PSH Flag Count" = 0
            "ACK Flag Count" = 1
            "URG Flag Count" = 0
            "CWE Flag Count" = 0
            "ECE Flag Count" = 0
            "Down/Up Ratio" = 0
            "Average Packet Size" = 149.1
            "Avg Fwd Segment Size" = 150.0
            "Avg Bwd Segment Size" = 0.0
            "Fwd Header Length.1" = 384
            "Subflow Fwd Packets" = 12
            "Subflow Fwd Bytes" = 1800
            "Subflow Bwd Packets" = 1
            "Subflow Bwd Bytes" = 0
            "Init_Win_bytes_forward" = 29200
            "Init_Win_bytes_backward" = 0
            "act_data_pkt_fwd" = 8
            "min_seg_size_forward" = 32
            "Active Mean" = 0.0
            "Active Std" = 0.0
            "Active Max" = 0.0
            "Active Min" = 0.0
            "Idle Mean" = 0.0
            "Idle Std" = 0.0
            "Idle Max" = 0.0
            "Idle Min" = 0.0
        }

        $detectBody = @{
            flow = $flowData
            flowSummary = @{
                srcIp = "192.168.1.100"
                dstIp = "10.0.0.1"
                srcPort = 44556
                dstPort = 80
                protocol = "TCP"
            }
        } | ConvertTo-Json -Depth 5

        $detectResp = Invoke-WebRequest -Uri "$ServerUrl/api/detect/flow" `
            -Method Post `
            -Headers @{ Authorization = "Bearer $token" } `
            -Body $detectBody `
            -ContentType "application/json" `
            -TimeoutSec 20

        $detectJson = $detectResp.Content | ConvertFrom-Json
        $data = $detectJson.data

        $detectSuccess = ($detectResp.StatusCode -eq 200) -and ($data.threatScore -ge 0) -and ($data.mlClass -ne $null)
        Report-Check "Detection Pipeline E2E" $detectSuccess "Class: $($data.mlClass) (Conf: $([math]::Round($data.confidence * 100))%), Score: $($data.threatScore)/100 ($($data.riskLevel))"
    } catch {
        Report-Check "Detection Pipeline E2E" $false $_.Exception.Message
    }
}

# ----------------------------------------------------
# 5. Client Web Application & CSP Security Headers
# ----------------------------------------------------
if ($ClientUrl) {
    Write-Host "`n5. Testing Web Client & CSP Headers ($ClientUrl)..." -ForegroundColor White
    try {
        $clientResp = Invoke-WebRequest -Uri $ClientUrl -Method Get -TimeoutSec 15
        $cHeaders = $clientResp.Headers

        $hasCsp = $cHeaders.ContainsKey("Content-Security-Policy")
        $hasXfo = $cHeaders["X-Frame-Options"] -eq "DENY"

        Report-Check "Client Availability" ($clientResp.StatusCode -eq 200) "HTTP $($clientResp.StatusCode)"
        Report-Check "Client Header: Content-Security-Policy" $hasCsp
        Report-Check "Client Header: X-Frame-Options: DENY" $hasXfo
    } catch {
        Report-Check "Client Availability" $false $_.Exception.Message
    }
}

# ----------------------------------------------------
# Summary
# ----------------------------------------------------
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "                Smoke Test Complete                     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All deployment smoke checks PASSED. System is production ready!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "One or more deployment smoke checks FAILED. Review logs above." -ForegroundColor Red
    exit 1
}
