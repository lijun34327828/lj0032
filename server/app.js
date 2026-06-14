const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { initDB, query, queryOne, run } = require('./db');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = 8722;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

function calculateFee(unitType, unitPrice, startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffHours / 24);

  if (unitType === 'day') {
    return unitPrice * diffDays;
  }
  return unitPrice * diffHours;
}

function calculateOverdueFee(rental) {
  if (rental.status !== '使用中' || !rental.end_time) return 0;
  const now = new Date();
  const endTime = new Date(rental.end_time);
  if (now <= endTime) return 0;
  const overdueMs = now - endTime;
  const overdueHours = Math.ceil(overdueMs / (1000 * 60 * 60));
  const penaltyRate = 1.5;
  return Math.round(rental.unit_price * overdueHours * penaltyRate * 100) / 100;
}

function updateActivityStatus(activityId) {
  const activity = queryOne('SELECT * FROM activities WHERE id = ?', [activityId]);
  if (!activity || activity.archived) return;

  const now = new Date();
  const gatherTime = new Date(activity.gather_time);
  const regCount = queryOne(
    "SELECT COUNT(*) as cnt FROM registrations WHERE activity_id = ? AND status = '已报名'",
    [activityId]
  ).cnt;

  let newStatus = activity.status;
  if (now >= gatherTime) {
    newStatus = '已结束';
  } else if (regCount >= activity.max_participants) {
    newStatus = '已满员';
  } else {
    newStatus = '报名中';
  }

  run(
    "UPDATE activities SET current_participants = ?, status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [regCount, newStatus, activityId]
  );
}

// ================ 会员管理 API ================

app.get('/api/members', (req, res) => {
  const { keyword, status } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];

  if (keyword) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC';

  const rows = query(sql, params);
  res.json({ success: true, data: rows });
});

