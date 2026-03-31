# 🔗 BankOffer AI on WSL — Access from Windows

Complete guide for accessing your WSL Docker services from Windows.

---

## ✨ Your Current Setup

```
✓ Running:      WSL 2 with native Docker
✓ WSL IP:       172.24.208.80
✓ Services:     11 containers (API, DB, Frontend, Monitoring)
✓ Status:       Ready to access from Windows
```

---

## 🚀 Quickest Solution (30 seconds)

### Just Use the WSL IP

Open these in your Windows browser right now:

```
http://172.24.208.80:3000          (Frontend)
http://172.24.208.80:8000/docs     (API Docs)
http://172.24.208.80:5050          (pgAdmin)
http://172.24.208.80:3001          (Grafana)
```

**That's it!** No additional setup needed.

---

## 🔧 Advanced Setup (Optional)

### Option A: Hostname Mapping (Easy)

Map IP to friendly name:

**1. Open Notepad as Administrator**
- Right-click Notepad → "Run as Administrator"

**2. Open File:**
- File → Open
- Path: `C:\Windows\System32\drivers\etc\hosts`

**3. Add at the end:**
```
172.24.208.80   bankoffer.local
```

**4. Save**

**5. Now use from Windows:**
```
http://bankoffer.local:3000
http://bankoffer.local:8000/docs
http://bankoffer.local:5050
```

### Option B: Port Forwarding (Advanced)

Forward `localhost` ports to WSL (Windows 11/Server only).

**1. Copy the PowerShell script:**
```
C:\Users\YourUser\Desktop\windows-setup.ps1
```

**2. Right-click PowerShell → "Run as Administrator"**

**3. Run:**
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\YourUser\Desktop\windows-setup.ps1
```

**4. Now use:**
```
http://localhost:3000
http://localhost:8000/docs
```

---

## 📋 All Access Methods

### Method 1: Direct IP (Simplest)
```
http://172.24.208.80:3000
```

### Method 2: Hostname (Easy)
```
http://bankoffer.local:3000          (requires hosts file edit)
```

### Method 3: Localhost (Advanced)
```
http://localhost:3000                (requires windows-setup.ps1)
```

---

## 📚 Complete Links & Credentials

### Frontend & API
| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://172.24.208.80:3000 | Main dashboard |
| API Docs | http://172.24.208.80:8000/docs | Interactive API explorer |
| API ReDoc | http://172.24.208.80:8000/redoc | API reference |
| Health | http://172.24.208.80:8000/health | Status check |

### Databases & Tools
| Service | URL | Username | Password |
|---------|-----|----------|----------|
| pgAdmin | http://172.24.208.80:5050 | admin@example.com | admin123 |
| Grafana | http://172.24.208.80:3001 | admin | admin123 |
| Redis | http://172.24.208.80:8081 | — | — |
| Prometheus | http://172.24.208.80:9090 | — | — |

### Database Credentials
```
PostgreSQL:
  Host:     172.24.208.80
  Port:     5432
  Database: bankofferingai
  User:     postgres
  Pass:     postgres

Redis:
  Host:     172.24.208.80
  Port:     6379
  Pass:     redis123

Kafka:
  Broker:   172.24.208.80:9092
  Zookeeper: 172.24.208.80:2181
```

---

## 🧪 Quick Test (Windows PowerShell)

Verify everything works:

```powershell
# Test API is accessible
curl http://172.24.208.80:8000/health

# Expected response:
# {"status":"healthy","service":"bank-offering-api"}

# Test frontend loads
curl http://172.24.208.80:3000

# Check specific service
curl http://172.24.208.80:5050  # pgAdmin
```

---

## 🔄 If WSL IP Changes

WSL IP can change when you restart. To find the new IP:

**In Windows PowerShell:**
```powershell
wsl hostname -I
```

**Then:**
- Replace old IP in browser bookmarks
- If using hosts file, update the IP there
- If using port forwarding, run windows-setup.ps1 again

---

## 📦 Configuration Files Created

All in your BankOfferingAI directory:

```
windows-setup.ps1          ← Run to setup port forwarding
windows-cleanup.ps1        ← Run to remove port forwarding
WSL_WINDOWS_ACCESS.md      ← Full documentation
WINDOWS_QUICK_LINKS.txt    ← Bookmarkable links
WSL_SETUP_GUIDE.md        ← This file
```

---

## 📋 Docker Compose Updates

All ports now bind to `0.0.0.0` so they're accessible from Windows:

```yaml
# Before:
ports:
  - "8000:8000"

# After:
ports:
  - "0.0.0.0:8000:8000"
```

This means services listen on all network interfaces, not just localhost.

---

## ✅ Verification Checklist

- [ ] Found WSL IP: `172.24.208.80`
- [ ] Can access http://172.24.208.80:3000 from Windows
- [ ] Can access http://172.24.208.80:8000/docs from Windows
- [ ] Docker containers running: `docker-compose ps` (in WSL)
- [ ] PostgreSQL accessible: host=172.24.208.80, port=5432
- [ ] pgAdmin loads: http://172.24.208.80:5050

---

## 🆘 Troubleshooting

### "Connection refused" from Windows

1. **Check services are running (in WSL):**
   ```bash
   docker-compose ps
   ```
   All should show "Up" or "healthy"

2. **Check Docker is running (in WSL):**
   ```bash
   docker ps
   ```

3. **Check IP hasn't changed:**
   ```powershell
   wsl hostname -I
   ```

4. **Test basic connectivity:**
   ```powershell
   ping 172.24.208.80
   ```

### Services won't start

```bash
# In WSL, check logs
docker-compose logs api
docker-compose logs postgres

# Rebuild everything
docker-compose down -v
docker-compose up -d --build
```

### "Port already in use" error

Another application is using the port. Either:
- Close the other application
- Change the port in docker-compose.yml
- Check what's using it: `lsof -i :8000`

### Can't find WSL IP

Ensure WSL is running:
```powershell
wsl -l -v       # List WSL distributions
wsl              # Start WSL
```

---

## 📖 Related Documentation

| File | Purpose |
|------|---------|
| `LOCAL_DEPLOYMENT.md` | Complete Docker setup guide |
| `DOCKER_QUICKREF.md` | Quick command reference |
| `DEPLOYMENT_SUMMARY.md` | Overview with examples |
| `LINKS_AND_CREDENTIALS.txt` | All credentials |
| `WINDOWS_QUICK_LINKS.txt` | Bookmarkable links |

---

## 💡 Tips

1. **Bookmark these URLs** in your Windows browser
2. **Add to Windows hosts file** if you'll access frequently
3. **Test with curl** if browser doesn't work
4. **Check logs in WSL** if something seems wrong
5. **Restart WSL** with `wsl --shutdown` if IP becomes unreachable

---

## 🎯 Next Steps

1. **Option A (Quickest):** Open http://172.24.208.80:3000 in Windows
2. **Option B (Cleaner):** Edit hosts file, use bankoffer.local
3. **Option C (PowerShell):** Run windows-setup.ps1, use localhost

Then explore:
- Dashboard: http://172.24.208.80:3000
- API: http://172.24.208.80:8000/docs
- Database: http://172.24.208.80:5050
- Monitoring: http://172.24.208.80:3001

---

**You're all set!** Pick your access method above and start using BankOffer AI from Windows. 🚀
