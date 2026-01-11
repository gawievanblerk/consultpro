/**
 * Dashboard Routes - Executive Dashboard Metrics
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// Helper function to get dashboard data
async function getDashboardData(tenantId) {
  const [
    clientsResult,
    activeClientsResult,
    leadsResult,
    invoicesResult,
    pendingInvoicesResult,
    tasksResult,
    deploymentsResult,
    revenueResult
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]),
    pool.query("SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND client_type = 'active' AND deleted_at IS NULL", [tenantId]),
    pool.query("SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND status NOT IN ('won', 'lost') AND deleted_at IS NULL", [tenantId]),
    pool.query('SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1 AND deleted_at IS NULL', [tenantId]),
    pool.query("SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as amount FROM invoices WHERE tenant_id = $1 AND status IN ('sent', 'overdue') AND deleted_at IS NULL", [tenantId]),
    pool.query("SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND status != 'completed' AND deleted_at IS NULL", [tenantId]),
    pool.query("SELECT COUNT(*) as count FROM deployments WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL", [tenantId]),
    pool.query(`SELECT COALESCE(SUM(paid_amount), 0) as amount FROM invoices WHERE tenant_id = $1 AND date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE) AND deleted_at IS NULL`, [tenantId])
  ]);

  return {
    clients: {
      total: parseInt(clientsResult.rows[0].count),
      active: parseInt(activeClientsResult.rows[0].count)
    },
    leads: {
      open: parseInt(leadsResult.rows[0].count)
    },
    invoices: {
      total: parseInt(invoicesResult.rows[0].count),
      pendingAmount: parseFloat(pendingInvoicesResult.rows[0].amount)
    },
    tasks: {
      pending: parseInt(tasksResult.rows[0].count)
    },
    deployments: {
      active: parseInt(deploymentsResult.rows[0].count)
    },
    revenue: {
      thisMonth: parseFloat(revenueResult.rows[0].amount)
    }
  };
}

// GET /api/dashboard - Get dashboard summary (root route)
router.get('/', async (req, res) => {
  try {
    const data = await getDashboardData(req.tenant_id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    // Run all queries in parallel for performance
    const [
      clientsResult,
      activeClientsResult,
      leadsResult,
      invoicesResult,
      pendingInvoicesResult,
      tasksResult,
      deploymentsResult,
      revenueResult
    ] = await Promise.all([
      // Total clients
      pool.query(
        'SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND deleted_at IS NULL',
        [tenantId]
      ),
      // Active clients
      pool.query(
        "SELECT COUNT(*) as count FROM clients WHERE tenant_id = $1 AND client_type = 'active' AND deleted_at IS NULL",
        [tenantId]
      ),
      // Open leads
      pool.query(
        "SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1 AND status NOT IN ('won', 'lost') AND deleted_at IS NULL",
        [tenantId]
      ),
      // Total invoices
      pool.query(
        'SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1 AND deleted_at IS NULL',
        [tenantId]
      ),
      // Pending invoices amount
      pool.query(
        "SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as amount FROM invoices WHERE tenant_id = $1 AND status IN ('sent', 'overdue') AND deleted_at IS NULL",
        [tenantId]
      ),
      // Pending tasks
      pool.query(
        "SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND status != 'completed' AND deleted_at IS NULL",
        [tenantId]
      ),
      // Active deployments
      pool.query(
        "SELECT COUNT(*) as count FROM deployments WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL",
        [tenantId]
      ),
      // Monthly revenue (current month)
      pool.query(
        `SELECT COALESCE(SUM(paid_amount), 0) as amount
         FROM invoices
         WHERE tenant_id = $1
         AND date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE)
         AND deleted_at IS NULL`,
        [tenantId]
      )
    ]);

    res.json({
      success: true,
      data: {
        clients: {
          total: parseInt(clientsResult.rows[0].count),
          active: parseInt(activeClientsResult.rows[0].count)
        },
        leads: {
          open: parseInt(leadsResult.rows[0].count)
        },
        invoices: {
          total: parseInt(invoicesResult.rows[0].count),
          pendingAmount: parseFloat(pendingInvoicesResult.rows[0].amount)
        },
        tasks: {
          pending: parseInt(tasksResult.rows[0].count)
        },
        deployments: {
          active: parseInt(deploymentsResult.rows[0].count)
        },
        revenue: {
          thisMonth: parseFloat(revenueResult.rows[0].amount)
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// GET /api/dashboard/recent-activities - Get recent activities
router.get('/recent-activities', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              c.company_name as client_name
       FROM activity_logs a
       LEFT JOIN clients c ON a.entity_type = 'client' AND a.entity_id = c.id
       WHERE a.tenant_id = $1
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities'
    });
  }
});

// GET /api/dashboard/pipeline-summary - Get sales pipeline summary
router.get('/pipeline-summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        ps.name as stage,
        ps.position,
        COUNT(l.id) as count,
        COALESCE(SUM(l.estimated_value), 0) as value
       FROM pipeline_stages ps
       LEFT JOIN leads l ON l.pipeline_stage_id = ps.id AND l.tenant_id = $1 AND l.deleted_at IS NULL
       WHERE ps.tenant_id = $1 AND ps.is_active = true
       GROUP BY ps.id, ps.name, ps.position
       ORDER BY ps.position`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Pipeline summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline summary'
    });
  }
});

// GET /api/dashboard/upcoming-tasks - Get upcoming tasks
router.get('/upcoming-tasks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.company_name as client_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.tenant_id = $1
       AND t.status != 'completed'
       AND t.due_date >= CURRENT_DATE
       AND t.deleted_at IS NULL
       ORDER BY t.due_date ASC
       LIMIT 10`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Upcoming tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming tasks'
    });
  }
});

// GET /api/dashboard/revenue-trend - Get monthly revenue for last 6 months
router.get('/revenue-trend', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        TO_CHAR(date_trunc('month', payment_date), 'Mon') as month,
        TO_CHAR(date_trunc('month', payment_date), 'YYYY-MM') as month_key,
        COALESCE(SUM(paid_amount), 0) as revenue
       FROM invoices
       WHERE tenant_id = $1
       AND payment_date >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
       AND deleted_at IS NULL
       GROUP BY date_trunc('month', payment_date)
       ORDER BY date_trunc('month', payment_date)`,
      [req.tenant_id]
    );

    // Fill in missing months with zero revenue
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const found = result.rows.find(r => r.month_key === monthKey);
      months.push({
        month: monthName,
        revenue: found ? parseFloat(found.revenue) : 0
      });
    }

    res.json({ success: true, data: months });

  } catch (error) {
    console.error('Revenue trend error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue trend' });
  }
});

// GET /api/dashboard/client-breakdown - Get clients by tier
router.get('/client-breakdown', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(client_tier, 'unclassified') as tier,
        COUNT(*) as count
       FROM clients
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY client_tier
       ORDER BY count DESC`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        tier: r.tier || 'unclassified',
        count: parseInt(r.count)
      }))
    });

  } catch (error) {
    console.error('Client breakdown error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client breakdown' });
  }
});

// GET /api/dashboard/staff-utilization - Get staff deployment status
router.get('/staff-utilization', async (req, res) => {
  try {
    const [totalResult, deployedResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM staff
         WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL`,
        [req.tenant_id]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT staff_id) as count FROM deployments
         WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL`,
        [req.tenant_id]
      )
    ]);

    const total = parseInt(totalResult.rows[0].count);
    const deployed = parseInt(deployedResult.rows[0].count);
    const available = total - deployed;
    const utilizationRate = total > 0 ? Math.round((deployed / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        total,
        deployed,
        available,
        utilizationRate
      }
    });

  } catch (error) {
    console.error('Staff utilization error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff utilization' });
  }
});

// GET /api/dashboard/invoice-aging - Get invoice aging breakdown
router.get('/invoice-aging', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        CASE
          WHEN due_date >= CURRENT_DATE THEN 'current'
          WHEN CURRENT_DATE - due_date <= 30 THEN '1-30'
          WHEN CURRENT_DATE - due_date <= 60 THEN '31-60'
          ELSE '60+'
        END as aging_bucket,
        COUNT(*) as count,
        COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as amount
       FROM invoices
       WHERE tenant_id = $1
       AND status IN ('sent', 'overdue', 'partial')
       AND deleted_at IS NULL
       GROUP BY aging_bucket`,
      [req.tenant_id]
    );

    // Initialize all buckets with zero
    const aging = {
      current: { count: 0, amount: 0 },
      '1-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '60+': { count: 0, amount: 0 }
    };

    result.rows.forEach(r => {
      aging[r.aging_bucket] = {
        count: parseInt(r.count),
        amount: parseFloat(r.amount)
      };
    });

    res.json({ success: true, data: aging });

  } catch (error) {
    console.error('Invoice aging error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice aging' });
  }
});

// GET /api/dashboard/task-status - Get task status distribution
router.get('/task-status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        status,
        COUNT(*) as count
       FROM tasks
       WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY status`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        status: r.status,
        count: parseInt(r.count)
      }))
    });

  } catch (error) {
    console.error('Task status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task status' });
  }
});

// GET /api/dashboard/consultant-overview - Get consultant's companies and employees overview
// This endpoint uses consultant_id (which equals tenant_id in the JWT) to aggregate data
router.get('/consultant-overview', async (req, res) => {
  try {
    const consultantId = req.tenant_id;

    // Run all queries in parallel for performance
    const [
      companiesResult,
      employeesResult,
      employeesByStatusResult,
      companiesByIndustryResult,
      recentActivityResult
    ] = await Promise.all([
      // Company counts by status
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'onboarding') as onboarding,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended
         FROM companies
         WHERE consultant_id = $1 AND deleted_at IS NULL`,
        [consultantId]
      ),
      // Employee counts
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE e.ess_enabled = true) as ess_enabled,
          COUNT(*) FILTER (WHERE e.ess_activated_at IS NOT NULL) as ess_activated
         FROM employees e
         JOIN companies c ON e.company_id = c.id
         WHERE c.consultant_id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
        [consultantId]
      ),
      // Employees by status
      pool.query(
        `SELECT
          COALESCE(e.employment_status, 'active') as status,
          COUNT(*) as count
         FROM employees e
         JOIN companies c ON e.company_id = c.id
         WHERE c.consultant_id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL
         GROUP BY e.employment_status
         ORDER BY count DESC`,
        [consultantId]
      ),
      // Companies by industry
      pool.query(
        `SELECT
          COALESCE(industry, 'Other') as industry,
          COUNT(*) as count
         FROM companies
         WHERE consultant_id = $1 AND deleted_at IS NULL
         GROUP BY industry
         ORDER BY count DESC
         LIMIT 6`,
        [consultantId]
      ),
      // Recent activity
      pool.query(
        `SELECT
          af.id,
          af.activity_type,
          af.title,
          af.description,
          af.created_at,
          c.legal_name as company_name,
          c.trading_name
         FROM activity_feed af
         LEFT JOIN companies c ON af.company_id = c.id
         WHERE af.consultant_id = $1
         ORDER BY af.created_at DESC
         LIMIT 10`,
        [consultantId]
      )
    ]);

    const companiesData = companiesResult.rows[0];
    const employeesData = employeesResult.rows[0];

    res.json({
      success: true,
      data: {
        companies: {
          total: parseInt(companiesData.total) || 0,
          active: parseInt(companiesData.active) || 0,
          onboarding: parseInt(companiesData.onboarding) || 0,
          suspended: parseInt(companiesData.suspended) || 0
        },
        employees: {
          total: parseInt(employeesData.total) || 0,
          essEnabled: parseInt(employeesData.ess_enabled) || 0,
          essActivated: parseInt(employeesData.ess_activated) || 0
        },
        employeesByStatus: employeesByStatusResult.rows.map(r => ({
          status: r.status || 'active',
          count: parseInt(r.count)
        })),
        companiesByIndustry: companiesByIndustryResult.rows.map(r => ({
          industry: r.industry,
          count: parseInt(r.count)
        })),
        recentActivity: recentActivityResult.rows.map(r => ({
          id: r.id,
          type: r.activity_type,
          title: r.title,
          description: r.description,
          companyName: r.trading_name || r.company_name,
          createdAt: r.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Consultant overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch consultant overview' });
  }
});

module.exports = router;