app.get('/api/members/:id', (req, res) => {
  const row = queryOne('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!row) return res.json({ success: false, message: '会员不存在' });
  res.json({ success: true, data: row });
});

app.post('/api/members', (req, res) => {
  const { name, phone, gender, birth_date, join_date, level, remark } = req.body;
  if (!name || !phone) return res.json({ success: false, message: '姓名和手机号必填' });

  const exist = queryOne('SELECT id FROM members WHERE phone = ?', [phone]);
  if (exist) return res.json({ success: false, message: '该手机号已注册' });

  const info = run(
    `INSERT INTO members (name, phone, gender, birth_date, join_date, level, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, gender || '', birth_date || '', join_date || new Date().toISOString().slice(0, 10), level || '普通', remark || '']
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

app.put('/api/members/:id', (req, res) => {
  const { name, phone, gender, birth_date, level, status, remark } = req.body;
  run(
    `UPDATE members SET name=?, phone=?, gender=?, birth_date=?, level=?, status=?, remark=?,
     updated_at=datetime('now','localtime') WHERE id=?`,
    [name, phone, gender || '', birth_date || '', level || '普通', status || '正常', remark || '', req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/members/:id', (req, res) => {
  run('DELETE FROM members WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ================ 活动管理 API ================

app.get('/api/activities', (req, res) => {
  const { status, archived, keyword } = req.query;
  let sql = 'SELECT * FROM activities WHERE 1=1';
  const params = [];

  if (archived !== undefined) {
    sql += ' AND archived = ?';
    params.push(archived === '1' ? 1 : 0);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR route LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY id DESC';

  const allIds = query('SELECT id FROM activities');
  allIds.forEach(a => updateActivityStatus(a.id));

  const rows = query(sql, params);
  res.json({ success: true, data: rows });
});

app.get('/api/activities/:id', (req, res) => {
  updateActivityStatus(req.params.id);
  const activity = queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!activity) return res.json({ success: false, message: '活动不存在' });

  const registrations = query(
    `SELECT r.*, m.name as member_name, m.phone as member_phone,
     CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as checked_in,
     c.check_in_time
     FROM registrations r
     LEFT JOIN members m ON r.member_id = m.id
     LEFT JOIN check_ins c ON c.registration_id = r.id
     WHERE r.activity_id = ?
     ORDER BY r.register_time DESC`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...activity, registrations } });
});

app.post('/api/activities', (req, res) => {
  const { title, route, distance, difficulty, max_participants,
    gather_time, gather_place, fee, description, created_by } = req.body;

  if (!title || !route || !max_participants || !gather_time || !gather_place) {
    return res.json({ success: false, message: '请填写完整信息' });
  }

  const info = run(
    `INSERT INTO activities (title, route, distance, difficulty, max_participants,
     gather_time, gather_place, fee, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, route, distance || 0, difficulty || '中等',
    max_participants, gather_time, gather_place, fee || 0, description || '', created_by || '管理员']
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

app.put('/api/activities/:id', (req, res) => {
  const { title, route, distance, difficulty, max_participants,
    gather_time, gather_place, fee, description, status } = req.body;

  run(
    `UPDATE activities SET title=?, route=?, distance=?, difficulty=?, max_participants=?,
     gather_time=?, gather_place=?, fee=?, description=?, status=?,
     updated_at=datetime('now','localtime') WHERE id=?`,
    [title, route, distance || 0, difficulty || '中等', max_participants,
    gather_time, gather_place, fee || 0, description || '', status || '报名中', req.params.id]
  );
  updateActivityStatus(req.params.id);
  res.json({ success: true });
});

app.post('/api/activities/:id/archive', (req, res) => {
  run("UPDATE activities SET archived = 1, status = ? WHERE id = ?", ['已归档', req.params.id]);
  res.json({ success: true });
});

app.delete('/api/activities/:id', (req, res) => {
  run('DELETE FROM check_ins WHERE activity_id = ?', [req.params.id]);
  run('DELETE FROM registrations WHERE activity_id = ?', [req.params.id]);
  run('DELETE FROM activities WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ================ 报名管理 API ================

app.post('/api/registrations', (req, res) => {
  const { activity_id, member_id } = req.body;
  if (!activity_id || !member_id) return res.json({ success: false, message: '参数缺失' });

  const activity = queryOne('SELECT * FROM activities WHERE id = ? AND archived = 0', [activity_id]);
  if (!activity) return res.json({ success: false, message: '活动不存在' });

  const now = new Date();
  const gatherTime = new Date(activity.gather_time);
  if (now >= gatherTime) return res.json({ success: false, message: '活动已截止报名' });

  const regCount = queryOne(
    "SELECT COUNT(*) as cnt FROM registrations WHERE activity_id = ? AND status = '已报名'",
    [activity_id]
  ).cnt;

  if (regCount >= activity.max_participants) {
    return res.json({ success: false, message: '报名人数已满' });
  }

  const exist = queryOne(
    'SELECT * FROM registrations WHERE activity_id = ? AND member_id = ?',
    [activity_id, member_id]
  );

  if (exist) {
    if (exist.status === '已取消') {
      if (regCount >= activity.max_participants) {
        return res.json({ success: false, message: '报名人数已满' });
      }
      run(
        "UPDATE registrations SET status = '已报名', cancel_time = NULL, cancel_reason = NULL, register_time = datetime('now','localtime') WHERE id = ?",
        [exist.id]
      );
      updateActivityStatus(activity_id);
      return res.json({ success: true, data: { id: exist.id } });
    }
    return res.json({ success: false, message: '您已报名该活动' });
  }

  try {
    const info = run(
      'INSERT INTO registrations (activity_id, member_id) VALUES (?, ?)',
      [activity_id, member_id]
    );
    updateActivityStatus(activity_id);
    res.json({ success: true, data: { id: info.lastInsertRowid } });
  } catch (e) {
    res.json({ success: false, message: '报名失败: ' + e.message });
  }
});

app.post('/api/registrations/:id/cancel', (req, res) => {
  const { reason } = req.body;
  const reg = queryOne('SELECT * FROM registrations WHERE id = ?', [req.params.id]);
  if (!reg) return res.json({ success: false, message: '报名记录不存在' });

  run(
    "UPDATE registrations SET status = '已取消', cancel_time = datetime('now','localtime'), cancel_reason = ? WHERE id = ?",
    [reason || '', req.params.id]
  );
  updateActivityStatus(reg.activity_id);
  res.json({ success: true });
});

app.post('/api/check-ins', (req, res) => {
  const { activity_id, member_id, location } = req.body;
  if (!activity_id || !member_id) return res.json({ success: false, message: '参数缺失' });

  const reg = queryOne(
    "SELECT * FROM registrations WHERE activity_id = ? AND member_id = ? AND status = '已报名'",
    [activity_id, member_id]
  );
  if (!reg) return res.json({ success: false, message: '未找到有效报名记录' });

  const exist = queryOne('SELECT * FROM check_ins WHERE registration_id = ?', [reg.id]);
  if (exist) return res.json({ success: false, message: '您已签到' });

  const info = run(
    'INSERT INTO check_ins (registration_id, activity_id, member_id, location) VALUES (?, ?, ?, ?)',
    [reg.id, activity_id, member_id, location || '']
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

app.get('/api/activities/:id/check-ins', (req, res) => {
  const rows = query(
    `SELECT c.*, m.name as member_name, m.phone as member_phone, r.register_time
     FROM check_ins c
     LEFT JOIN members m ON c.member_id = m.id
     LEFT JOIN registrations r ON c.registration_id = r.id
     WHERE c.activity_id = ?
     ORDER BY c.check_in_time DESC`,
    [req.params.id]
  );
  res.json({ success: true, data: rows });
});

// ================ 器材管理 API ================

function padZero(n) { return n < 10 ? '0' + n : '' + n; }
function getLocalNow() {
  const d = new Date();
  return d.getFullYear() + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate())
    + ' ' + padZero(d.getHours()) + ':' + padZero(d.getMinutes()) + ':' + padZero(d.getSeconds());
}

function calcAvailableStock(equipmentId, startTime, endTime) {
  const eq = queryOne('SELECT total_stock, status FROM equipment WHERE id = ?', [equipmentId]);
  if (!eq) return 0;
  if (eq.status !== '正常') return 0;

  let sql = `SELECT COALESCE(SUM(quantity), 0) as total FROM rentals
             WHERE equipment_id = ? AND status IN ('已预约', '使用中')`;
  const params = [equipmentId];

  if (startTime && endTime) {
    sql += ` AND start_time < ? AND end_time > ?`;
    params.push(endTime, startTime);
  } else {
    const now = getLocalNow();
    sql += ` AND start_time < ? AND end_time > ?`;
    params.push(now, now);
  }

  const occupied = queryOne(sql, params).total;
  return Math.max(0, eq.total_stock - occupied);
}

function refreshEquipmentStock(equipmentId) {
  const available = calcAvailableStock(equipmentId);
  run('UPDATE equipment SET available_stock = ? WHERE id = ?', [available, equipmentId]);
  return available;
}

app.get('/api/equipment', (req, res) => {
  const { category, keyword, status } = req.query;
  let sql = 'SELECT * FROM equipment WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR brand LIKE ? OR model LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC';

  const rows = query(sql, params);
  rows.forEach(eq => {
    eq.available_stock = calcAvailableStock(eq.id);
  });
  res.json({ success: true, data: rows });
});

app.get('/api/equipment/:id', (req, res) => {
  const row = queryOne('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
  if (!row) return res.json({ success: false, message: '器材不存在' });
  row.available_stock = calcAvailableStock(row.id);
  res.json({ success: true, data: row });
});

app.post('/api/equipment', (req, res) => {
  const { name, category, brand, model, serial_no, purchase_date, purchase_price,
    total_stock, hourly_rate, daily_rate, remark } = req.body;

  if (!name || !category) return res.json({ success: false, message: '器材名称和类别必填' });

  const stock = total_stock || 1;
  const serial = (serial_no && serial_no.trim()) ? serial_no : null;
  const info = run(
    `INSERT INTO equipment (name, category, brand, model, serial_no, purchase_date,
     purchase_price, total_stock, available_stock, hourly_rate, daily_rate, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, brand || '', model || '', serial,
    purchase_date || '', purchase_price || 0, stock, stock,
    hourly_rate || 0, daily_rate || 0, remark || '']
  );
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

app.put('/api/equipment/:id', (req, res) => {
  const { name, category, brand, model, serial_no, purchase_date, purchase_price,
    total_stock, status, hourly_rate, daily_rate, remark } = req.body;

  const serialUpd = (serial_no && serial_no.trim()) ? serial_no : null;
  const stock = total_stock || 1;
  run(
    `UPDATE equipment SET name=?, category=?, brand=?, model=?, serial_no=?, purchase_date=?,
     purchase_price=?, total_stock=?, status=?, hourly_rate=?, daily_rate=?, remark=?,
     updated_at=datetime('now','localtime') WHERE id=?`,
    [name, category, brand || '', model || '', serialUpd, purchase_date || '',
    purchase_price || 0, stock, status || '正常', hourly_rate || 0, daily_rate || 0, remark || '', req.params.id]
  );
  refreshEquipmentStock(req.params.id);
  res.json({ success: true });
});

app.delete('/api/equipment/:id', (req, res) => {
  run('DELETE FROM damage_records WHERE equipment_id = ?', [req.params.id]);
  run('DELETE FROM rentals WHERE equipment_id = ?', [req.params.id]);
  run('DELETE FROM equipment WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/equipment/check-availability', (req, res) => {
  const { equipment_id, start_time, end_time, quantity } = req.body;
  const eq = queryOne('SELECT * FROM equipment WHERE id = ?', [equipment_id]);
  if (!eq) return res.json({ success: false, message: '器材不存在' });

  const available = calcAvailableStock(equipment_id, start_time, end_time);
  const qty = quantity || 1;
  const enough = available >= qty;

  res.json({ success: true, data: { available, needed: qty, enough } });
});

// ================ 租赁管理 API ================

app.get('/api/rentals', (req, res) => {
  const { status, member_id, equipment_id } = req.query;
  let sql = `SELECT r.*, e.name as equipment_name, e.category as equipment_category,
             m.name as member_name, m.phone as member_phone
             FROM rentals r
             LEFT JOIN equipment e ON r.equipment_id = e.id
             LEFT JOIN members m ON r.member_id = m.id
             WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }
  if (member_id) {
    sql += ' AND r.member_id = ?';
    params.push(member_id);
  }
  if (equipment_id) {
    sql += ' AND r.equipment_id = ?';
    params.push(equipment_id);
  }
  sql += ' ORDER BY r.id DESC';

  const rows = query(sql, params);
  rows.forEach(r => {
    r.overdue_fee_calc = calculateOverdueFee(r);
  });
  res.json({ success: true, data: rows });
});

app.post('/api/rentals', (req, res) => {
  const { equipment_id, member_id, activity_id, start_time, end_time,
    quantity, unit_type, remark } = req.body;

  if (!equipment_id || !member_id || !start_time || !end_time) {
    return res.json({ success: false, message: '请填写完整信息' });
  }

  if (new Date(start_time) >= new Date(end_time)) {
    return res.json({ success: false, message: '归还时间必须晚于借出时间' });
  }

  const eq = queryOne('SELECT * FROM equipment WHERE id = ?', [equipment_id]);
  if (!eq) return res.json({ success: false, message: '器材不存在' });

  const qty = quantity || 1;
  const ut = unit_type || 'hour';
  const unitPrice = ut === 'day' ? eq.daily_rate : eq.hourly_rate;
  const totalFee = calculateFee(ut, unitPrice, start_time, end_time);

  const available = calcAvailableStock(equipment_id, start_time, end_time);

  if (available < qty) {
    return res.json({ success: false, message: '该时段库存不足' });
  }

  const info = run(
    `INSERT INTO rentals (equipment_id, member_id, activity_id, start_time, end_time,
     quantity, unit_type, unit_price, total_fee, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [equipment_id, member_id, activity_id || null, start_time, end_time,
    qty, ut, unitPrice, totalFee, remark || '']
  );
  refreshEquipmentStock(equipment_id);
  res.json({ success: true, data: { id: info.lastInsertRowid, total_fee: totalFee } });
});

app.post('/api/rentals/:id/pickup', (req, res) => {
  const rental = queryOne('SELECT * FROM rentals WHERE id = ?', [req.params.id]);
  if (!rental) return res.json({ success: false, message: '租赁记录不存在' });
  if (rental.status !== '已预约') return res.json({ success: false, message: '当前状态不可取件' });

  const available = calcAvailableStock(rental.equipment_id);
  if (available < rental.quantity) {
    return res.json({ success: false, message: '可用库存不足' });
  }

  run("UPDATE rentals SET status = '使用中' WHERE id = ?", [req.params.id]);
  refreshEquipmentStock(rental.equipment_id);

  res.json({ success: true });
});

app.post('/api/rentals/:id/return', (req, res) => {
  const rental = queryOne('SELECT * FROM rentals WHERE id = ?', [req.params.id]);
  if (!rental) return res.json({ success: false, message: '租赁记录不存在' });
  if (rental.status !== '使用中') return res.json({ success: false, message: '当前状态不可归还' });

  const overdueFee = calculateOverdueFee(rental);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  run(
    `UPDATE rentals SET status = '已归还', actual_return_time = ?, overdue_fee = ? WHERE id = ?`,
    [now, overdueFee, req.params.id]
  );

  refreshEquipmentStock(rental.equipment_id);

  res.json({ success: true, data: { overdue_fee: overdueFee } });
});

app.delete('/api/rentals/:id', (req, res) => {
  const rental = queryOne('SELECT * FROM rentals WHERE id = ?', [req.params.id]);
  if (!rental) return res.json({ success: false, message: '租赁记录不存在' });

  run('DELETE FROM rentals WHERE id = ?', [req.params.id]);
  refreshEquipmentStock(rental.equipment_id);
  res.json({ success: true });
});

// ================ 损耗登记 API ================

app.get('/api/damage-records', (req, res) => {
  const rows = query(
    `SELECT d.*, e.name as equipment_name, e.category as equipment_category,
     m.name as reporter_name
     FROM damage_records d
     LEFT JOIN equipment e ON d.equipment_id = e.id
     LEFT JOIN members m ON d.member_id = m.id
     ORDER BY d.id DESC`
  );
  res.json({ success: true, data: rows });
});

app.post('/api/damage-records', (req, res) => {
  const { equipment_id, rental_id, member_id, description, severity, repair_cost, handler, remark } = req.body;
  if (!equipment_id || !description) return res.json({ success: false, message: '器材和描述必填' });

  const info = run(
    `INSERT INTO damage_records (equipment_id, rental_id, member_id, description,
     severity, repair_cost, handler, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [equipment_id, rental_id || null, member_id || null, description,
    severity || '轻微', repair_cost || 0, handler || '', remark || '']
  );

  if (severity === '报废') {
    run("UPDATE equipment SET status = '报废', total_stock = MAX(0, total_stock - 1) WHERE id = ?", [equipment_id]);
  } else if (severity === '严重') {
    run("UPDATE equipment SET status = '维修中' WHERE id = ?", [equipment_id]);
  }

  refreshEquipmentStock(equipment_id);
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

app.put('/api/damage-records/:id', (req, res) => {
  const { status, handler, remark } = req.body;
  const record = queryOne('SELECT * FROM damage_records WHERE id = ?', [req.params.id]);
  if (!record) return res.json({ success: false, message: '损耗记录不存在' });

  run(
    `UPDATE damage_records SET status = ?, handler = ?, remark = ? WHERE id = ?`,
    [status || '待处理', handler || '', remark || '', req.params.id]
  );

  if (status === '已完成' && record.severity !== '报废') {
    run("UPDATE equipment SET status = '正常' WHERE id = ?", [record.equipment_id]);
    refreshEquipmentStock(record.equipment_id);
  }

  res.json({ success: true });
});

// ================ 统计数据 API ================

app.get('/api/stats', (req, res) => {
  const memberCount = queryOne('SELECT COUNT(*) as cnt FROM members').cnt;
  const activityCount = queryOne('SELECT COUNT(*) as cnt FROM activities WHERE archived = 0').cnt;
  const equipmentCount = queryOne('SELECT COUNT(*) as cnt FROM equipment').cnt;
  const rentalCount = queryOne("SELECT COUNT(*) as cnt FROM rentals WHERE status = '使用中'").cnt;

  const recentActivities = query(
    `SELECT a.*,
     (SELECT COUNT(*) FROM registrations r WHERE r.activity_id = a.id AND r.status = '已报名') as reg_count
     FROM activities a WHERE a.archived = 0 ORDER BY a.id DESC LIMIT 5`
  );

  const incomeTotal = queryOne(
    "SELECT COALESCE(SUM(total_fee + overdue_fee), 0) as total FROM rentals WHERE status = '已归还'"
  ).total;

  res.json({
    success: true,
    data: {
      member_count: memberCount,
      activity_count: activityCount,
      equipment_count: equipmentCount,
      active_rentals: rentalCount,
      income_total: incomeTotal,
      recent_activities: recentActivities
    }
  });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`骑行俱乐部后端服务已启动: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});
