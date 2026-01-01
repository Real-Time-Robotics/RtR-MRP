# ROLLBACK PLAN TEMPLATE

**Phase:** [Phase Name]
**Date:** [Date]
**Owner:** [Owner Name]

---

## 1. THAY ĐỔI TRONG PHASE NÀY

### 1.1 Database Changes
| Change | Script | Rollback Script |
|--------|--------|-----------------|
| | | |

### 1.2 Code Changes
| File/Component | Change Description | Git Commit |
|----------------|-------------------|------------|
| | | |

### 1.3 Infrastructure Changes
| Change | Configuration | Previous State |
|--------|---------------|----------------|
| | | |

---

## 2. ĐIỀU KIỆN ROLLBACK

### Tự động Rollback nếu:
- [ ] Error rate > 10% trong 5 phút
- [ ] P95 latency > 10s trong 5 phút
- [ ] Critical alert triggered
- [ ] Database connection failures > 5%

### Manual Rollback nếu:
- [ ] Stakeholder yêu cầu
- [ ] Phát hiện lỗi nghiêm trọng sau deploy
- [ ] Performance không đạt target

---

## 3. QUY TRÌNH ROLLBACK

### 3.1 Database Rollback
```bash
# Step 1: Verify current state
psql -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Step 2: Run rollback migration
npx prisma migrate resolve --rolled-back [migration_name]

# Step 3: Verify rollback
psql -c "SELECT count(*) FROM [affected_table];"
```

### 3.2 Code Rollback
```bash
# Step 1: Identify target commit
git log --oneline -10

# Step 2: Revert to previous version
git revert [commit_hash]

# OR use feature flag
# curl -X POST /api/feature-flags -d '{"flag": "new_feature", "enabled": false}'

# Step 3: Deploy
npm run deploy:rollback
```

### 3.3 Infrastructure Rollback
```bash
# Step 1: Switch traffic (if blue-green)
# kubectl set service frontend --port=80 --target-port=blue

# Step 2: Scale down new deployment
# kubectl scale deployment new-version --replicas=0

# Step 3: Verify health
# curl -f http://localhost/health
```

---

## 4. VERIFICATION CHECKLIST

### Sau khi Rollback:
- [ ] API endpoints responding normally
- [ ] Error rate < 1%
- [ ] Response time within baseline
- [ ] Database integrity verified
- [ ] No data loss confirmed
- [ ] Monitoring alerts cleared

---

## 5. COMMUNICATION PLAN

### Khi bắt đầu Rollback:
1. Notify #engineering-alerts channel
2. Update status page
3. Email stakeholders

### Sau khi Rollback hoàn tất:
1. Post-mortem scheduled
2. Root cause analysis
3. Updated timeline communicated

---

## 6. CONTACTS

| Role | Name | Contact |
|------|------|---------|
| On-call Engineer | | |
| Tech Lead | | |
| DevOps | | |
| Product Owner | | |

---

## 7. ROLLBACK HISTORY

| Date | Reason | Duration | Notes |
|------|--------|----------|-------|
| | | | |

---

**Approved by:** _______________
**Date:** _______________
