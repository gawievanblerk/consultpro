#!/usr/bin/env python3
"""
Professional Wireframe Generator for TeamACE CRM-ERP Phase 1 SRS
Creates high-quality, modern UI wireframes using Pillow
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Configuration
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
WIDTH = 1200
HEIGHT = 800
MOBILE_WIDTH = 400
MOBILE_HEIGHT = 800

# Professional Color Palette
COLORS = {
    'white': '#FFFFFF',
    'bg': '#F5F7FA',
    'card': '#FFFFFF',
    'primary': '#1976D2',
    'primary_dark': '#0D47A1',
    'primary_light': '#BBDEFB',
    'secondary': '#455A64',
    'sidebar': '#263238',
    'sidebar_active': '#37474F',
    'success': '#4CAF50',
    'success_light': '#E8F5E9',
    'warning': '#FF9800',
    'warning_light': '#FFF3E0',
    'danger': '#F44336',
    'danger_light': '#FFEBEE',
    'info': '#2196F3',
    'info_light': '#E3F2FD',
    'text': '#212121',
    'text_secondary': '#757575',
    'text_light': '#9E9E9E',
    'border': '#E0E0E0',
    'border_light': '#EEEEEE',
    'shadow': '#00000020',
    'overlay': '#00000080',
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 8:  # With alpha
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4, 6))
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_shadow(draw, coords, radius=8, blur=5, color='#00000015'):
    """Create a soft shadow effect"""
    x1, y1, x2, y2 = coords
    shadow_coords = (x1+3, y1+3, x2+3, y2+3)
    draw.rounded_rectangle(shadow_coords, radius=radius, fill=color)

def draw_card(draw, x, y, width, height, title=None, shadow=True):
    """Draw a professional card with optional shadow"""
    if shadow:
        create_shadow(draw, (x, y, x+width, y+height))
    draw.rounded_rectangle((x, y, x+width, y+height), radius=8, fill=COLORS['card'], outline=COLORS['border'])

    if title:
        # Title bar
        draw.rounded_rectangle((x, y, x+width, y+40), radius=8, fill=COLORS['card'])
        draw.rectangle((x, y+32, x+width, y+40), fill=COLORS['card'])
        draw.line((x, y+40, x+width, y+40), fill=COLORS['border'], width=1)
        draw.text((x+16, y+12), title, fill=COLORS['text'], font=get_font(14, bold=True))

def get_font(size=12, bold=False):
    """Get system font with fallback"""
    try:
        if bold:
            return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        return ImageFont.load_default()

def draw_button(draw, x, y, text, width=100, height=36, primary=False, success=False, danger=False, outline=False):
    """Draw a modern button"""
    if primary:
        bg = COLORS['primary']
        fg = COLORS['white']
    elif success:
        bg = COLORS['success']
        fg = COLORS['white']
    elif danger:
        bg = COLORS['danger']
        fg = COLORS['white']
    elif outline:
        bg = COLORS['white']
        fg = COLORS['primary']
    else:
        bg = COLORS['bg']
        fg = COLORS['text']

    draw.rounded_rectangle((x, y, x+width, y+height), radius=4, fill=bg,
                           outline=COLORS['primary'] if outline else None)

    font = get_font(12, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = x + (width - text_width) // 2
    text_y = y + (height - 14) // 2
    draw.text((text_x, text_y), text, fill=fg, font=font)

def draw_input(draw, x, y, placeholder="", width=200, height=36, value=None):
    """Draw a form input field"""
    draw.rounded_rectangle((x, y, x+width, y+height), radius=4, fill=COLORS['white'], outline=COLORS['border'])

    font = get_font(12)
    text = value if value else placeholder
    color = COLORS['text'] if value else COLORS['text_light']
    draw.text((x+12, y+10), text, fill=color, font=font)

def draw_dropdown(draw, x, y, text="Select...", width=150, height=36):
    """Draw a dropdown select field"""
    draw.rounded_rectangle((x, y, x+width, y+height), radius=4, fill=COLORS['white'], outline=COLORS['border'])

    font = get_font(12)
    draw.text((x+12, y+10), text, fill=COLORS['text'], font=font)

    # Dropdown arrow
    arrow_x = x + width - 24
    arrow_y = y + height // 2
    draw.polygon([(arrow_x, arrow_y-3), (arrow_x+8, arrow_y-3), (arrow_x+4, arrow_y+3)], fill=COLORS['text_secondary'])

def draw_badge(draw, x, y, text, color='primary', small=False):
    """Draw a status badge"""
    colors = {
        'primary': (COLORS['primary'], COLORS['white']),
        'success': (COLORS['success'], COLORS['white']),
        'warning': (COLORS['warning'], COLORS['white']),
        'danger': (COLORS['danger'], COLORS['white']),
        'info': (COLORS['info'], COLORS['white']),
        'light': (COLORS['bg'], COLORS['text']),
    }
    bg, fg = colors.get(color, colors['primary'])

    font = get_font(10 if small else 11, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]

    padding = 6 if small else 8
    height = 18 if small else 22

    draw.rounded_rectangle((x, y, x+text_width+padding*2, y+height), radius=height//2, fill=bg)
    draw.text((x+padding, y+3 if small else y+4), text, fill=fg, font=font)

    return text_width + padding * 2

def draw_icon_placeholder(draw, x, y, size=20, filled=False):
    """Draw an icon placeholder circle"""
    if filled:
        draw.ellipse((x, y, x+size, y+size), fill=COLORS['primary'], outline=None)
    else:
        draw.ellipse((x, y, x+size, y+size), fill=None, outline=COLORS['text_secondary'], width=2)

def draw_avatar(draw, x, y, size=40, initials="JD"):
    """Draw a user avatar"""
    draw.ellipse((x, y, x+size, y+size), fill=COLORS['primary'])
    font = get_font(size//3, bold=True)
    bbox = draw.textbbox((0, 0), initials, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    draw.text((x + (size-text_width)//2, y + (size-text_height)//2 - 2), initials, fill=COLORS['white'], font=font)

def draw_sidebar(draw, width, height, active_item=0):
    """Draw the application sidebar"""
    sidebar_width = 220

    # Sidebar background
    draw.rectangle((0, 0, sidebar_width, height), fill=COLORS['sidebar'])

    # Logo area
    draw.rectangle((0, 0, sidebar_width, 64), fill=COLORS['sidebar_active'])
    font_logo = get_font(20, bold=True)
    draw.text((20, 20), "TeamACE", fill=COLORS['white'], font=font_logo)

    # Navigation items
    nav_items = [
        ("Dashboard", 0),
        ("Clients", 1),
        ("BD / Sales", 2),
        ("Engagements", 3),
        ("HR Outsourcing", 4),
        ("Finance", 5),
        ("Tasks", 6),
        ("Reports", 7),
        ("Settings", 8),
    ]

    y_pos = 80
    font = get_font(13)

    for item, idx in nav_items:
        item_height = 44
        if idx == active_item:
            # Active item highlight
            draw.rectangle((0, y_pos, sidebar_width, y_pos + item_height), fill=COLORS['sidebar_active'])
            draw.rectangle((0, y_pos, 4, y_pos + item_height), fill=COLORS['primary'])

        # Icon placeholder
        draw.ellipse((20, y_pos + 12, 40, y_pos + 32), fill=None, outline=COLORS['text_light'], width=1)

        # Text
        text_color = COLORS['white'] if idx == active_item else '#B0BEC5'
        draw.text((52, y_pos + 13), item, fill=text_color, font=font)

        y_pos += item_height

    return sidebar_width

def draw_header(draw, x, y, width, height=64):
    """Draw the top header bar"""
    draw.rectangle((x, y, x+width, y+height), fill=COLORS['white'])
    draw.line((x, y+height, x+width, y+height), fill=COLORS['border'], width=1)

    # Search bar
    search_x = x + 24
    draw.rounded_rectangle((search_x, y+16, search_x+300, y+48), radius=4, fill=COLORS['bg'])
    draw.text((search_x+40, y+24), "Search...", fill=COLORS['text_light'], font=get_font(13))
    draw.ellipse((search_x+12, y+22, search_x+32, y+42), fill=None, outline=COLORS['text_light'], width=1)

    # Right side icons
    right_x = x + width - 160

    # Notification bell
    draw.ellipse((right_x, y+20, right_x+24, y+44), fill=COLORS['bg'])
    draw.ellipse((right_x+5, y+25, right_x+19, y+39), fill=None, outline=COLORS['text_secondary'], width=1)

    # User avatar
    draw_avatar(draw, right_x + 40, y + 12, 40, "GV")

    # User name
    draw.text((right_x + 90, y + 24), "Gawie V", fill=COLORS['text'], font=get_font(13))

def draw_page_header(draw, x, y, width, title, subtitle=None, buttons=None):
    """Draw a page header with title and action buttons"""
    font_title = get_font(24, bold=True)
    draw.text((x, y), title, fill=COLORS['text'], font=font_title)

    if subtitle:
        draw.text((x, y + 32), subtitle, fill=COLORS['text_secondary'], font=get_font(13))

    if buttons:
        btn_x = x + width
        for btn_text, is_primary in reversed(buttons):
            btn_width = len(btn_text) * 9 + 24
            btn_x -= btn_width + 12
            draw_button(draw, btn_x, y, btn_text, width=btn_width, height=36, primary=is_primary)

def draw_table(draw, x, y, width, headers, rows, col_widths=None):
    """Draw a professional data table"""
    row_height = 48
    header_height = 44

    if col_widths is None:
        col_widths = [width // len(headers)] * len(headers)

    # Header
    draw.rounded_rectangle((x, y, x+width, y+header_height), radius=8, fill=COLORS['bg'])
    draw.rectangle((x, y+8, x+width, y+header_height), fill=COLORS['bg'])

    col_x = x
    for i, header in enumerate(headers):
        draw.text((col_x + 16, y + 14), header, fill=COLORS['text_secondary'], font=get_font(12, bold=True))
        col_x += col_widths[i]

    # Rows
    row_y = y + header_height
    for row_idx, row in enumerate(rows):
        bg_color = COLORS['white'] if row_idx % 2 == 0 else COLORS['bg']

        if row_idx == len(rows) - 1:
            # Last row with rounded corners
            draw.rounded_rectangle((x, row_y, x+width, row_y+row_height), radius=8, fill=bg_color)
            draw.rectangle((x, row_y, x+width, row_y+8), fill=bg_color)
        else:
            draw.rectangle((x, row_y, x+width, row_y+row_height), fill=bg_color)

        col_x = x
        for i, cell in enumerate(row):
            if isinstance(cell, tuple):
                # Badge
                text, badge_color = cell
                draw_badge(draw, col_x + 16, row_y + 14, text, badge_color)
            else:
                draw.text((col_x + 16, row_y + 16), str(cell), fill=COLORS['text'], font=get_font(12))
            col_x += col_widths[i]

        row_y += row_height

    # Border
    total_height = header_height + (row_height * len(rows))
    draw.rounded_rectangle((x, y, x+width, y+total_height), radius=8, fill=None, outline=COLORS['border'])

    return total_height

def draw_stat_card(draw, x, y, width, height, label, value, trend=None, trend_up=True):
    """Draw a statistics card"""
    draw_card(draw, x, y, width, height)

    draw.text((x+20, y+16), label, fill=COLORS['text_secondary'], font=get_font(12))
    draw.text((x+20, y+36), value, fill=COLORS['text'], font=get_font(24, bold=True))

    if trend:
        trend_color = COLORS['success'] if trend_up else COLORS['danger']
        arrow = "+" if trend_up else "-"
        draw.text((x+20, y+height-28), f"{arrow}{trend}", fill=trend_color, font=get_font(12, bold=True))

def draw_kanban_column(draw, x, y, width, height, title, count, value, cards):
    """Draw a kanban column with cards"""
    # Column header
    draw.rounded_rectangle((x, y, x+width, y+50), radius=8, fill=COLORS['bg'])
    draw.rectangle((x, y+42, x+width, y+50), fill=COLORS['bg'])

    draw.text((x+12, y+8), title, fill=COLORS['text'], font=get_font(13, bold=True))
    draw.text((x+12, y+28), f"{count} deals - {value}", fill=COLORS['text_secondary'], font=get_font(11))

    # Cards
    card_y = y + 60
    for card in cards[:3]:  # Max 3 cards shown
        card_height = 80
        draw_card(draw, x+4, card_y, width-8, card_height)

        draw.text((x+16, card_y+12), card['title'], fill=COLORS['text'], font=get_font(12, bold=True))
        draw.text((x+16, card_y+32), card['value'], fill=COLORS['primary'], font=get_font(14, bold=True))
        draw.text((x+16, card_y+54), card['owner'], fill=COLORS['text_secondary'], font=get_font(11))

        card_y += card_height + 8

# ============ Wireframe Generators ============

def create_layout_wireframe():
    """D.1 Global Navigation & Layout"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Sidebar
    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=0)

    # Header
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    # Main content area
    content_x = sidebar_width + 32
    content_y = 96
    content_width = WIDTH - sidebar_width - 64

    # Breadcrumb
    draw.text((content_x, content_y), "Home  /  Dashboard", fill=COLORS['text_secondary'], font=get_font(12))

    # Page header
    draw_page_header(draw, content_x, content_y + 24, content_width, "Dashboard",
                     "Welcome back, Gawie", [("+ New", True)])

    # Content placeholder
    draw_card(draw, content_x, content_y + 100, content_width, HEIGHT - content_y - 140, "Main Content Area")

    return img

