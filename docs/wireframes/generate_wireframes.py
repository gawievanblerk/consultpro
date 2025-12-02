#!/usr/bin/env python3
"""
TeamACE CRM-ERP Phase 1 Wireframe Generator
Generates professional PNG wireframe images for the SRS document.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Colors - Professional wireframe palette
COLORS = {
    'bg': '#FFFFFF',
    'bg_gray': '#F5F5F5',
    'border': '#E0E0E0',
    'border_dark': '#BDBDBD',
    'text': '#333333',
    'text_light': '#757575',
    'text_muted': '#9E9E9E',
    'primary': '#2196F3',
    'primary_light': '#BBDEFB',
    'success': '#4CAF50',
    'warning': '#FF9800',
    'danger': '#F44336',
    'sidebar': '#37474F',
    'sidebar_text': '#ECEFF1',
    'header': '#263238',
    'card_bg': '#FAFAFA',
}

# Try to load a decent font, fallback to default
def get_font(size, bold=False):
    font_paths = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNSText.ttf',
        '/Library/Fonts/Arial.ttf',
    ]
    for path in font_paths:
        try:
            return ImageFont.truetype(path, size)
        except:
            continue
    return ImageFont.load_default()

# Font instances
FONT_TITLE = get_font(24, bold=True)
FONT_HEADING = get_font(18, bold=True)
FONT_BODY = get_font(14)
FONT_SMALL = get_font(12)
FONT_TINY = get_font(10)


def draw_rounded_rect(draw, coords, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.pieslice([x1, y1, x1 + 2*radius, y1 + 2*radius], 180, 270, fill=fill)
    draw.pieslice([x2 - 2*radius, y1, x2, y1 + 2*radius], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - 2*radius, x1 + 2*radius, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - 2*radius, y2 - 2*radius, x2, y2], 0, 90, fill=fill)
    if outline:
        draw.arc([x1, y1, x1 + 2*radius, y1 + 2*radius], 180, 270, fill=outline, width=width)
        draw.arc([x2 - 2*radius, y1, x2, y1 + 2*radius], 270, 360, fill=outline, width=width)
        draw.arc([x1, y2 - 2*radius, x1 + 2*radius, y2], 90, 180, fill=outline, width=width)
        draw.arc([x2 - 2*radius, y2 - 2*radius, x2, y2], 0, 90, fill=outline, width=width)
        draw.line([x1 + radius, y1, x2 - radius, y1], fill=outline, width=width)
        draw.line([x1 + radius, y2, x2 - radius, y2], fill=outline, width=width)
        draw.line([x1, y1 + radius, x1, y2 - radius], fill=outline, width=width)
        draw.line([x2, y1 + radius, x2, y2 - radius], fill=outline, width=width)


def draw_button(draw, x, y, text, width=100, height=32, primary=False):
    """Draw a button"""
    fill = COLORS['primary'] if primary else COLORS['bg']
    text_color = COLORS['bg'] if primary else COLORS['text']
    outline = COLORS['primary'] if primary else COLORS['border_dark']
    draw_rounded_rect(draw, [x, y, x + width, y + height], 4, fill=fill, outline=outline)
    tw = draw.textlength(text, font=FONT_SMALL)
    draw.text((x + (width - tw) / 2, y + 8), text, fill=text_color, font=FONT_SMALL)


def draw_input(draw, x, y, placeholder="", width=200, height=32):
    """Draw an input field"""
    draw.rectangle([x, y, x + width, y + height], fill=COLORS['bg'], outline=COLORS['border_dark'])
    draw.text((x + 8, y + 8), placeholder, fill=COLORS['text_muted'], font=FONT_SMALL)


def draw_dropdown(draw, x, y, text="Select", width=150, height=32):
    """Draw a dropdown"""
    draw.rectangle([x, y, x + width, y + height], fill=COLORS['bg'], outline=COLORS['border_dark'])
    draw.text((x + 8, y + 8), text, fill=COLORS['text'], font=FONT_SMALL)
    # Draw chevron
    draw.polygon([(x + width - 20, y + 12), (x + width - 10, y + 12), (x + width - 15, y + 20)], fill=COLORS['text_light'])


def draw_table_header(draw, x, y, columns, col_widths, height=36):
    """Draw table header"""
    draw.rectangle([x, y, x + sum(col_widths), y + height], fill=COLORS['bg_gray'], outline=COLORS['border'])
    current_x = x
    for i, col in enumerate(columns):
        draw.text((current_x + 10, y + 10), col, fill=COLORS['text'], font=FONT_SMALL)
        current_x += col_widths[i]
        if i < len(columns) - 1:
            draw.line([current_x, y, current_x, y + height], fill=COLORS['border'])


def draw_table_row(draw, x, y, values, col_widths, height=40):
    """Draw table row"""
    draw.rectangle([x, y, x + sum(col_widths), y + height], fill=COLORS['bg'], outline=COLORS['border'])
    current_x = x
    for i, val in enumerate(values):
        draw.text((current_x + 10, y + 12), str(val), fill=COLORS['text'], font=FONT_SMALL)
        current_x += col_widths[i]
        if i < len(values) - 1:
            draw.line([current_x, y, current_x, y + height], fill=COLORS['border'])


def draw_card(draw, x, y, width, height, title=None):
    """Draw a card container"""
    draw.rectangle([x, y, x + width, y + height], fill=COLORS['card_bg'], outline=COLORS['border'])
    if title:
        draw.rectangle([x, y, x + width, y + 30], fill=COLORS['bg_gray'], outline=COLORS['border'])
        draw.text((x + 10, y + 7), title, fill=COLORS['text'], font=FONT_SMALL)


def draw_sidebar(draw, width, height, active_item=0):
    """Draw sidebar navigation"""
    sidebar_width = 200
    draw.rectangle([0, 0, sidebar_width, height], fill=COLORS['sidebar'])

    # Logo area
    draw.rectangle([0, 0, sidebar_width, 60], fill=COLORS['header'])
    draw.text((15, 20), "TeamACE CRM-ERP", fill=COLORS['sidebar_text'], font=FONT_BODY)

    # Menu items
    menu_items = [
        "Dashboard", "Clients", "BD/Sales", "  Leads", "  Pipeline",
        "  Proposals", "Engagements", "HR Outsourcing", "  Assignments",
        "Finance", "  Invoices", "  Payments", "Tasks", "Reports"
    ]

    y = 80
    for i, item in enumerate(menu_items):
        if i == active_item:
            draw.rectangle([0, y, sidebar_width, y + 36], fill=COLORS['primary'])
        indent = 30 if item.startswith("  ") else 15
        draw.text((indent, y + 10), item.strip(), fill=COLORS['sidebar_text'], font=FONT_SMALL)
        y += 36

    return sidebar_width


def draw_header(draw, x, y, width, title, subtitle=None, buttons=None):
    """Draw page header"""
    draw.rectangle([x, y, x + width, y + 70], fill=COLORS['bg'], outline=COLORS['border'])
    draw.text((x + 20, y + 15), title, fill=COLORS['text'], font=FONT_HEADING)
    if subtitle:
        draw.text((x + 20, y + 42), subtitle, fill=COLORS['text_light'], font=FONT_SMALL)
    if buttons:
        btn_x = x + width - 20
        for btn_text, is_primary in reversed(buttons):
            btn_width = len(btn_text) * 8 + 24
            btn_x -= btn_width + 10
            draw_button(draw, btn_x, y + 20, btn_text, btn_width, 30, primary=is_primary)


def draw_status_badge(draw, x, y, text, color='success'):
    """Draw a status badge"""
    colors_map = {
        'success': COLORS['success'],
        'warning': COLORS['warning'],
        'danger': COLORS['danger'],
        'primary': COLORS['primary'],
    }
    badge_color = colors_map.get(color, COLORS['text_light'])
    width = len(text) * 7 + 16
    draw_rounded_rect(draw, [x, y, x + width, y + 22], 11, fill=badge_color)
    draw.text((x + 8, y + 4), text, fill=COLORS['bg'], font=FONT_TINY)


# =============================================================================
# WIREFRAME GENERATORS
# =============================================================================

def create_layout_wireframe():
    """D.1 Global Navigation & Layout"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Sidebar
    sidebar_w = draw_sidebar(draw, width, height, active_item=1)

    # Top header bar
    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])
    draw.text((sidebar_w + 20, 15), "Search...", fill=COLORS['text_muted'], font=FONT_SMALL)
    draw.rectangle([sidebar_w + 10, 12, sidebar_w + 250, 38], fill=COLORS['bg'], outline=COLORS['border'])
    draw.text((sidebar_w + 20, 17), "Search...", fill=COLORS['text_muted'], font=FONT_SMALL)

    # Notification bell and user
    draw.ellipse([width - 100, 12, width - 75, 37], outline=COLORS['sidebar_text'])
    draw.text((width - 93, 17), "3", fill=COLORS['danger'], font=FONT_TINY)
    draw.text((width - 70, 15), "John Doe", fill=COLORS['sidebar_text'], font=FONT_SMALL)

    # Main content area label
    content_x = sidebar_w + 30
    content_y = 80
    draw.rectangle([sidebar_w, 50, width, height], fill=COLORS['bg_gray'])

    # Breadcrumb
    draw.text((content_x, content_y), "Dashboard > Clients > Acme Corporation", fill=COLORS['text_light'], font=FONT_SMALL)

    # Page header
    draw.text((content_x, content_y + 30), "Page Title", fill=COLORS['text'], font=FONT_TITLE)
    draw_button(draw, width - 150, content_y + 25, "+ Add New", 120, 35, primary=True)

    # Content card placeholder
    draw_card(draw, content_x, content_y + 90, width - sidebar_w - 60, height - content_y - 150, "Content Area")
    draw.text((content_x + 20, content_y + 150), "Main page content goes here", fill=COLORS['text_muted'], font=FONT_BODY)

    # Footer
    draw.rectangle([sidebar_w, height - 40, width, height], fill=COLORS['bg'], outline=COLORS['border'])
    draw.text((content_x, height - 28), "© 2025 TeamACE | Help | v1.0", fill=COLORS['text_muted'], font=FONT_TINY)

    return img


