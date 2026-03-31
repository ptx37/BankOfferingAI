# 🔧 Fix: WSL Services Not Reachable from Windows

The issue is that **docker-compose services are not running yet**. Let me guide you through the complete setup.

---

## ✅ STEP 1: Setup Environment (One-Time)

```bash
# In WSL, navigate to repo
cd /home/cristianplaton/BankOfferingAI

# Copy environment file
cp .env.local .env

# Edit .env to add your API key
nano .env
```

Find this line:
```
ANTHROPIC_API_KEY=sk-your-key-here
```

Replace with your actual key:
```
ANTHROPIC_API_KEY=sk-xxx... (your real key)
```

Save and exit (Ctrl+X, Y, Enter)

---

## ✅ STEP 2: Start All Services

```bash
# Start all 11 services in the background
docker-compose up -d

# Wait 30-60 seconds for them to start
sleep 60

# Check status
docker-compose ps
```

Expected output should show **11 containers** with status "Up" or "healthy":
```
NAME                    STATUS         
bankoffer-postgres      Up (healthy)
bankoffer-redis         Up (healthy)
bankoffer-api           Up (healthy)
bankoffer-frontend      Up (running)
... (7 more)
```

If you see "Restarting" or "Exited", run:
```bash
docker-compose logs api
docker-compose logs postgres
```

---

## ✅ STEP 3: Verify Services Are Accessible from WSL

```bash
# Test API health
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","service":"bank-offering-api"}
```

If this works, services are running. If it fails, check logs:
```bash
docker-compose logs -f api
```

---

## ✅ STEP 4: Access from Windows (Now It Should Work!)

Open these in your Windows browser:

```
http://172.24.208.80:3000          (Frontend)
http://172.24.208.80:8000/docs     (API)
http://172.24.208.80:5050          (pgAdmin)
http://172.24.208.80:3001          (Grafana)
```

---

## 🔧 If Still Not Working

### **Issue A: Still shows "connection refused"**

**Cause:** WSL IP might have changed

**Fix:**
```powershell
# In Windows PowerShell, find new IP
wsl hostname -I

# Replace 172.24.208.80 with the new IP in your URLs
```

### **Issue B: Containers won't start**

**Check logs:**
```bash
docker-compose logs postgres
docker-compose logs api
```

**Common errors:**
- `Bind for 0.0.0.0:5432 failed` → Port already in use
- `password authentication failed` → Database not ready
- `refused to connect` → Service not started

**Fix:**
```bash
# Stop and remove everything
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build

# Wait for services
sleep 90
docker-compose ps
```

### **Issue C: Docker Desktop vs WSL Docker**

**Check which Docker you're using:**
```bash
echo $DOCKER_HOST
```

If empty → Using native WSL Docker ✓ (correct)
If contains `tcp://` → Using Docker Desktop ✓ (also works)

### **Issue D: Windows Firewall Blocking**

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Look for Docker or WSL
4. Ensure it's checked for both "Private" and "Public"
5. Click OK

---

## 📋 Complete Diagnostic Checklist

```bash
# Run all these in WSL

# 1. Check WSL is running
wsl --version

# 2. Check Docker is available
docker --version
docker ps

# 3. Check if already running
docker-compose ps

# 4. If not running, start
docker-compose up -d

# 5. Wait for health
sleep 60
docker-compose ps

# 6. Verify API is accessible
curl http://localhost:8000/health

# 7. Check all containers
docker ps -a

# 8. View logs for errors
docker-compose logs
```

---

## 🚀 Complete Fresh Start (Nuclear Option)

If nothing else works, start completely fresh:

```bash
# In WSL
cd /home/cristianplaton/BankOfferingAI

# Stop everything
docker-compose down -v

# Clean up Docker
docker system prune -a --volumes

# Recreate .env
cp .env.local .env
nano .env  # Add your API key

# Start fresh
docker-compose up -d --build

# Wait for services
sleep 90

# Verify
docker-compose ps
curl http://localhost:8000/health
```

---

## 🔍 Windows Network Diagnostics

From **Windows PowerShell**:

```powershell
# Find WSL IP
wsl hostname -I

# Test connectivity
ping 172.24.208.80

# If ping fails, try this:
Test-NetConnection -ComputerName 172.24.208.80 -Port 8000

# Check if port is accessible
curl http://172.24.208.80:8000/health
```

---

## 📊 Expected Ports on Windows

| Service | Port | Status Command |
|---------|------|-----------------|
| Frontend | 3000 | `curl http://172.24.208.80:3000` |
| API | 8000 | `curl http://172.24.208.80:8000/health` |
| PostgreSQL | 5432 | `telnet 172.24.208.80 5432` |
| Redis | 6379 | `telnet 172.24.208.80 6379` |
| pgAdmin | 5050 | `curl http://172.24.208.80:5050` |
| Grafana | 3001 | `curl http://172.24.208.80:3001` |

---

## ✅ Recommended Workflow

1. **In WSL:**
   ```bash
   cd /home/cristianplaton/BankOfferingAI
   cp .env.local .env
   nano .env  # Add API key
   docker-compose up -d
   sleep 60
   docker-compose ps  # Verify all running
   ```

2. **In Windows PowerShell:**
   ```powershell
   # Find WSL IP
   wsl hostname -I
   
   # Test API
   curl http://172.24.208.80:8000/health
   ```

3. **In Windows Browser:**
   ```
   http://172.24.208.80:3000
   ```

---

## 🆘 Still Not Working?

Run this diagnostic script in WSL:

```bash
cat << 'DIAG' > /tmp/diagnose.sh
#!/bin/bash
echo "=== WSL Diagnostics ==="
echo "1. Docker version:"
docker --version

echo -e "\n2. Container status:"
docker-compose ps

echo -e "\n3. Network info:"
hostname -I

echo -e "\n4. API health (localhost):"
curl -s http://localhost:8000/health | jq . || echo "FAILED"

echo -e "\n5. Docker bridge info:"
docker network inspect bankoffer-network 2>/dev/null | grep "IPv4Address" || echo "Network not found"

echo -e "\n6. Running processes:"
docker ps --format "table {{.Names}}\t{{.Status}}"

echo -e "\n7. Volume status:"
docker volume ls

echo -e "\n8. Error logs:"
docker-compose logs --tail=20 api 2>&1 | head -20
DIAG

chmod +x /tmp/diagnose.sh
/tmp/diagnose.sh
```

Share the output and I can help further!

---

## 📞 Quick Support

If you're stuck, provide:
1. Output of `docker-compose ps`
2. Output of `curl http://localhost:8000/health`
3. Output of `docker-compose logs api`
4. Output of `wsl hostname -I`
5. Have you set `ANTHROPIC_API_KEY` in `.env`?

---

**Most Common Fix:** Just run `docker-compose up -d` and wait 60 seconds!