def create_client_list_wireframe():
    """D.2.1 Client List Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=1)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "Clients",
                     "Manage your client relationships", [("+ New Client", True), ("Export", False)])

    # Filters
    filter_y = content_y + 56
    draw_input(draw, content_x, filter_y, "Search clients...", width=280)
    draw_dropdown(draw, content_x + 300, filter_y, "Type: All", width=140)
    draw_dropdown(draw, content_x + 460, filter_y, "Tier: All", width=140)
    draw_dropdown(draw, content_x + 620, filter_y, "Status: Active", width=160)

    # Table
    table_y = filter_y + 56
    headers = ["Company Name", "Industry", "Type", "Tier", "Account Mgr", ""]
    col_widths = [220, 140, 100, 120, 160, 60]
    rows = [
        ["Acme Corporation", "Technology", ("Active", "success"), "Premium", "John Doe", "..."],
        ["Beta Industries", "Manufacturing", ("Active", "success"), "Standard", "Jane Smith", "..."],
        ["Gamma Holdings", "Finance", ("Prospect", "warning"), "—", "John Doe", "..."],
        ["Delta Services", "Consulting", ("Active", "success"), "Enterprise", "Mike Brown", "..."],
        ["Echo Limited", "Technology", ("Active", "success"), "Standard", "Sarah Wilson", "..."],
    ]
    draw_table(draw, content_x, table_y, content_width, headers, rows, col_widths)

    # Pagination
    draw.text((content_x, HEIGHT - 60), "Showing 1-20 of 156 clients", fill=COLORS['text_secondary'], font=get_font(12))
    draw_button(draw, content_x + content_width - 180, HEIGHT - 64, "Previous", width=80, height=32)
    draw_button(draw, content_x + content_width - 90, HEIGHT - 64, "Next", width=80, height=32, primary=True)

    return img

def create_client_detail_wireframe():
    """D.2.2 Client Detail Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=1)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Back link
    draw.text((content_x, content_y), "< Back to Clients", fill=COLORS['primary'], font=get_font(12))

    # Client header card
    header_y = content_y + 32
    draw_card(draw, content_x, header_y, content_width, 100)

    draw_avatar(draw, content_x + 20, header_y + 20, 60, "AC")
    draw.text((content_x + 100, header_y + 20), "Acme Corporation", fill=COLORS['text'], font=get_font(20, bold=True))

    badge_x = content_x + 100
    badge_x += draw_badge(draw, badge_x, header_y + 50, "Active", "success") + 8
    badge_x += draw_badge(draw, badge_x, header_y + 50, "Premium", "primary") + 8
    draw_badge(draw, badge_x, header_y + 50, "Technology", "light")

    draw_button(draw, content_x + content_width - 160, header_y + 30, "Edit", width=70, height=32)
    draw_button(draw, content_x + content_width - 80, header_y + 30, "Delete", width=70, height=32, danger=True)

    # Tabs
    tab_y = header_y + 116
    tabs = ["Overview", "Contacts", "Engagements", "Documents", "Activities", "Invoices"]
    tab_x = content_x
    for i, tab in enumerate(tabs):
        is_active = i == 0
        color = COLORS['primary'] if is_active else COLORS['text_secondary']
        draw.text((tab_x, tab_y), tab, fill=color, font=get_font(13, bold=is_active))
        if is_active:
            draw.rectangle((tab_x, tab_y + 24, tab_x + len(tab) * 8, tab_y + 27), fill=COLORS['primary'])
        tab_x += len(tab) * 9 + 32

    draw.line((content_x, tab_y + 28, content_x + content_width, tab_y + 28), fill=COLORS['border'])

    # Content columns
    col1_x = content_x
    col2_x = content_x + content_width // 2 + 16
    col_width = (content_width - 32) // 2
    detail_y = tab_y + 48

    # Company Info Card
    draw_card(draw, col1_x, detail_y, col_width, 180, "Company Information")
    info_items = [
        ("Registration:", "RC-123456"),
        ("TIN:", "1234567890"),
        ("Phone:", "+234 801 234 5678"),
        ("Email:", "info@acme.com"),
    ]
    info_y = detail_y + 52
    for label, value in info_items:
        draw.text((col1_x + 16, info_y), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((col1_x + 120, info_y), value, fill=COLORS['text'], font=get_font(12))
        info_y += 28

    # Quick Stats Card
    draw_card(draw, col2_x, detail_y, col_width, 180, "Quick Stats")
    stats = [
        ("Active Engagements:", "3"),
        ("Deployed Staff:", "12"),
        ("Outstanding:", "N2.5M"),
        ("Total Revenue:", "N45M"),
    ]
    stat_y = detail_y + 52
    for label, value in stats:
        draw.text((col2_x + 16, stat_y), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((col2_x + col_width - 80, stat_y), value, fill=COLORS['text'], font=get_font(12, bold=True))
        stat_y += 28

    return img

def create_pipeline_kanban_wireframe():
    """D.3.1 Pipeline Kanban Board"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=2)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "Sales Pipeline",
                     None, [("+ New Opportunity", True), ("Filter", False)])

    # Summary stats
    stat_y = content_y + 48
    draw_card(draw, content_x, stat_y, content_width, 50)

    stats_text = [
        ("Total Weighted:", "N125.5M", COLORS['primary']),
        ("Unweighted:", "N250M", COLORS['text']),
        ("Opportunities:", "42", COLORS['text']),
    ]
    stat_x = content_x + 24
    for label, value, color in stats_text:
        draw.text((stat_x, stat_y + 10), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((stat_x, stat_y + 28), value, fill=color, font=get_font(14, bold=True))
        stat_x += 200

    # Kanban columns
    kanban_y = stat_y + 70
    col_width = (content_width - 48) // 5
    col_height = HEIGHT - kanban_y - 32

    columns = [
        ("Qualification", "5", "N5M", [
            {"title": "Acme Deal", "value": "N2M", "owner": "John D."},
            {"title": "Echo Ltd", "value": "N3M", "owner": "Jane S."},
        ]),
        ("Needs Analysis", "8", "N15M", [
            {"title": "Beta Corp", "value": "N8M", "owner": "Jane S."},
            {"title": "Foxtrot Inc", "value": "N7M", "owner": "John D."},
        ]),
        ("Proposal Sent", "12", "N35M", [
            {"title": "Delta Co", "value": "N15M", "owner": "Mike B."},
            {"title": "Golf Inc", "value": "N20M", "owner": "Jane S."},
        ]),
        ("Negotiation", "10", "N40M", [
            {"title": "Gamma Corp", "value": "N25M", "owner": "John D."},
        ]),
        ("Closed Won", "7", "N155M", [
            {"title": "Hotel Ltd", "value": "N50M", "owner": "Mike B."},
        ]),
    ]

    col_x = content_x
    for title, count, value, cards in columns:
        draw_kanban_column(draw, col_x, kanban_y, col_width - 8, col_height, title, count, value, cards)
        col_x += col_width + 8

    return img

def create_invoice_list_wireframe():
    """D.5.1 Invoice List Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=5)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "Invoices",
                     "Manage billing and payments", [("+ New Invoice", True)])

    # Filters
    filter_y = content_y + 56
    draw_input(draw, content_x, filter_y, "Search invoices...", width=280)
    draw_dropdown(draw, content_x + 300, filter_y, "Status: All", width=140)
    draw_dropdown(draw, content_x + 460, filter_y, "Client: All", width=180)
    draw_dropdown(draw, content_x + 660, filter_y, "This Month", width=140)

    # Table
    table_y = filter_y + 56
    headers = ["Invoice #", "Client", "Amount", "Status", "Due Date", ""]
    col_widths = [150, 200, 150, 100, 120, 80]
    rows = [
        ["INV-2025-0042", "Acme Corporation", "N2,500,000", ("Paid", "success"), "Nov 15", "..."],
        ["INV-2025-0041", "Beta Industries", "N1,800,000", ("Overdue", "danger"), "Nov 10", "..."],
        ["INV-2025-0040", "Gamma Holdings", "N3,200,000", ("Sent", "info"), "Nov 30", "..."],
        ["INV-2025-0039", "Delta Services", "N950,000", ("Draft", "light"), "—", "..."],
        ["INV-2025-0038", "Acme Corporation", "N2,500,000", ("Partial", "warning"), "Nov 20", "..."],
    ]
    table_height = draw_table(draw, content_x, table_y, content_width, headers, rows, col_widths)

    # Summary
    summary_y = table_y + table_height + 24
    draw_card(draw, content_x, summary_y, content_width, 60)

    summaries = [
        ("Total:", "N10,950,000"),
        ("Paid:", "N2,500,000"),
        ("Outstanding:", "N8,450,000"),
    ]
    sum_x = content_x + 24
    for label, value in summaries:
        draw.text((sum_x, summary_y + 14), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((sum_x, summary_y + 34), value, fill=COLORS['text'], font=get_font(14, bold=True))
        sum_x += 200

    return img

def create_invoice_create_wireframe():
    """D.5.2 Invoice Create Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=5)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "Create Invoice",
                     None, [("Send", True), ("Save Draft", False), ("Preview", False)])

    # Form card
    form_y = content_y + 56
    draw_card(draw, content_x, form_y, content_width, 140)

    # Form fields row 1
    field_y = form_y + 20
    draw.text((content_x + 20, field_y), "Client *", fill=COLORS['text_secondary'], font=get_font(11))
    draw_dropdown(draw, content_x + 20, field_y + 18, "Acme Corporation", width=280)

    draw.text((content_x + 340, field_y), "Engagement", fill=COLORS['text_secondary'], font=get_font(11))
    draw_dropdown(draw, content_x + 340, field_y + 18, "HR Outsourcing - 2024", width=280)

    # Form fields row 2
    field_y += 70
    draw.text((content_x + 20, field_y), "Invoice Date *", fill=COLORS['text_secondary'], font=get_font(11))
    draw_input(draw, content_x + 20, field_y + 18, value="Nov 30, 2025", width=180)

    draw.text((content_x + 220, field_y), "Due Date *", fill=COLORS['text_secondary'], font=get_font(11))
    draw_input(draw, content_x + 220, field_y + 18, value="Dec 30, 2025", width=180)

    draw.text((content_x + 420, field_y), "Payment Terms", fill=COLORS['text_secondary'], font=get_font(11))
    draw_dropdown(draw, content_x + 420, field_y + 18, "Net 30", width=140)

    # Line items table
    items_y = form_y + 160
    draw.text((content_x, items_y), "Line Items", fill=COLORS['text'], font=get_font(14, bold=True))
    draw_button(draw, content_x + content_width - 120, items_y - 4, "+ Add Item", width=110, height=28)

    headers = ["#", "Description", "Qty", "Unit", "Rate", "Total", ""]
    col_widths = [40, 320, 80, 80, 120, 120, 40]
    rows = [
        ["1", "HR Outsourcing - John Smith", "1", "Month", "N350,000", "N350,000", "x"],
        ["2", "HR Outsourcing - Jane Doe", "1", "Month", "N300,000", "N300,000", "x"],
        ["3", "Overtime Hours - November", "24", "Hours", "N5,000", "N120,000", "x"],
    ]
    draw_table(draw, content_x, items_y + 32, content_width, headers, rows, col_widths)

    # Totals
    totals_y = items_y + 220
    totals_x = content_x + content_width - 280

    draw_card(draw, totals_x, totals_y, 280, 140)
    total_items = [
        ("Subtotal:", "N770,000.00"),
        ("VAT (7.5%):", "N57,750.00"),
        ("WHT (5%):", "(N38,500.00)"),
    ]
    ty = totals_y + 16
    for label, value in total_items:
        draw.text((totals_x + 20, ty), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((totals_x + 180, ty), value, fill=COLORS['text'], font=get_font(12))
        ty += 24

    draw.line((totals_x + 20, ty, totals_x + 260, ty), fill=COLORS['border'])
    ty += 12
    draw.text((totals_x + 20, ty), "TOTAL:", fill=COLORS['text'], font=get_font(14, bold=True))
    draw.text((totals_x + 140, ty), "N789,250.00", fill=COLORS['primary'], font=get_font(16, bold=True))

    return img

def create_dashboard_wireframe():
    """D.7 Dashboard Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=0)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw.text((content_x, content_y), "Dashboard", fill=COLORS['text'], font=get_font(24, bold=True))
    draw.text((content_x, content_y + 32), "Welcome back, Gawie!", fill=COLORS['text_secondary'], font=get_font(13))

    # Stat cards
    stat_y = content_y + 64
    stat_width = (content_width - 48) // 4

    stats = [
        ("Active Clients", "42", "+3", True),
        ("Open Leads", "18", "+5", True),
        ("Pipeline Value", "N125.5M", "+12%", True),
        ("Outstanding", "N13.15M", "-8%", False),
    ]

    stat_x = content_x
    for label, value, trend, is_up in stats:
        draw_stat_card(draw, stat_x, stat_y, stat_width, 100, label, value, trend, is_up)
        stat_x += stat_width + 16

    # Row 2: Tasks and Activities
    row2_y = stat_y + 120
    col_width = (content_width - 16) // 2

    # Tasks card
    draw_card(draw, content_x, row2_y, col_width, 200, "My Tasks (5 due today)")
    task_items = [
        ("Follow up with Acme on proposal", "High", "danger"),
        ("Review service logs for billing", "Medium", "warning"),
        ("Send payment reminder", "High", "danger"),
    ]
    task_y = row2_y + 56
    for task, priority, color in task_items:
        draw.ellipse((content_x + 20, task_y + 4, content_x + 32, task_y + 16), fill=None, outline=COLORS['border'], width=2)
        draw.text((content_x + 44, task_y), task, fill=COLORS['text'], font=get_font(12))
        draw_badge(draw, content_x + col_width - 80, task_y, priority, color, small=True)
        task_y += 36

    draw.text((content_x + 20, row2_y + 172), "View All Tasks >", fill=COLORS['primary'], font=get_font(12))

    # Activities card
    draw_card(draw, content_x + col_width + 16, row2_y, col_width, 200, "Recent Activities")
    activity_items = [
        "John created Invoice INV-2025-0043",
        "Jane updated Client: Acme Corp",
        "Mike logged activity on Beta Ind.",
        "Sarah submitted leave request",
    ]
    activity_y = row2_y + 56
    for activity in activity_items:
        draw.ellipse((content_x + col_width + 36, activity_y + 2, content_x + col_width + 48, activity_y + 14), fill=COLORS['primary_light'])
        draw.text((content_x + col_width + 60, activity_y), activity, fill=COLORS['text'], font=get_font(12))
        activity_y += 32

    # Row 3: Pipeline and Aging
    row3_y = row2_y + 220

    # Pipeline summary
    draw_card(draw, content_x, row3_y, col_width, 140, "Pipeline Summary")
    pipeline_data = [
        ("Qualification", 0.12, "N15M"),
        ("Needs Analysis", 0.26, "N32M"),
        ("Proposal Sent", 0.36, "N45M"),
        ("Negotiation", 0.27, "N33.5M"),
    ]
    bar_y = row3_y + 56
    for stage, pct, value in pipeline_data:
        draw.text((content_x + 20, bar_y), stage, fill=COLORS['text_secondary'], font=get_font(11))
        bar_width = int((col_width - 200) * pct)
        draw.rounded_rectangle((content_x + 140, bar_y, content_x + 140 + bar_width, bar_y + 16), radius=4, fill=COLORS['primary'])
        draw.text((content_x + col_width - 60, bar_y), value, fill=COLORS['text'], font=get_font(11))
        bar_y += 24

    # Receivables aging
    draw_card(draw, content_x + col_width + 16, row3_y, col_width, 140, "Receivables Aging")
    aging_data = [
        ("Current:", "N5.2M"),
        ("1-30 Days:", "N3.8M"),
        ("31-60 Days:", "N2.1M"),
        ("60+ Days:", "N2.05M"),
    ]
    aging_y = row3_y + 56
    for label, value in aging_data:
        draw.text((content_x + col_width + 36, aging_y), label, fill=COLORS['text_secondary'], font=get_font(12))
        draw.text((content_x + col_width + 180, aging_y), value, fill=COLORS['text'], font=get_font(12, bold=True))
        aging_y += 24

    return img