def create_client_list_wireframe():
    """D.2.1 Client List Screen"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=1)

    # Header
    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])
    content_x = sidebar_w + 30

    # Page header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "Clients",
                buttons=[("+ New Client", True), ("Export", False)])

    # Filters row
    filter_y = 130
    draw.rectangle([sidebar_w, 120, width, 170], fill=COLORS['bg_gray'])
    draw_input(draw, content_x, filter_y, "Search clients...", 250)
    draw_dropdown(draw, content_x + 270, filter_y, "Type: All", 120)
    draw_dropdown(draw, content_x + 400, filter_y, "Tier: All", 120)
    draw_dropdown(draw, content_x + 530, filter_y, "Status: Active", 130)

    # Table
    table_y = 190
    columns = ["Company Name", "Industry", "Type", "Tier", "Account Manager", "Actions"]
    col_widths = [250, 150, 100, 120, 150, 80]
    draw_table_header(draw, content_x, table_y, columns, col_widths)

    # Table rows
    data = [
        ["Acme Corporation", "Technology", "Active", "Premium", "John Doe", "..."],
        ["Beta Industries", "Manufacturing", "Active", "Standard", "Jane Smith", "..."],
        ["Gamma Holdings", "Finance", "Prospect", "-", "John Doe", "..."],
        ["Delta Services", "Consulting", "Active", "Enterprise", "Mike Brown", "..."],
        ["Echo Limited", "Healthcare", "Inactive", "Standard", "Jane Smith", "..."],
    ]

    for i, row in enumerate(data):
        draw_table_row(draw, content_x, table_y + 36 + (i * 40), row, col_widths)

    # Pagination
    pag_y = table_y + 36 + len(data) * 40 + 20
    draw.text((content_x, pag_y), "Showing 1-20 of 156 clients", fill=COLORS['text_light'], font=FONT_SMALL)
    draw_button(draw, width - 250, pag_y - 5, "< Prev", 70)
    draw.text((width - 170, pag_y), "1  2  3  ...  8", fill=COLORS['text'], font=FONT_SMALL)
    draw_button(draw, width - 100, pag_y - 5, "Next >", 70)

    return img


def create_client_detail_wireframe():
    """D.2.2 Client Detail Screen"""
    width, height = 1200, 850
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=1)
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Back button
    draw.text((content_x, 65), "< Back to Clients", fill=COLORS['primary'], font=FONT_SMALL)

    # Client header card
    header_y = 90
    draw.rectangle([content_x, header_y, width - 30, header_y + 100], fill=COLORS['card_bg'], outline=COLORS['border'])

    # Logo placeholder
    draw.rectangle([content_x + 20, header_y + 20, content_x + 80, header_y + 80], fill=COLORS['bg_gray'], outline=COLORS['border'])
    draw.text((content_x + 35, header_y + 45), "Logo", fill=COLORS['text_muted'], font=FONT_TINY)

    # Client name and info
    draw.text((content_x + 100, header_y + 20), "Acme Corporation", fill=COLORS['text'], font=FONT_TITLE)
    draw_status_badge(draw, content_x + 100, header_y + 55, "Active", 'success')
    draw_status_badge(draw, content_x + 165, header_y + 55, "Premium", 'primary')
    draw.text((content_x + 250, header_y + 58), "Technology", fill=COLORS['text_light'], font=FONT_SMALL)
    draw.text((content_x + 100, header_y + 78), "Account Manager: John Doe  |  Since: Jan 2024", fill=COLORS['text_light'], font=FONT_SMALL)

    # Action buttons
    draw_button(draw, width - 180, header_y + 30, "Edit", 70)
    draw_button(draw, width - 100, header_y + 30, "Delete", 70)

    # Tabs
    tabs_y = header_y + 120
    tabs = ["Overview", "Contacts", "Engagements", "Documents", "Activities", "Invoices"]
    tab_x = content_x
    for i, tab in enumerate(tabs):
        tab_width = len(tab) * 10 + 20
        if i == 0:  # Active tab
            draw.rectangle([tab_x, tabs_y, tab_x + tab_width, tabs_y + 35], fill=COLORS['primary'])
            draw.text((tab_x + 10, tabs_y + 10), tab, fill=COLORS['bg'], font=FONT_SMALL)
        else:
            draw.rectangle([tab_x, tabs_y, tab_x + tab_width, tabs_y + 35], fill=COLORS['bg'], outline=COLORS['border'])
            draw.text((tab_x + 10, tabs_y + 10), tab, fill=COLORS['text'], font=FONT_SMALL)
        tab_x += tab_width + 5

    # Content area
    content_y = tabs_y + 50

    # Left column - Company Info
    draw_card(draw, content_x, content_y, 320, 180, "Company Information")
    info_items = [
        ("Reg Number:", "RC-123456"),
        ("TIN:", "1234567890"),
        ("VAT:", "VAT-12345"),
        ("Phone:", "+234 801 234 5678"),
        ("Email:", "info@acme.com"),
    ]
    y = content_y + 45
    for label, value in info_items:
        draw.text((content_x + 15, y), label, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((content_x + 100, y), value, fill=COLORS['text'], font=FONT_SMALL)
        y += 25

    # Middle column - Quick Stats
    stats_x = content_x + 340
    draw_card(draw, stats_x, content_y, 280, 180, "Quick Stats")
    stats = [
        ("Active Engagements:", "3"),
        ("Deployed Staff:", "12"),
        ("Outstanding:", "₦2,500,000"),
        ("Total Revenue:", "₦45,000,000"),
    ]
    y = content_y + 45
    for label, value in stats:
        draw.text((stats_x + 15, y), label, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((stats_x + 150, y), value, fill=COLORS['text'], font=FONT_SMALL)
        y += 30

    # Right column - Primary Contact
    contact_x = stats_x + 300
    draw_card(draw, contact_x, content_y, 280, 180, "Primary Contact")
    draw.text((contact_x + 15, content_y + 50), "Jane Doe", fill=COLORS['text'], font=FONT_BODY)
    draw.text((contact_x + 15, content_y + 75), "HR Director", fill=COLORS['text_light'], font=FONT_SMALL)
    draw.text((contact_x + 15, content_y + 100), "jane@acme.com", fill=COLORS['primary'], font=FONT_SMALL)
    draw.text((contact_x + 15, content_y + 125), "+234 802 345 6789", fill=COLORS['text'], font=FONT_SMALL)

    return img


def create_pipeline_kanban_wireframe():
    """D.3.1 Pipeline Kanban Board"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=4)  # Pipeline
    content_x = sidebar_w + 20

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "Sales Pipeline",
                buttons=[("+ New Opportunity", True), ("Filter", False)])

    # Summary stats
    stats_y = 130
    draw.rectangle([sidebar_w, 120, width, 160], fill=COLORS['bg_gray'])
    stats_text = "Total: ₦125.5M weighted  |  ₦250M unweighted  |  42 opportunities"
    draw.text((content_x, stats_y), stats_text, fill=COLORS['text'], font=FONT_SMALL)

    # Kanban columns
    kanban_y = 180
    col_width = 180
    columns = [
        ("Qualification", "₦15M", "#FFF3E0"),
        ("Needs Analysis", "₦32M", "#E3F2FD"),
        ("Proposal Sent", "₦45M", "#E8F5E9"),
        ("Negotiation", "₦33.5M", "#F3E5F5"),
        ("Closed Won", "₦50M", "#C8E6C9"),
    ]

    col_x = content_x
    for col_name, value, color in columns:
        # Column header
        draw.rectangle([col_x, kanban_y, col_x + col_width, kanban_y + 50], fill=color, outline=COLORS['border'])
        draw.text((col_x + 10, kanban_y + 10), col_name, fill=COLORS['text'], font=FONT_SMALL)
        draw.text((col_x + 10, kanban_y + 28), value, fill=COLORS['text_light'], font=FONT_TINY)

        # Column body
        draw.rectangle([col_x, kanban_y + 50, col_x + col_width, height - 50], fill=COLORS['bg_gray'], outline=COLORS['border'])

        # Sample cards
        card_y = kanban_y + 60
        for i in range(2 if col_x < width - 400 else 1):
            draw.rectangle([col_x + 8, card_y, col_x + col_width - 8, card_y + 80], fill=COLORS['bg'], outline=COLORS['border'])
            draw.text((col_x + 15, card_y + 10), f"Deal {i+1}", fill=COLORS['text'], font=FONT_SMALL)
            draw.text((col_x + 15, card_y + 30), "₦2M - ₦8M", fill=COLORS['success'], font=FONT_SMALL)
            draw.text((col_x + 15, card_y + 50), "John Doe", fill=COLORS['text_light'], font=FONT_TINY)
            draw.text((col_x + 15, card_y + 65), "5 days ago", fill=COLORS['text_muted'], font=FONT_TINY)
            card_y += 95

        col_x += col_width + 10

    return img


