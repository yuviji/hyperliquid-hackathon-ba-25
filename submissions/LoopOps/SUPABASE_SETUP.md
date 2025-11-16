# Supabase Setup Documentation

## ✅ Database Configuration Complete

The LoopOps Supabase database has been fully configured using Supabase MCP tools.

### Project Details

- **Project Name**: LoopOps
- **Project ID**: `wtuqwigyhuzuiabpwdep`
- **Region**: `us-east-1`
- **Database**: PostgreSQL 17.6
- **URL**: `https://wtuqwigyhuzuiabpwdep.supabase.co`
- **Status**: ✅ ACTIVE_HEALTHY

---

## 📊 Database Schema

### Tables Created

1. **`distributions`**
   - Core table for all distributions (LoopDrops and Loyalty Rewards)
   - Columns: id, type, name, token, total_amount, schedule, frequency, start_date, end_date, status, json_hash, description, created_at, updated_at
   - **RLS Enabled**: ✅
   - **Rows**: 0 (ready for data)

2. **`proposals`**
   - Stores multisig proposal metadata
   - Columns: id, distribution_id, multisig_tx_id, multisig_address, threshold, calldata, tx_hash, created_at, executed_at
   - **RLS Enabled**: ✅
   - **Foreign Key**: distribution_id → distributions(id)

3. **`approvals`**
   - Tracks approver signatures and decisions
   - Columns: id, distribution_id, approver, signature, approved_at, rejected_at, created_at
   - **RLS Enabled**: ✅
   - **Foreign Key**: distribution_id → distributions(id)
   - **Unique Constraint**: (distribution_id, approver)

4. **`recipients`**
   - Individual recipient records for each distribution
   - Columns: id, distribution_id, address, amount, status, created_at
   - **RLS Enabled**: ✅
   - **Foreign Key**: distribution_id → distributions(id)

5. **`logs`**
   - Complete audit trail of all system events
   - Columns: id, timestamp, level, distribution_id, message, metadata, created_at
   - **RLS Enabled**: ✅
   - **Foreign Key**: distribution_id → distributions(id) (nullable)

---

## 🔒 Security Configuration

### Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

#### Service Role (Backend)
- **Full Access**: The backend using `SUPABASE_SERVICE_KEY` has complete CRUD access
- Allows: SELECT, INSERT, UPDATE, DELETE on all tables

#### Anon Role (Frontend)
- **Read-Only Access**: The frontend using `SUPABASE_ANON_KEY` can only read data
- Allows: SELECT on all tables
- Prevents: INSERT, UPDATE, DELETE operations

This ensures:
- ✅ Frontend cannot modify data directly
- ✅ All write operations go through validated backend API
- ✅ Users can view distributions and logs
- ✅ Malicious actors cannot corrupt the database

---

## 🔧 Database Functions

### 1. `update_updated_at_column()`
- **Purpose**: Automatically updates `updated_at` timestamp on record modification
- **Trigger**: Runs before UPDATE on `distributions` table
- **Usage**: Automatic - no manual invocation needed

### 2. `get_distribution_stats()`
- **Purpose**: Returns aggregate statistics for all distributions
- **Returns**:
  ```sql
  total_distributions BIGINT
  pending_approval BIGINT
  approved BIGINT
  executed BIGINT
  failed BIGINT
  ```
- **Usage**: `SELECT * FROM get_distribution_stats();`
- **Access**: Available to anon role

### 3. `get_ready_distributions()`
- **Purpose**: Finds distributions ready for execution
- **Logic**: 
  - Status is 'approved' or 'scheduled'
  - Schedule time has passed (or no schedule)
  - Has enough approvals (>= threshold)
- **Returns**: id, type, token, total_amount, schedule, approved_count, threshold
- **Usage**: `SELECT * FROM get_ready_distributions();`
- **Access**: Available to anon role

---

## 📊 Database Views

### 1. `distribution_overview`
Comprehensive view combining distribution, proposal, and approval data:
```sql
SELECT * FROM distribution_overview;
```

**Includes**:
- All distribution fields
- Proposal details (threshold, tx_id, tx_hash)
- Approval counts (total, approved, rejected)
- Recipient count
- `has_quorum` boolean (true if enough approvals)

### 2. `pending_approvals_by_approver`
Lists pending approvals grouped by approver address:
```sql
SELECT * FROM pending_approvals_by_approver 
WHERE approver = '0xYourAddress';
```

**Useful for**:
- Approver dashboard
- Finding what needs your signature
- Tracking approval history

### 3. `execution_history`
Shows completed distributions with execution details:
```sql
SELECT * FROM execution_history;
```

**Includes**:
- Distribution details
- Execution timestamp
- Transaction hash
- Recipient success/failure counts

---

## API Keys