def create_task_list_wireframe():
    """D.6.1 Task List Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=6)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "My Tasks",
                     None, [("+ New Task", True), ("Sort", False), ("Filter", False)])

    # Tab filters
    tab_y = content_y + 52
    tabs = [("All", "24"), ("Open", "8"), ("In Progress", "3"), ("Completed", "13")]
    tab_x = content_x
    for i, (tab, count) in enumerate(tabs):
        is_active = i == 1
        bg = COLORS['primary'] if is_active else COLORS['bg']
        fg = COLORS['white'] if is_active else COLORS['text']
        text = f"{tab} ({count})"
        text_width = len(text) * 8 + 24
        draw.rounded_rectangle((tab_x, tab_y, tab_x + text_width, tab_y + 32), radius=16, fill=bg)
        draw.text((tab_x + 12, tab_y + 8), text, fill=fg, font=get_font(12))
        tab_x += text_width + 12

    # Task groups
    group_y = tab_y + 52

    # Today section
    draw.text((content_x, group_y), "TODAY (3)", fill=COLORS['text_secondary'], font=get_font(12, bold=True))
    group_y += 28

    today_tasks = [
        ("Follow up with Acme on proposal response", "Proposal PRP-2025-0023", "High"),
        ("Review service logs for November billing", "Client: Beta Industries", "Medium"),
        ("Send payment reminder to Gamma Holdings", "Invoice INV-2025-0040", "High"),
    ]

    for title, related, priority in today_tasks:
        draw_card(draw, content_x, group_y, content_width, 72)

        # Checkbox
        draw.ellipse((content_x + 20, group_y + 24, content_x + 40, group_y + 44), fill=None, outline=COLORS['border'], width=2)

        draw.text((content_x + 56, group_y + 16), title, fill=COLORS['text'], font=get_font(13, bold=True))
        draw.text((content_x + 56, group_y + 40), related, fill=COLORS['text_secondary'], font=get_font(11))

        badge_color = "danger" if priority == "High" else "warning"
        draw_badge(draw, content_x + content_width - 80, group_y + 24, priority, badge_color)

        group_y += 84

    # This Week section
    group_y += 16
    draw.text((content_x, group_y), "THIS WEEK (5)", fill=COLORS['text_secondary'], font=get_font(12, bold=True))
    group_y += 28

    week_tasks = [
        ("Prepare monthly outsourcing report", "Dec 3"),
        ("Schedule performance review - John Smith", "Dec 4"),
    ]

    for title, due in week_tasks:
        draw_card(draw, content_x, group_y, content_width, 56)
        draw.ellipse((content_x + 20, group_y + 16, content_x + 40, group_y + 36), fill=None, outline=COLORS['border'], width=2)
        draw.text((content_x + 56, group_y + 18), title, fill=COLORS['text'], font=get_font(13))
        draw.text((content_x + content_width - 80, group_y + 18), f"Due: {due}", fill=COLORS['text_secondary'], font=get_font(11))
        group_y += 68

    return img

def create_approval_queue_wireframe():
    """D.6.2 Approval Queue Screen"""
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    sidebar_width = draw_sidebar(draw, WIDTH, HEIGHT, active_item=6)
    draw_header(draw, sidebar_width, 0, WIDTH - sidebar_width)

    content_x = sidebar_width + 32
    content_y = 80
    content_width = WIDTH - sidebar_width - 64

    # Page header
    draw_page_header(draw, content_x, content_y, content_width, "Pending Approvals",
                     "You have 5 pending approvals", [("Refresh", False)])

    # Approval cards
    card_y = content_y + 64

    approvals = [
        ("INVOICE APPROVAL", "Invoice INV-2025-0043 for Acme Corporation - N2,500,000", "John Doe", "2 hours ago", "info"),
        ("LEAVE REQUEST", "Annual Leave: Dec 20-27, 2025 (5 working days)", "Sarah Wilson", "1 day ago", "warning"),
        ("EXPENSE CLAIM", "Travel Expenses: Client visit to Port Harcourt - N85,000", "Mike Brown", "2 days ago", "success"),
    ]

    for title, desc, requester, time, color in approvals:
        draw_card(draw, content_x, card_y, content_width, 120)

        # Icon placeholder
        draw.rounded_rectangle((content_x + 20, card_y + 20, content_x + 60, card_y + 60), radius=8, fill=COLORS[f'{color}_light'])
        draw.ellipse((content_x + 30, card_y + 30, content_x + 50, card_y + 50), fill=None, outline=COLORS[color], width=2)

        # Content
        draw_badge(draw, content_x + 76, card_y + 20, title, color, small=True)
        draw.text((content_x + content_width - 100, card_y + 20), time, fill=COLORS['text_light'], font=get_font(11))

        draw.text((content_x + 76, card_y + 46), desc, fill=COLORS['text'], font=get_font(13))
        draw.text((content_x + 76, card_y + 70), f"Requested by: {requester}", fill=COLORS['text_secondary'], font=get_font(12))

        # Action buttons
        btn_y = card_y + 76
        draw_button(draw, content_x + content_width - 200, btn_y, "Reject", width=80, height=28, outline=True)
        draw_button(draw, content_x + content_width - 100, btn_y, "Approve", width=80, height=28, success=True)

        card_y += 136

    return img

def create_mobile_wireframe():
    """D.8 Mobile Responsive View"""
    img = Image.new('RGB', (MOBILE_WIDTH, MOBILE_HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Mobile header
    draw.rectangle((0, 0, MOBILE_WIDTH, 56), fill=COLORS['sidebar'])
    draw.text((16, 18), "TeamACE", fill=COLORS['white'], font=get_font(18, bold=True))

    # Menu icon
    for i in range(3):
        draw.rectangle((MOBILE_WIDTH - 40, 20 + i*8, MOBILE_WIDTH - 16, 23 + i*8), fill=COLORS['white'])

    # Notification icon
    draw.ellipse((MOBILE_WIDTH - 70, 18, MOBILE_WIDTH - 50, 38), fill=None, outline=COLORS['white'], width=2)

    # Page title
    draw.rectangle((0, 56, MOBILE_WIDTH, 100), fill=COLORS['white'])
    draw.text((16, 70), "Dashboard", fill=COLORS['text'], font=get_font(18, bold=True))

    # Stat cards (2x2)
    card_width = (MOBILE_WIDTH - 48) // 2
    card_height = 80

    stats = [
        ("Active Clients", "42"),
        ("Open Leads", "18"),
        ("Pipeline", "N125M"),
        ("Outstanding", "N13M"),
    ]

    for i, (label, value) in enumerate(stats):
        row = i // 2
        col = i % 2
        x = 16 + col * (card_width + 16)
        y = 116 + row * (card_height + 12)

        draw_card(draw, x, y, card_width, card_height)
        draw.text((x + 12, y + 12), label, fill=COLORS['text_secondary'], font=get_font(11))
        draw.text((x + 12, y + 32), value, fill=COLORS['text'], font=get_font(20, bold=True))

    # Client card example
    client_y = 320
    draw_card(draw, 16, client_y, MOBILE_WIDTH - 32, 140)

    draw_avatar(draw, 32, client_y + 16, 48, "AC")
    draw.text((92, client_y + 20), "Acme Corporation", fill=COLORS['text'], font=get_font(14, bold=True))

    badge_x = 92
    badge_x += draw_badge(draw, badge_x, client_y + 44, "Active", "success", small=True) + 8
    draw_badge(draw, badge_x, client_y + 44, "Technology", "light", small=True)

    draw.line((32, client_y + 72, MOBILE_WIDTH - 48, client_y + 72), fill=COLORS['border'])

    draw.text((32, client_y + 84), "Engagements: 3", fill=COLORS['text'], font=get_font(12))
    draw.text((32, client_y + 104), "Outstanding: N2.5M", fill=COLORS['text'], font=get_font(12))

    # Action buttons
    btn_width = (MOBILE_WIDTH - 80) // 3
    btn_y = client_y + 160
    draw_button(draw, 24, btn_y, "Call", width=btn_width, height=36, outline=True)
    draw_button(draw, 24 + btn_width + 12, btn_y, "Email", width=btn_width, height=36, outline=True)
    draw_button(draw, 24 + (btn_width + 12) * 2, btn_y, "View", width=btn_width, height=36, primary=True)

    # Bottom navigation
    nav_y = MOBILE_HEIGHT - 64
    draw.rectangle((0, nav_y, MOBILE_WIDTH, MOBILE_HEIGHT), fill=COLORS['white'])
    draw.line((0, nav_y, MOBILE_WIDTH, nav_y), fill=COLORS['border'])

    nav_items = ["Home", "Clients", "Tasks", "More"]
    nav_x = MOBILE_WIDTH // 8
    for i, item in enumerate(nav_items):
        is_active = i == 0
        color = COLORS['primary'] if is_active else COLORS['text_secondary']
        draw.ellipse((nav_x - 12, nav_y + 12, nav_x + 12, nav_y + 36), fill=None, outline=color, width=2)
        draw.text((nav_x - len(item) * 3, nav_y + 42), item, fill=color, font=get_font(10))
        nav_x += MOBILE_WIDTH // 4

    return img

def main():
    """Generate all professional wireframes"""
    print("Generating Professional TeamACE CRM-ERP Phase 1 Wireframes...")
    print("=" * 60)

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

    for filename, generator in wireframes:
        try:
            img = generator()
            filepath = os.path.join(OUTPUT_DIR, filename)
            img.save(filepath, 'PNG', quality=95)
            print(f"  Generated: {filename}")
        except Exception as e:
            print(f"  ERROR: {filename} - {e}")

    print("=" * 60)
    print(f"All {len(wireframes)} professional wireframes generated!")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