def create_invoice_list_wireframe():
    """D.5.1 Invoice List Screen"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=10)  # Invoices
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "Invoices",
                buttons=[("+ New Invoice", True), ("Export", False)])

    # Filters
    filter_y = 130
    draw.rectangle([sidebar_w, 120, width, 170], fill=COLORS['bg_gray'])
    draw_input(draw, content_x, filter_y, "Search invoices...", 200)
    draw_dropdown(draw, content_x + 220, filter_y, "Status: All", 130)
    draw_dropdown(draw, content_x + 360, filter_y, "Client: All", 150)
    draw_dropdown(draw, content_x + 520, filter_y, "This Month", 120)

    # Table
    table_y = 190
    columns = ["Invoice #", "Client", "Amount", "Status", "Due Date", "Actions"]
    col_widths = [140, 200, 150, 100, 120, 80]
    draw_table_header(draw, content_x, table_y, columns, col_widths)

    # Status colors
    status_colors = {'Paid': 'success', 'Overdue': 'danger', 'Sent': 'primary', 'Draft': 'warning', 'Partial': 'warning'}

    data = [
        ["INV-2025-0042", "Acme Corporation", "₦2,500,000", "Paid", "Nov 15"],
        ["INV-2025-0041", "Beta Industries", "₦1,800,000", "Overdue", "Nov 10"],
        ["INV-2025-0040", "Gamma Holdings", "₦3,200,000", "Sent", "Nov 30"],
        ["INV-2025-0039", "Delta Services", "₦950,000", "Draft", "-"],
        ["INV-2025-0038", "Acme Corporation", "₦2,500,000", "Partial", "Nov 20"],
    ]

    for i, row in enumerate(data):
        row_y = table_y + 36 + (i * 40)
        draw_table_row(draw, content_x, row_y, [row[0], row[1], row[2], "", row[4], "..."], col_widths)
        # Status badge
        status = row[3]
        status_x = content_x + sum(col_widths[:3]) + 10
        draw_status_badge(draw, status_x, row_y + 10, status, status_colors.get(status, 'primary'))

    # Summary bar
    summary_y = table_y + 36 + len(data) * 40 + 20
    draw.rectangle([content_x, summary_y, width - 30, summary_y + 50], fill=COLORS['bg_gray'], outline=COLORS['border'])
    draw.text((content_x + 20, summary_y + 15), "Total: ₦10,950,000  |  Paid: ₦2.5M  |  Outstanding: ₦8.45M",
              fill=COLORS['text'], font=FONT_BODY)

    return img


def create_invoice_create_wireframe():
    """D.5.2 Invoice Create/Edit Screen"""
    width, height = 1200, 900
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=10)
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "Create Invoice",
                buttons=[("Send", True), ("Save", False), ("Preview", False)])

    # Form fields row 1
    form_y = 140
    draw.text((content_x, form_y), "Client *", fill=COLORS['text'], font=FONT_SMALL)
    draw_dropdown(draw, content_x, form_y + 20, "Acme Corporation", 280)

    draw.text((content_x + 300, form_y), "Engagement", fill=COLORS['text'], font=FONT_SMALL)
    draw_dropdown(draw, content_x + 300, form_y + 20, "HR Outsourcing - 2024", 280)

    # Form fields row 2
    form_y += 75
    draw.text((content_x, form_y), "Invoice Date *", fill=COLORS['text'], font=FONT_SMALL)
    draw_input(draw, content_x, form_y + 20, "Nov 30, 2025", 180)

    draw.text((content_x + 200, form_y), "Due Date *", fill=COLORS['text'], font=FONT_SMALL)
    draw_input(draw, content_x + 200, form_y + 20, "Dec 30, 2025", 180)

    draw.text((content_x + 400, form_y), "Payment Terms", fill=COLORS['text'], font=FONT_SMALL)
    draw_dropdown(draw, content_x + 400, form_y + 20, "30 days", 150)

    # Billing period
    form_y += 75
    draw.text((content_x, form_y), "Billing Period:", fill=COLORS['text_light'], font=FONT_SMALL)
    draw_input(draw, content_x + 100, form_y - 5, "Nov 1, 2025", 130)
    draw.text((content_x + 240, form_y), "to", fill=COLORS['text_light'], font=FONT_SMALL)
    draw_input(draw, content_x + 260, form_y - 5, "Nov 30, 2025", 130)

    # Line items section
    items_y = form_y + 50
    draw.rectangle([content_x, items_y, width - 30, items_y + 40], fill=COLORS['bg_gray'], outline=COLORS['border'])
    draw.text((content_x + 15, items_y + 12), "LINE ITEMS", fill=COLORS['text'], font=FONT_BODY)
    draw_button(draw, width - 150, items_y + 5, "+ Add Line Item", 110, 28)

    # Line items table
    line_y = items_y + 50
    line_cols = ["#", "Description", "Qty", "Unit", "Rate", "Total"]
    line_widths = [40, 350, 60, 80, 120, 120]
    draw_table_header(draw, content_x, line_y, line_cols, line_widths)

    line_data = [
        ["1", "HR Outsourcing - John Smith", "1", "Month", "₦350,000", "₦350,000"],
        ["2", "HR Outsourcing - Jane Doe", "1", "Month", "₦300,000", "₦300,000"],
        ["3", "Overtime Hours - November", "24", "Hours", "₦5,000", "₦120,000"],
    ]

    for i, row in enumerate(line_data):
        draw_table_row(draw, content_x, line_y + 36 + (i * 40), row, line_widths)

    # Totals section
    totals_y = line_y + 36 + len(line_data) * 40 + 20
    totals_x = width - 280

    totals = [
        ("Subtotal:", "₦770,000.00"),
        ("VAT (7.5%):", "₦57,750.00"),
        ("WHT (5%):", "(₦38,500.00)"),
    ]

    for label, value in totals:
        draw.text((totals_x, totals_y), label, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((totals_x + 100, totals_y), value, fill=COLORS['text'], font=FONT_SMALL)
        totals_y += 25

    # Total line
    draw.line([totals_x, totals_y, totals_x + 200, totals_y], fill=COLORS['border_dark'])
    totals_y += 10
    draw.text((totals_x, totals_y), "TOTAL:", fill=COLORS['text'], font=FONT_BODY)
    draw.text((totals_x + 100, totals_y), "₦789,250.00", fill=COLORS['text'], font=FONT_BODY)

    return img


def create_dashboard_wireframe():
    """D.7 Dashboard Screen"""
    width, height = 1200, 850
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=0)  # Dashboard
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw.rectangle([sidebar_w, 50, width, 100], fill=COLORS['bg'])
    draw.text((content_x, 65), "Dashboard", fill=COLORS['text'], font=FONT_TITLE)
    draw.text((width - 200, 70), "Welcome, John Doe", fill=COLORS['text_light'], font=FONT_SMALL)

    # Stats cards row
    stats_y = 120
    stat_width = 220
    stats = [
        ("Active Clients", "42", COLORS['primary']),
        ("Open Leads", "18", COLORS['warning']),
        ("Pipeline Value", "₦125.5M", COLORS['success']),
        ("Outstanding", "₦13.15M", COLORS['danger']),
    ]

    stat_x = content_x
    for label, value, color in stats:
        draw.rectangle([stat_x, stats_y, stat_x + stat_width, stats_y + 80], fill=COLORS['card_bg'], outline=COLORS['border'])
        draw.rectangle([stat_x, stats_y, stat_x + 5, stats_y + 80], fill=color)
        draw.text((stat_x + 20, stats_y + 15), label, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((stat_x + 20, stats_y + 40), value, fill=COLORS['text'], font=FONT_HEADING)
        stat_x += stat_width + 15

    # Second row - Tasks and Activities
    row2_y = stats_y + 100

    # My Tasks card
    draw_card(draw, content_x, row2_y, 450, 220, "My Tasks (5 due today)")
    tasks = [
        ("[!] Follow up with Acme on proposal", "High"),
        ("[ ] Review service logs for November", "Medium"),
        ("[ ] Send payment reminder to Gamma", "High"),
    ]
    task_y = row2_y + 45
    for task, priority in tasks:
        color = COLORS['danger'] if priority == "High" else COLORS['warning']
        draw.rectangle([content_x + 15, task_y, content_x + 20, task_y + 15], fill=color)
        draw.text((content_x + 30, task_y), task, fill=COLORS['text'], font=FONT_SMALL)
        task_y += 35
    draw.text((content_x + 15, task_y + 10), "+ View All Tasks", fill=COLORS['primary'], font=FONT_SMALL)

    # Recent Activities card
    activities_x = content_x + 470
    draw_card(draw, activities_x, row2_y, 450, 220, "Recent Activities")
    activities = [
        "John created Invoice INV-2025-0043",
        "Jane updated Client: Acme Corp",
        "Mike logged activity on Beta Industries",
        "Sarah submitted leave request",
    ]
    act_y = row2_y + 45
    for activity in activities:
        draw.ellipse([activities_x + 15, act_y + 3, activities_x + 25, act_y + 13], fill=COLORS['primary'])
        draw.text((activities_x + 35, act_y), activity, fill=COLORS['text'], font=FONT_SMALL)
        act_y += 30
    draw.text((activities_x + 15, act_y + 15), "View All Activities", fill=COLORS['primary'], font=FONT_SMALL)

    # Third row - Pipeline Summary
    row3_y = row2_y + 240
    draw_card(draw, content_x, row3_y, 600, 180, "Pipeline Summary (This Month)")

    pipeline = [
        ("Qualification", 15, 12),
        ("Needs Analysis", 32, 26),
        ("Proposal Sent", 45, 36),
        ("Negotiation", 33.5, 27),
    ]
    bar_y = row3_y + 55
    for stage, value, percent in pipeline:
        draw.text((content_x + 20, bar_y), stage, fill=COLORS['text'], font=FONT_SMALL)
        bar_width = int(percent * 3)
        draw.rectangle([content_x + 150, bar_y, content_x + 150 + bar_width, bar_y + 18], fill=COLORS['primary'])
        draw.text((content_x + 160 + bar_width, bar_y), f"₦{value}M ({percent}%)", fill=COLORS['text_light'], font=FONT_SMALL)
        bar_y += 30

    # Receivables aging mini card
    recv_x = content_x + 620
    draw_card(draw, recv_x, row3_y, 300, 180, "Receivables Aging")
    aging = [
        ("Current:", "₦5.2M"),
        ("1-30 Days:", "₦3.8M"),
        ("31-60 Days:", "₦2.1M"),
        ("60+ Days:", "₦2.05M"),
    ]
    age_y = row3_y + 55
    for label, value in aging:
        draw.text((recv_x + 20, age_y), label, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((recv_x + 120, age_y), value, fill=COLORS['text'], font=FONT_SMALL)
        age_y += 28

    return img


def create_task_list_wireframe():
    """D.6.1 Task List Screen"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=12)  # Tasks
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "My Tasks",
                buttons=[("+ New Task", True), ("Filter", False)])

    # Tab filters
    tabs_y = 130
    tabs = [("All", False), ("Open: 8", True), ("In Progress: 3", False), ("Completed", False)]
    tab_x = content_x
    for tab_name, is_active in tabs:
        tab_width = len(tab_name) * 8 + 30
        if is_active:
            draw.rectangle([tab_x, tabs_y, tab_x + tab_width, tabs_y + 32], fill=COLORS['primary'])
            draw.text((tab_x + 15, tabs_y + 8), tab_name, fill=COLORS['bg'], font=FONT_SMALL)
        else:
            draw.rectangle([tab_x, tabs_y, tab_x + tab_width, tabs_y + 32], fill=COLORS['bg'], outline=COLORS['border'])
            draw.text((tab_x + 15, tabs_y + 8), tab_name, fill=COLORS['text'], font=FONT_SMALL)
        tab_x += tab_width + 5

    # Today section
    section_y = tabs_y + 60
    draw.text((content_x, section_y), "TODAY (3)", fill=COLORS['text'], font=FONT_BODY)

    tasks_today = [
        ("[!] Follow up with Acme on proposal response", "Due: Today", "High", "Proposal PRP-2025-0023"),
        ("[ ] Review service logs for November billing", "Due: Today", "Medium", "Client: Beta Industries"),
        ("[ ] Send payment reminder to Gamma Holdings", "Due: Today", "High", "Invoice INV-2025-0040"),
    ]

    task_y = section_y + 30
    for task, due, priority, related in tasks_today:
        # Task card
        draw.rectangle([content_x, task_y, width - 50, task_y + 60], fill=COLORS['card_bg'], outline=COLORS['border'])

        # Priority indicator
        color = COLORS['danger'] if priority == "High" else COLORS['warning']
        draw.rectangle([content_x, task_y, content_x + 4, task_y + 60], fill=color)

        draw.text((content_x + 20, task_y + 10), task, fill=COLORS['text'], font=FONT_SMALL)
        draw.text((content_x + 20, task_y + 35), f"Related: {related}", fill=COLORS['text_light'], font=FONT_TINY)
        draw.text((width - 200, task_y + 10), due, fill=COLORS['text_light'], font=FONT_SMALL)
        draw.text((width - 200, task_y + 30), f"Priority: {priority}", fill=color, font=FONT_TINY)

        task_y += 75

    # This Week section
    section_y = task_y + 20
    draw.text((content_x, section_y), "THIS WEEK (5)", fill=COLORS['text'], font=FONT_BODY)

    tasks_week = [
        ("[ ] Prepare monthly outsourcing report", "Due: Dec 3"),
        ("[ ] Schedule performance review - John Smith", "Due: Dec 4"),
        ("[ ] Update client contracts before renewal", "Due: Dec 5"),
    ]

    task_y = section_y + 30
    for task, due in tasks_week:
        draw.rectangle([content_x, task_y, width - 50, task_y + 40], fill=COLORS['card_bg'], outline=COLORS['border'])
        draw.text((content_x + 20, task_y + 12), task, fill=COLORS['text'], font=FONT_SMALL)
        draw.text((width - 150, task_y + 12), due, fill=COLORS['text_light'], font=FONT_SMALL)
        task_y += 50

    return img


