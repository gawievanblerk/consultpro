/**
 * Help Content for CoreHR
 * Organized by module and section
 */

export const helpContent = {
  // Dashboard
  dashboard: {
    title: 'Dashboard Overview',
    overview: 'Your dashboard provides a quick snapshot of key business metrics and recent activity. Use it to monitor performance and identify areas needing attention.',
    sections: {
      stats: 'These cards show your key performance indicators at a glance.',
      recentActivity: 'View the latest actions taken in the system by you and your team.',
      quickActions: 'Shortcuts to common tasks like creating clients, leads, or invoices.'
    },
    tips: [
      'Check your dashboard daily to stay on top of overdue tasks and pending invoices.',
      'Click on any stat card to navigate to the detailed view.',
      'Use the date filter to compare metrics across different periods.'
    ]
  },

  // CRM Module
  clients: {
    title: 'Clients Management',
    overview: 'Manage your client relationships, track company details, and maintain contact information. Clients are the foundation of your business relationships.',
    sections: {
      list: 'View all your clients with key information like company name, industry, and status.',
      form: 'Add or edit client details including company registration, contact information, and address.'
    },
    fields: {
      company_name: 'The official registered name of the client company.',
      rc_number: 'Company registration number (RC Number for Nigerian companies).',
      industry: 'The primary industry or sector the client operates in.',
      client_type: 'Classify as Corporate, SME, Government, or Individual.',
      email: 'Primary contact email for the company.',
      phone: 'Main phone number for business communications.',
      website: 'Company website URL.',
      address: 'Physical or registered office address.'
    },
    tips: [
      'Keep client information up to date for accurate reporting.',
      'Link contacts to clients to track your key relationships.',
      'Use the search and filter to quickly find specific clients.'
    ]
  },

  contacts: {
    title: 'Contacts Management',
    overview: 'Track individual contacts within your client organizations. Identify decision makers and maintain relationship history.',
    fields: {
      client: 'The company this contact belongs to.',
      first_name: 'Contact\'s first name.',
      last_name: 'Contact\'s last name.',
      email: 'Direct email address for this contact.',
      phone: 'Direct phone number.',
      job_title: 'Their role or position in the company.',
      department: 'Which department they work in.',
      is_decision_maker: 'Mark if this person has authority to make purchasing decisions.'
    },
    tips: [
      'Mark decision makers to prioritize your outreach.',
      'Keep notes on each contact for personalized communication.',
      'Link contacts to engagements to track who you\'re working with.'
    ]
  },

  engagements: {
    title: 'Engagements',
    overview: 'Track active projects and service engagements with your clients. Monitor progress, timelines, and deliverables.',
    fields: {
      client: 'The client this engagement is for.',
      title: 'A descriptive name for the engagement.',
      service_type: 'The type of service being provided.',
      status: 'Current state: Active, On Hold, Completed, or Cancelled.',
      start_date: 'When the engagement begins.',
      end_date: 'Expected or actual completion date.',
      value: 'The contract or estimated value.'
    },
    tips: [
      'Update engagement status regularly to reflect progress.',
      'Link tasks to engagements for detailed project tracking.',
      'Use engagements to track billable work for invoicing.'
    ]
  },

  // Business Development
  leads: {
    title: 'Lead Management',
    overview: 'Capture and nurture potential business opportunities. Track leads from initial contact through to conversion.',
    fields: {
      company_name: 'The prospect company name.',
      contact_name: 'Your primary contact at the prospect.',
      email: 'Contact email for follow-ups.',
      phone: 'Phone number for direct outreach.',
      source: 'How you acquired this lead (Referral, Website, etc.).',
      status: 'Current stage in your sales process.',
      estimated_value: 'Potential deal value if converted.',
      expected_close_date: 'When you expect to close the deal.',
      notes: 'Important context or conversation history.'
    },
    tips: [
      'Follow up on leads promptly - speed matters in sales.',
      'Move leads through stages to track your pipeline progress.',
      'Convert successful leads to clients when deals close.'
    ]
  },

  pipeline: {
    title: 'Sales Pipeline',
    overview: 'Visualize your sales pipeline with a Kanban board. Drag leads between stages to track progress.',
    sections: {
      board: 'Each column represents a stage in your sales process.',
      cards: 'Lead cards show key details. Click to view more or drag to move.'
    },
    tips: [
      'Drag and drop leads between columns to update their stage.',
      'Focus on moving leads forward - stagnant leads rarely convert.',
      'Use the pipeline to forecast expected revenue.'
    ]
  },

  // HR Module
  staff: {
    title: 'Staff Management',
    overview: 'Manage your workforce including employees and outsourced contractors. Track skills, deployments, and availability.',
    fields: {
      employee_id: 'Internal employee or contractor ID.',
      first_name: 'Staff member\'s first name.',
      last_name: 'Staff member\'s last name.',
      email: 'Work email address.',
      phone: 'Contact phone number.',
      job_title: 'Current role or position.',
      department: 'Which team or department they belong to.',
      employment_type: 'Employee, Contractor, or Outsourced.',
      skills: 'Comma-separated list of skills and competencies.'
    },
    tips: [
      'Keep skills updated to match staff with appropriate assignments.',
      'Track both internal employees and outsourced contractors.',
      'Invite staff as users to give them system access.'
    ]
  },

  deployments: {
    title: 'Staff Deployments',
    overview: 'Track where your staff are deployed to clients. Manage assignments, billing rates, and deployment periods.',
    fields: {
      staff: 'The staff member being deployed.',
      client: 'The client they are assigned to.',
      role_title: 'Their role at the client site.',
      status: 'Active, Completed, or Terminated.',
      start_date: 'When the deployment begins.',
      end_date: 'When the deployment ends (if known).',
      billing_rate: 'The rate charged to the client.',
      billing_type: 'Hourly, Daily, or Monthly billing.'
    },
    tips: [
      'Track all client deployments for accurate billing.',
      'Update end dates when deployments conclude.',
      'Use deployment data to calculate utilization rates.'
    ]
  },

  // Finance Module
  invoices: {
    title: 'Invoice Management',
    overview: 'Create and manage invoices for your clients. Track payments, apply Nigerian tax rates, and generate PDF invoices.',
    sections: {
      list: 'View all invoices with status, amounts, and actions.',
      form: 'Create or edit invoices with line items and tax calculations.'
    },
    fields: {
      client: 'The client being invoiced.',
      invoice_number: 'Unique invoice reference number.',
      invoice_date: 'Date the invoice is issued.',
      due_date: 'Payment due date.',
      status: 'Draft, Sent, Paid, Partial, or Overdue.',
      line_items: 'Individual services or products being invoiced.',
      apply_vat: 'Apply 7.5% VAT (Value Added Tax).',
      apply_wht: 'Apply Withholding Tax (5% for services, 10% for professional).'
    },
    tips: [
      'Save invoices as Draft until ready to send.',
      'Download PDF invoices to send to clients.',
      'Track partial payments for large invoices.',
      'WHT is deducted by the client and remitted to FIRS.'
    ]
  },

  payments: {
    title: 'Payment Tracking',
    overview: 'Record payments received from clients. Link payments to invoices to track outstanding balances.',
    fields: {
      invoice: 'The invoice this payment is for.',
      payment_date: 'Date the payment was received.',
      amount: 'Payment amount in Naira.',
      payment_method: 'Bank Transfer, Cash, Cheque, or Card.',
      reference_number: 'Bank reference or transaction ID.'
    },
    tips: [
      'Record payments promptly to keep records accurate.',
      'Use reference numbers to reconcile with bank statements.',
      'Partial payments automatically update invoice status.'
    ]
  },

  // Tasks
  tasks: {
    title: 'Task Management',
    overview: 'Manage your to-do list and track work across clients and projects. Set priorities and due dates to stay organized.',
    fields: {
      title: 'A clear, actionable task description.',
      description: 'Additional details or context for the task.',
      client: 'Optionally link the task to a specific client.',
      priority: 'Low, Medium, High, or Urgent.',
      status: 'Pending, In Progress, or Completed.',
      due_date: 'When the task should be completed.'
    },
    tips: [
      'Break large projects into smaller, manageable tasks.',
      'Set realistic due dates and review regularly.',
      'Use priority to focus on what matters most.',
      'Click the circle to quickly mark tasks complete.'
    ]
  },

  // Settings
  users: {
    title: 'User Management',
    overview: 'Manage system users and their access levels. Invite new users, reset passwords, and control permissions.',
    sections: {
      list: 'View all users with their roles and status.',
      invites: 'Pending invitations that haven\'t been accepted yet.'
    },
    fields: {
      email: 'User\'s login email address.',
      role: 'User (basic), Manager (extended), or Admin (full access).',
      status: 'Active users can log in, inactive users cannot.'
    },
    tips: [
      'Use the Invite feature to add new team members.',
      'Assign appropriate roles based on job responsibilities.',
      'Deactivate users instead of deleting to preserve audit history.',
      'Only admins can manage users and settings.'
    ]
  }
};

// Quick access to field-level tooltips
export const fieldTooltips = {
  // Common fields
  email: 'A valid email address for communication and notifications.',
  phone: 'Include country code for international numbers.',
  notes: 'Add any additional context or important information.',

  // Client fields
  rc_number: 'Corporate Affairs Commission registration number.',

  // Invoice fields
  vat: 'Nigerian VAT at 7.5% is added to the subtotal.',
  wht_services: 'Withholding Tax at 5% for general services.',
  wht_professional: 'Withholding Tax at 10% for professional services.',

  // Lead fields
  estimated_value: 'Your best estimate of the potential deal value.',
  probability: 'Likelihood of closing this deal (0-100%).',

  // Staff fields
  skills: 'Enter skills separated by commas (e.g., Excel, Project Management, Python).'
};

export default helpContent;
