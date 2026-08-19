# Complete CRM & EasyLeads Dual-Engine Integration & Setup Guide

This guide provides step-by-step instructions to integrate **EasyLeads Lead Management & WhatsApp Automation Engine** (Node.js + PostgreSQL + Redis) into your **Existing CRM** (Node.js + MongoDB) without rewriting any database schemas or backend code.

---

## 1. System Architecture

```
                       ┌────────────────────────────────────────┐
                       │   Single Unified React CRM Frontend    │
                       └───────────────────┬────────────────────┘
                                           │
                                  Nginx Reverse Proxy
                                  (app.yourcrm.com)
                                   /             \
                       /api/v1/*  /               \  /api/leads-engine/*
                                 /                 \
        ┌──────────────────────────────┐     ┌──────────────────────────────┐
        │ Existing MongoDB CRM Backend │     │  EasyLeads Engine Backend    │
        │       (Port 4000 / PM2)      │     │  (Port 5000 / PM2 + Redis)   │
        └──────────────────────────────┘     └──────────────────────────────┘
```

---

## 2. Prerequisites & Environment Setup

Ensure the following tools are installed on your local machine and VPS:

* **Node.js**: v18.x or higher
* **PostgreSQL**: v14.x or higher
* **MongoDB**: v6.x or higher
* **Redis Server**: v6.x or higher (Required for WhatsApp background queue)
* **PM2**: `npm install -g pm2` (For VPS process management)
* **Nginx**: For VPS reverse proxy routing

---

## 3. Shared Authentication Setup

Both backends MUST share the exact same JWT Secret Key so that a single login token works seamlessly across all CRM and Lead Management endpoints.

### Existing CRM Backend (`.env`):
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/your_crm_db
JWT_ACCESS_SECRET="your-shared-secret-key-32-chars-long"
```

### EasyLeads Engine Backend (`.env`):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/easyleads_db?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_ACCESS_SECRET="your-shared-secret-key-32-chars-long"
FRONTEND_URL="http://localhost:5173"
WHATSAPP_API_VERSION="v20.0"
```

---

## 4. Localhost Development Setup

### A. Run Existing CRM Backend (Terminal 1)
```bash
cd /path/to/existing-crm/backend
npm run dev
# Running on http://localhost:4000
```

### B. Run EasyLeads Backend Engine (Terminal 2)
```bash
cd /path/to/EasyLeads/backend
npx prisma migrate dev
npm run dev
# Running on http://localhost:5000
```

### C. Run EasyLeads BullMQ Worker (Terminal 3)
```bash
cd /path/to/EasyLeads/backend
npx tsx watch src/worker.ts
# WhatsApp queue listener started
```

### D. Configure Frontend Vite Proxy (`vite.config.ts`)
In your existing CRM React project, configure `vite.config.ts` to proxy requests to both backends:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Existing CRM MongoDB APIs
      '/api/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // EasyLeads PostgreSQL Engine APIs
      '/api/leads-engine': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/leads-engine/, '/api'),
      },
    },
  },
});
```

### E. Run Unified React Frontend (Terminal 4)
```bash
cd /path/to/existing-crm/frontend
npm run dev
# Running on http://localhost:5173
```

---

## 5. Merging Frontend Pages & Components

### Step 1: Copy Files to Frontend Project
Copy these files from EasyLeads into your existing CRM frontend project:

| Source File (EasyLeads) | Target Destination (CRM Frontend) |
| :--- | :--- |
| `frontend/src/pages/Leads.tsx` | `src/pages/Leads.tsx` |
| `frontend/src/pages/Flows.tsx` | `src/pages/Flows.tsx` |
| `frontend/src/pages/Campaigns.tsx` | `src/pages/Campaigns.tsx` |
| `frontend/src/pages/Reminders.tsx` | `src/pages/Reminders.tsx` |
| `frontend/src/components/LeadDrawer.tsx` | `src/components/LeadDrawer.tsx` |

### Step 2: Register Routes in `App.tsx`
```tsx
import Leads from './pages/Leads';
import Flows from './pages/Flows';
import Campaigns from './pages/Campaigns';
import Reminders from './pages/Reminders';

// Inside your main App routes:
<Route path="/leads" element={<Leads />} />
<Route path="/automation-flows" element={<Flows />} />
<Route path="/campaigns" element={<Campaigns />} />
<Route path="/reminders" element={<Reminders />} />
```

### Step 3: Add Navigation Links to Sidebar
```tsx
<NavLink to="/leads">📋 Leads Pipeline</NavLink>
<NavLink to="/automation-flows">⚡ WhatsApp Drips</NavLink>
<NavLink to="/campaigns">📢 WhatsApp Broadcasts</NavLink>
<NavLink to="/reminders">⏰ Service Reminders</NavLink>
```

---

## 6. Real-Time Lead Syncing (MongoDB CRM -> EasyLeads Engine)

Whenever a new lead is added inside your MongoDB CRM backend, trigger an instant background sync to EasyLeads engine:

```javascript
// Inside your MongoDB CRM lead controller (after saving lead to MongoDB):
const axios = require('axios');

async function syncLeadToEasyLeads(leadData, publicOrgToken) {
  try {
    await axios.post(`http://localhost:5000/api/public/leads/form/${publicOrgToken}`, {
      name: leadData.name,
      whatsappPhone: leadData.phone,
      email: leadData.email,
      source: leadData.source || 'CRM Sync',
      notes: leadData.notes
    });
    console.log('Lead successfully synced to EasyLeads engine');
  } catch (error) {
    console.error('EasyLeads sync error:', error.message);
  }
}
```

---

## 7. VPS Production Deployment Guide

### A. PM2 Configuration
Start all backend services using PM2 on your VPS:

```bash
# 1. Existing MongoDB CRM Backend
cd /var/www/yourcrm/backend
pm2 start server.js --name "crm-mongodb-backend"

# 2. EasyLeads Engine Backend
cd /var/www/easyleads/backend
npm run build
pm2 start dist/server.js --name "easyleads-engine"

# 3. EasyLeads WhatsApp Worker
pm2 start dist/worker.js --name "easyleads-worker"

# Save PM2 state for automatic server reboot startup
pm2 save
```

### B. Nginx Site Configuration
Configure Nginx at `/etc/nginx/sites-available/yourcrm.conf`:

```nginx
server {
    listen 80;
    server_name app.yourcrm.com;

    # React Frontend static files
    location / {
        root /var/www/yourcrm/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # MongoDB CRM Backend APIs
    location /api/v1/ {
        proxy_pass http://localhost:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # EasyLeads Engine APIs
    location /api/leads-engine/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/yourcrm.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Multi-Tenant Scalability & Best Practices

1. **Tenant Data Isolation**: All EasyLeads tables enforce `organizationId` scoping. Tenants can never view or modify each other's data.
2. **Workload Separation**: Heavy bulk WhatsApp messaging is offloaded to Redis + PostgreSQL, keeping your MongoDB CRM fast and responsive.
3. **Scaling Worker Processes**: As tenant volume grows, scale the worker across CPU cores:
   ```bash
   pm2 start dist/worker.js -i max --name "easyleads-worker"
   ```

---
*Generated for EasyLeads & CRM Integration*