def create_approval_queue_wireframe():
    """D.6.2 Approval Queue Screen"""
    width, height = 1200, 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_w = draw_sidebar(draw, width, height, active_item=0)
    content_x = sidebar_w + 30

    draw.rectangle([sidebar_w, 0, width, 50], fill=COLORS['header'])

    # Header
    draw_header(draw, sidebar_w, 50, width - sidebar_w, "Pending Approvals",
                buttons=[("Refresh", False)])

    # Summary
    draw.text((content_x, 135), "You have 5 pending approvals", fill=COLORS['text_light'], font=FONT_SMALL)

    # Approval cards
    approvals = [
        ("INVOICE APPROVAL", "Invoice INV-2025-0043 for Acme Corporation - ₦2,500,000", "John Doe", "2 hours ago"),
        ("LEAVE REQUEST", "Annual Leave: Dec 20-27, 2025 (5 working days)", "Sarah Wilson (Beta Industries)", "1 day ago"),
        ("EXPENSE CLAIM", "Travel Expenses: Client visit to Port Harcourt - ₦85,000", "Mike Brown", "2 days ago"),
    ]

    card_y = 170
    for title, description, requester, time_ago in approvals:
        # Card
        draw.rectangle([content_x, card_y, width - 50, card_y + 120], fill=COLORS['card_bg'], outline=COLORS['border'])

        # Type badge
        draw.rectangle([content_x + 15, card_y + 15, content_x + 15 + len(title) * 7 + 16, card_y + 35],
                      fill=COLORS['primary_light'])
        draw.text((content_x + 23, card_y + 18), title, fill=COLORS['primary'], font=FONT_TINY)

        # Time
        draw.text((width - 150, card_y + 18), time_ago, fill=COLORS['text_muted'], font=FONT_TINY)

        # Description
        draw.text((content_x + 20, card_y + 50), description, fill=COLORS['text'], font=FONT_SMALL)
        draw.text((content_x + 20, card_y + 75), f"Requested by: {requester}", fill=COLORS['text_light'], font=FONT_SMALL)

        # Buttons
        draw_button(draw, width - 250, card_y + 75, "View Details", 90, 28)
        draw_button(draw, width - 150, card_y + 75, "Reject", 60, 28)
        draw_button(draw, width - 80, card_y + 75, "Approve", 70, 28, primary=True)

        card_y += 140

    return img


