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

module.exports = router;