### Anon Key (Public - Safe for Frontend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dXF3aWd5aHV6dWlhYnB3ZGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTY2NjUsImV4cCI6MjA3ODg3MjY2NX0.JA9-FDB02saOw3wwqXo4llMXJOX0A-ik_nmFQzlmweU
```

**Permissions**: Read-only access to all tables and views

### Service Key (Secret - Backend Only)
 Get this from your Supabase Dashboard → Project Settings → API → service_role key

**Permissions**: Full database access

---

## Indexes Created

Performance optimizations via indexes:

**distributions**:
- `idx_distributions_status` on `status`
- `idx_distributions_type` on `type`
- `idx_distributions_schedule` on `schedule`

**proposals**:
- `idx_proposals_distribution` on `distribution_id`
- `idx_proposals_multisig_tx` on `multisig_tx_id`

**approvals**:
- `idx_approvals_distribution` on `distribution_id`
- `idx_approvals_approver` on `approver`

**recipients**:
- `idx_recipients_distribution` on `distribution_id`
- `idx_recipients_address` on `address`

**logs**:
- `idx_logs_timestamp` on `timestamp`
- `idx_logs_distribution` on `distribution_id`
- `idx_logs_level` on `level`

---

## Testing the Setup

### 1. Verify Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('distributions', 'proposals', 'approvals', 'recipients', 'logs');
```

### 2. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('distributions', 'proposals', 'approvals', 'recipients', 'logs');
```

Expected: All should have `rowsecurity = true`

### 3. Test Functions
```sql
-- Should return zeros (no data yet)
SELECT * FROM get_distribution_stats();

-- Should return empty (no ready distributions)
SELECT * FROM get_ready_distributions();
```

### 4. Test Views
```sql
-- Should return empty (no data yet)
SELECT * FROM distribution_overview;
SELECT * FROM pending_approvals_by_approver;
SELECT * FROM execution_history;
```

---

## Backend Integration

Your backend is already configured to use Supabase via the config file:

```javascript
// backend/src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Required Environment Variables** (in `backend/.env`):
```env
SUPABASE_URL=https://wtuqwigyhuzuiabpwdep.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dXF3aWd5aHV6dWlhYnB3ZGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTY2NjUsImV4cCI6MjA3ODg3MjY2NX0.JA9-FDB02saOw3wwqXo4llMXJOX0A-ik_nmFQzlmweU
SUPABASE_SERVICE_KEY=your_service_key_from_dashboard
```

---

## Database Migrations Applied

All migrations have been successfully applied via Supabase MCP:

1. `create_distributions_table` - Core distributions table with constraints
2. `create_proposals_table` - Multisig proposal metadata
3. `create_approvals_table` - Approver tracking with unique constraint
4. `create_recipients_table` - Individual recipient records
5. `create_logs_table` - Audit trail system
6. `enable_rls_policies` - Security policies for all tables
7. `create_utility_functions` - Helper functions and triggers
8. `create_helpful_views` - Query optimization views

---

## What This Means

Your Supabase database is now **production-ready** with:

 **Complete Schema** - All tables, relationships, and constraints  
 **Security** - RLS enabled with proper policies  
 **Performance** - Indexes on frequently queried columns  
 **Automation** - Triggers for timestamp updates  
 **Utilities** - Helper functions and views  
 **Audit Trail** - Complete logging system  
 **Access Control** - Separate permissions for frontend/backend  

---

## Next Steps

1. **Get Service Key**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/wtuqwigyhuzuiabpwdep/settings/api)
   - Copy the `service_role` key
   - Add to `backend/.env` as `SUPABASE_SERVICE_KEY`

2. **Start Backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with service key
   pnpm install
   pnpm run dev
   ```

3. **Test Connection**:
   ```bash
   curl http://localhost:3001/api/health
   ```

4. **Upload Test Data**:
   - Use the Upload UI to test with `sample-distributions.json`
   - Verify data appears in Supabase dashboard

---

## Troubleshooting

### "relation does not exist"
- Tables are in the `public` schema
- Check migrations applied successfully
- Verify connection string

### "permission denied"
- Check you're using SERVICE_KEY for backend operations
- Verify RLS policies are correctly set
- Ensure role has proper grants

### "could not connect to server"
- Verify SUPABASE_URL is correct
- Check network connectivity
- Ensure project is active (not paused)

---

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/wtuqwigyhuzuiabpwdep)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/iyvqxmnmcmolqtpmxxeo/editor)
- [API Documentation](https://supabase.com/dashboard/project/iyvqxmnmcmolqtpmxxeo/api)
- [Table Editor](https://supabase.com/dashboard/project/iyvqxmnmcmolqtpmxxeo/editor)

---

**Setup completed using Supabase MCP tools**  
**Setup completed using Supabase MCP tools** ✅  
**Database Status**: Healthy and ready for LoopOps  
**Last Updated**: November 16, 2025