def create_mobile_wireframe():
    """D.8 Mobile Views"""
    width, height = 375, 812  # iPhone size
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Status bar
    draw.rectangle([0, 0, width, 44], fill=COLORS['header'])
    draw.text((20, 15), "9:41", fill=COLORS['bg'], font=FONT_SMALL)

    # Header
    draw.rectangle([0, 44, width, 100], fill=COLORS['primary'])
    draw.text((20, 60), "≡", fill=COLORS['bg'], font=FONT_TITLE)
    draw.text((60, 65), "TeamACE", fill=COLORS['bg'], font=FONT_BODY)
    draw.ellipse([width - 50, 60, width - 25, 85], outline=COLORS['bg'])
    draw.text((width - 43, 67), "3", fill=COLORS['bg'], font=FONT_TINY)

    # Client card
    card_y = 120
    draw.rectangle([15, card_y, width - 15, card_y + 180], fill=COLORS['card_bg'], outline=COLORS['border'])

    draw.text((30, card_y + 20), "Acme Corporation", fill=COLORS['text'], font=FONT_BODY)
    draw_status_badge(draw, 30, card_y + 50, "Active", 'success')
    draw.text((100, card_y + 52), "Technology", fill=COLORS['text_light'], font=FONT_SMALL)

    draw.line([30, card_y + 80, width - 30, card_y + 80], fill=COLORS['border'])

    draw.text((30, card_y + 90), "Primary Contact:", fill=COLORS['text_light'], font=FONT_SMALL)
    draw.text((30, card_y + 110), "Jane Doe", fill=COLORS['text'], font=FONT_SMALL)
    draw.text((30, card_y + 130), "+234 802 345 6789", fill=COLORS['primary'], font=FONT_SMALL)

    # Action buttons
    btn_y = card_y + 155
    btn_width = (width - 60) // 3
    draw_button(draw, 20, btn_y, "Call", btn_width, 30)
    draw_button(draw, 25 + btn_width, btn_y, "Email", btn_width, 30)
    draw_button(draw, 30 + btn_width * 2, btn_y, "View", btn_width, 30, primary=True)

    # Stats section
    stats_y = card_y + 210
    draw.text((20, stats_y), "Quick Stats", fill=COLORS['text'], font=FONT_BODY)

    stats = [
        ("Engagements", "3"),
        ("Staff", "12"),
        ("Outstanding", "₦2.5M"),
    ]

    stat_x = 20
    for label, value in stats:
        stat_width = (width - 50) // 3
        draw.rectangle([stat_x, stats_y + 30, stat_x + stat_width - 10, stats_y + 90],
                      fill=COLORS['bg_gray'], outline=COLORS['border'])
        draw.text((stat_x + 10, stats_y + 40), label, fill=COLORS['text_light'], font=FONT_TINY)
        draw.text((stat_x + 10, stats_y + 60), value, fill=COLORS['text'], font=FONT_SMALL)
        stat_x += stat_width

    # Bottom navigation
    nav_y = height - 80
    draw.rectangle([0, nav_y, width, height], fill=COLORS['bg'], outline=COLORS['border'])

    nav_items = ["Home", "Clients", "Tasks", "More"]
    nav_x = 20
    nav_width = (width - 40) // 4
    for i, item in enumerate(nav_items):
        color = COLORS['primary'] if i == 1 else COLORS['text_light']
        # Icon placeholder
        draw.ellipse([nav_x + nav_width//2 - 12, nav_y + 15, nav_x + nav_width//2 + 12, nav_y + 39],
                    outline=color)
        draw.text((nav_x + nav_width//2 - len(item)*3, nav_y + 48), item, fill=color, font=FONT_TINY)
        nav_x += nav_width

    return img


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))

    wireframes = [
        ("01_global_layout.png", create_layout_wireframe),
        ("02_client_list.png", create_client_list_wireframe),
        ("03_client_detail.png", create_client_detail_wireframe),
        ("04_pipeline_kanban.png", create_pipeline_kanban_wireframe),
        ("05_invoice_list.png", create_invoice_list_wireframe),
        ("06_invoice_create.png", create_invoice_create_wireframe),
        ("07_dashboard.png", create_dashboard_wireframe),
        ("08_task_list.png", create_task_list_wireframe),
        ("09_approval_queue.png", create_approval_queue_wireframe),
        ("10_mobile_view.png", create_mobile_wireframe),
    ]

    print("Generating TeamACE CRM-ERP Phase 1 Wireframes...")
    print("=" * 50)

    for filename, generator_func in wireframes:
        filepath = os.path.join(output_dir, filename)
        img = generator_func()
        img.save(filepath, "PNG", quality=95)
        print(f"✓ Generated: {filename}")

    print("=" * 50)
    print(f"All {len(wireframes)} wireframes generated successfully!")
    print(f"Output directory: {output_dir}")


if __name__ == "__main__":
    main()
