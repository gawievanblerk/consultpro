#!/usr/bin/env python3
"""
Professional Diagram Generator for TeamACE CRM-ERP Phase 1 SRS
Creates architecture and ERD diagrams using Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Professional Color Palette
COLORS = {
    'white': '#FFFFFF',
    'bg': '#F8FAFC',
    'primary': '#1976D2',
    'primary_dark': '#0D47A1',
    'primary_light': '#E3F2FD',
    'secondary': '#455A64',
    'success': '#4CAF50',
    'success_light': '#E8F5E9',
    'warning': '#FF9800',
    'warning_light': '#FFF3E0',
    'info': '#00BCD4',
    'info_light': '#E0F7FA',
    'purple': '#7C4DFF',
    'purple_light': '#EDE7F6',
    'text': '#212121',
    'text_secondary': '#757575',
    'border': '#E0E0E0',
    'shadow': '#00000015',
}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def get_font(size=12, bold=False):
    try:
        if bold:
            return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, coords, radius=8, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle(coords, radius=radius, fill=fill, outline=outline, width=width)

def draw_box(draw, x, y, width, height, text, subtext=None, fill_color='#FFFFFF', border_color='#E0E0E0',
             text_color='#212121', radius=12, shadow=True):
    """Draw a professional box with text"""
    # Shadow
    if shadow:
        draw.rounded_rectangle((x+4, y+4, x+width+4, y+height+4), radius=radius, fill=COLORS['shadow'])

    # Main box
    draw.rounded_rectangle((x, y, x+width, y+height), radius=radius, fill=fill_color, outline=border_color, width=2)

    # Text
    font = get_font(14, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = x + (width - text_width) // 2

    if subtext:
        text_y = y + height // 3 - 8
        draw.text((text_x, text_y), text, fill=text_color, font=font)

        font_sub = get_font(11)
        bbox_sub = draw.textbbox((0, 0), subtext, font=font_sub)
        sub_width = bbox_sub[2] - bbox_sub[0]
        sub_x = x + (width - sub_width) // 2
        draw.text((sub_x, text_y + 24), subtext, fill=COLORS['text_secondary'], font=font_sub)
    else:
        text_y = y + (height - 16) // 2
        draw.text((text_x, text_y), text, fill=text_color, font=font)

def draw_arrow(draw, start, end, color='#757575', width=2):
    """Draw an arrow from start to end point"""
    x1, y1 = start
    x2, y2 = end

    # Line
    draw.line([start, end], fill=color, width=width)

    # Arrowhead
    arrow_size = 10
    if y2 > y1:  # Down arrow
        draw.polygon([(x2, y2), (x2-arrow_size//2, y2-arrow_size), (x2+arrow_size//2, y2-arrow_size)], fill=color)
    elif y2 < y1:  # Up arrow
        draw.polygon([(x2, y2), (x2-arrow_size//2, y2+arrow_size), (x2+arrow_size//2, y2+arrow_size)], fill=color)
    elif x2 > x1:  # Right arrow
        draw.polygon([(x2, y2), (x2-arrow_size, y2-arrow_size//2), (x2-arrow_size, y2+arrow_size//2)], fill=color)
    else:  # Left arrow
        draw.polygon([(x2, y2), (x2+arrow_size, y2-arrow_size//2), (x2+arrow_size, y2+arrow_size//2)], fill=color)

def draw_connector_line(draw, points, color='#757575', width=2):
    """Draw a connected line through multiple points"""
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=color, width=width)

def create_architecture_diagram():
    """Create the Platform Architecture Diagram"""
    width = 1000
    height = 700
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Title
    title_font = get_font(20, bold=True)
    draw.text((width//2 - 180, 20), "TeamACE CRM-ERP Platform Architecture", fill=COLORS['primary_dark'], font=title_font)

    # Draw layer boxes
    layer_width = 800
    layer_height = 70
    start_x = (width - layer_width) // 2

    # Layer 1: Presentation Layer
    y = 70
    draw_box(draw, start_x, y, layer_width, layer_height,
             "PRESENTATION LAYER",
             "React 18 + Vite + Tailwind CSS (Responsive Web Application)",
             fill_color=COLORS['primary_light'], border_color=COLORS['primary'],
             text_color=COLORS['primary_dark'])

    # Arrow down
    draw_arrow(draw, (width//2, y + layer_height + 5), (width//2, y + layer_height + 35), COLORS['secondary'])

    # Layer 2: API Gateway
    y = 180
    draw_box(draw, start_x, y, layer_width, layer_height,
             "API GATEWAY LAYER",
             "Express.js REST API + JWT Authentication",
             fill_color=COLORS['info_light'], border_color=COLORS['info'],
             text_color='#006064')

    # Arrow down
    draw_arrow(draw, (width//2, y + layer_height + 5), (width//2, y + layer_height + 35), COLORS['secondary'])

    # Layer 3: Business Logic (multiple boxes)
    y = 290
    module_width = 145
    module_height = 80
    gap = 12
    modules = [
        ("Core CRM", "#E8F5E9", "#4CAF50"),
        ("Business Dev", "#E3F2FD", "#2196F3"),
        ("HR Outsourcing", "#FFF3E0", "#FF9800"),
        ("Finance", "#EDE7F6", "#7C4DFF"),
        ("Collaboration", "#E0F7FA", "#00BCD4"),
    ]

    # Business Logic container
    container_width = len(modules) * module_width + (len(modules) - 1) * gap + 40
    container_x = (width - container_width) // 2
    draw.rounded_rectangle((container_x, y - 10, container_x + container_width, y + module_height + 30),
                          radius=12, fill=None, outline=COLORS['border'], width=2)
    draw.text((container_x + 20, y - 5), "BUSINESS LOGIC LAYER", fill=COLORS['text_secondary'], font=get_font(10, bold=True))

    module_x = container_x + 20
    for name, bg, border in modules:
        draw.rounded_rectangle((module_x, y + 15, module_x + module_width, y + module_height + 15),
                              radius=8, fill=bg, outline=border, width=2)
        font = get_font(11, bold=True)
        bbox = draw.textbbox((0, 0), name, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text((module_x + (module_width - text_w) // 2, y + 40), name, fill=COLORS['text'], font=font)
        module_x += module_width + gap

    # Arrow down
    draw_arrow(draw, (width//2, y + module_height + 35), (width//2, y + module_height + 65), COLORS['secondary'])

    # Layer 4: Data Access
    y = 420
    draw_box(draw, start_x, y, layer_width, layer_height,
             "DATA ACCESS LAYER",
             "Knex.js Query Builder + Connection Pooling",
             fill_color=COLORS['purple_light'], border_color=COLORS['purple'],
             text_color='#4527A0')

    # Arrow down
    draw_arrow(draw, (width//2, y + layer_height + 5), (width//2, y + layer_height + 35), COLORS['secondary'])

    # Layer 5: Database
    y = 530
    draw_box(draw, start_x, y, layer_width, layer_height,
             "DATABASE LAYER",
             "PostgreSQL 15 + Multi-Tenant Schema Separation",
             fill_color=COLORS['success_light'], border_color=COLORS['success'],
             text_color='#1B5E20')

    # Side panels - External Services
    panel_width = 160
    panel_height = 200

    # Left panel - External Services
    left_x = 20
    left_y = 180
    draw.rounded_rectangle((left_x, left_y, left_x + panel_width, left_y + panel_height),
                          radius=12, fill='#FFF8E1', outline='#FFC107', width=2)
    draw.text((left_x + 20, left_y + 10), "External Services", fill='#F57F17', font=get_font(12, bold=True))

    services = ["Email (SMTP)", "File Storage", "PDF Generator", "Notifications"]
    for i, svc in enumerate(services):
        draw.text((left_x + 20, left_y + 40 + i * 35), f"• {svc}", fill=COLORS['text_secondary'], font=get_font(11))

    # Right panel - Security
    right_x = width - panel_width - 20
    draw.rounded_rectangle((right_x, left_y, right_x + panel_width, left_y + panel_height),
                          radius=12, fill='#FFEBEE', outline='#F44336', width=2)
    draw.text((right_x + 35, left_y + 10), "Security Layer", fill='#C62828', font=get_font(12, bold=True))

    security = ["JWT Auth", "RBAC", "Rate Limiting", "Data Encryption"]
    for i, sec in enumerate(security):
        draw.text((right_x + 20, left_y + 40 + i * 35), f"• {sec}", fill=COLORS['text_secondary'], font=get_font(11))

    # Connecting lines from external services
    draw.line([(left_x + panel_width, 280), (start_x, 280)], fill='#FFC107', width=2)
    draw.line([(right_x, 280), (start_x + layer_width, 280)], fill='#F44336', width=2)

    # Footer note
    draw.text((start_x, height - 40), "Multi-tenant architecture with schema-based isolation per organization",
              fill=COLORS['text_secondary'], font=get_font(11))

    return img

def create_erd_diagram():
    """Create the Entity Relationship Diagram"""
    width = 1100
    height = 800
    img = Image.new('RGB', (width, height), COLORS['bg'])
    draw = ImageDraw.Draw(img)

    # Title
    title_font = get_font(20, bold=True)
    draw.text((width//2 - 150, 20), "Phase 1 Entity Relationship Diagram", fill=COLORS['primary_dark'], font=title_font)

    # Entity box dimensions
    entity_w = 140
    entity_h = 50

    # Define entities with positions
    entities = {
        'LEADS': (100, 120, COLORS['warning_light'], '#EF6C00'),
        'OPPORTUNITIES': (100, 280, COLORS['info_light'], '#0097A7'),
        'PROPOSALS': (100, 440, COLORS['purple_light'], '#7B1FA2'),
        'CLIENTS': (400, 200, COLORS['success_light'], '#388E3C'),
        'CONTACTS': (400, 360, COLORS['primary_light'], '#1565C0'),
        'ENGAGEMENTS': (700, 200, '#FCE4EC', '#C2185B'),
        'ASSIGNMENTS': (700, 360, '#FFF3E0', '#E65100'),
        'INVOICES': (700, 520, '#E8F5E9', '#2E7D32'),
        'DEPLOYMENTS': (950, 360, '#E1F5FE', '#0277BD'),
        'SERVICE_LOGS': (950, 520, '#F3E5F5', '#7B1FA2'),
    }

    # Draw entities
    for name, (x, y, fill, border) in entities.items():
        draw.rounded_rectangle((x, y, x + entity_w, y + entity_h), radius=8,
                              fill=fill, outline=border, width=2)
        # Shadow
        draw.rounded_rectangle((x+3, y+3, x + entity_w + 3, y + entity_h + 3), radius=8,
                              fill=COLORS['shadow'])
        draw.rounded_rectangle((x, y, x + entity_w, y + entity_h), radius=8,
                              fill=fill, outline=border, width=2)

        font = get_font(12, bold=True)
        bbox = draw.textbbox((0, 0), name, font=font)
        text_w = bbox[2] - bbox[0]
        draw.text((x + (entity_w - text_w) // 2, y + 17), name, fill=COLORS['text'], font=font)

    # Draw relationships with labels
    def draw_relationship(start_entity, end_entity, label, start_side='right', end_side='left', offset=0):
        sx, sy, _, _ = entities[start_entity]
        ex, ey, _, _ = entities[end_entity]

        if start_side == 'right':
            sx += entity_w
            sy += entity_h // 2 + offset
        elif start_side == 'bottom':
            sx += entity_w // 2 + offset
            sy += entity_h
        elif start_side == 'left':
            sy += entity_h // 2 + offset
        else:  # top
            sx += entity_w // 2 + offset

        if end_side == 'left':
            ey += entity_h // 2 + offset
        elif end_side == 'top':
            ex += entity_w // 2 + offset
        elif end_side == 'right':
            ex += entity_w
            ey += entity_h // 2 + offset
        else:  # bottom
            ex += entity_w // 2 + offset
            ey += entity_h

        # Draw line with label
        mid_x = (sx + ex) // 2
        mid_y = (sy + ey) // 2

        draw.line([(sx, sy), (ex, ey)], fill=COLORS['text_secondary'], width=2)

        # Draw arrowhead at end
        if end_side == 'left':
            draw.polygon([(ex, ey), (ex+8, ey-5), (ex+8, ey+5)], fill=COLORS['text_secondary'])
        elif end_side == 'top':
            draw.polygon([(ex, ey), (ex-5, ey+8), (ex+5, ey+8)], fill=COLORS['text_secondary'])
        elif end_side == 'right':
            draw.polygon([(ex, ey), (ex-8, ey-5), (ex-8, ey+5)], fill=COLORS['text_secondary'])
        else:
            draw.polygon([(ex, ey), (ex-5, ey-8), (ex+5, ey-8)], fill=COLORS['text_secondary'])

        # Label background
        label_font = get_font(10)
        bbox = draw.textbbox((0, 0), label, font=label_font)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        draw.rectangle((mid_x - lw//2 - 4, mid_y - lh//2 - 2, mid_x + lw//2 + 4, mid_y + lh//2 + 4),
                      fill=COLORS['white'])
        draw.text((mid_x - lw//2, mid_y - lh//2), label, fill=COLORS['text_secondary'], font=label_font)

    # Draw relationships
    # LEADS -> OPPORTUNITIES
    draw.line([(170, 170), (170, 270)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(170, 270), (165, 262), (175, 262)], fill=COLORS['text_secondary'])
    draw.text((130, 210), "creates", fill=COLORS['text_secondary'], font=get_font(10))

    # LEADS -> CLIENTS (converts)
    draw.line([(240, 145), (400, 225)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(400, 225), (392, 220), (394, 230)], fill=COLORS['text_secondary'])
    draw.text((290, 165), "converts", fill=COLORS['text_secondary'], font=get_font(10))

    # OPPORTUNITIES -> CLIENTS
    draw.line([(240, 305), (400, 250)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(400, 250), (392, 248), (394, 258)], fill=COLORS['text_secondary'])

    # OPPORTUNITIES -> PROPOSALS
    draw.line([(170, 330), (170, 430)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(170, 430), (165, 422), (175, 422)], fill=COLORS['text_secondary'])
    draw.text((125, 375), "generates", fill=COLORS['text_secondary'], font=get_font(10))

    # CLIENTS -> CONTACTS
    draw.line([(470, 250), (470, 350)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(470, 350), (465, 342), (475, 342)], fill=COLORS['text_secondary'])
    draw.text((480, 295), "has", fill=COLORS['text_secondary'], font=get_font(10))

    # CLIENTS -> ENGAGEMENTS
    draw.line([(540, 225), (700, 225)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(700, 225), (692, 220), (692, 230)], fill=COLORS['text_secondary'])
    draw.text((600, 205), "signs", fill=COLORS['text_secondary'], font=get_font(10))

    # ENGAGEMENTS -> ASSIGNMENTS
    draw.line([(770, 250), (770, 350)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(770, 350), (765, 342), (775, 342)], fill=COLORS['text_secondary'])
    draw.text((780, 295), "has", fill=COLORS['text_secondary'], font=get_font(10))

    # ENGAGEMENTS -> INVOICES
    draw.line([(770, 250), (770, 510)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(770, 510), (765, 502), (775, 502)], fill=COLORS['text_secondary'])
    draw.text((720, 420), "generates", fill=COLORS['text_secondary'], font=get_font(10))

    # ASSIGNMENTS -> DEPLOYMENTS
    draw.line([(840, 385), (950, 385)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(950, 385), (942, 380), (942, 390)], fill=COLORS['text_secondary'])
    draw.text((875, 365), "has", fill=COLORS['text_secondary'], font=get_font(10))

    # ASSIGNMENTS -> SERVICE_LOGS
    draw.line([(840, 410), (950, 520)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(950, 520), (942, 516), (946, 526)], fill=COLORS['text_secondary'])
    draw.text((870, 460), "logs", fill=COLORS['text_secondary'], font=get_font(10))

    # PROPOSALS -> ENGAGEMENTS (when accepted)
    draw.line([(240, 465), (600, 465), (600, 250), (700, 250)], fill=COLORS['text_secondary'], width=2)
    # Multi-segment line
    draw.line([(240, 465), (600, 465)], fill=COLORS['text_secondary'], width=2)
    draw.line([(600, 465), (600, 250)], fill=COLORS['text_secondary'], width=2)
    draw.line([(600, 250), (700, 250)], fill=COLORS['text_secondary'], width=2)
    draw.polygon([(700, 250), (692, 245), (692, 255)], fill=COLORS['text_secondary'])
    draw.text((380, 445), "becomes (when accepted)", fill=COLORS['text_secondary'], font=get_font(10))

    # Legend
    legend_y = 650
    draw.text((50, legend_y), "Legend:", fill=COLORS['text'], font=get_font(12, bold=True))

    legend_items = [
        ("CRM Entities", COLORS['success_light'], '#388E3C'),
        ("Sales Pipeline", COLORS['warning_light'], '#EF6C00'),
        ("HR Operations", '#FFF3E0', '#E65100'),
        ("Finance", '#E8F5E9', '#2E7D32'),
    ]

    lx = 120
    for label, fill, border in legend_items:
        draw.rounded_rectangle((lx, legend_y - 5, lx + 20, legend_y + 15), radius=4, fill=fill, outline=border, width=2)
        draw.text((lx + 30, legend_y - 2), label, fill=COLORS['text_secondary'], font=get_font(11))
        lx += 180

    # Cardinality note
    draw.text((50, height - 50), "All relationships show primary key → foreign key direction. Multi-tenant isolation via organization_id.",
              fill=COLORS['text_secondary'], font=get_font(11))

    return img

def main():
    """Generate all technical diagrams"""
    print("Generating Professional Technical Diagrams...")
    print("=" * 50)

    diagrams = [
        ("architecture_diagram.png", create_architecture_diagram),
        ("erd_diagram.png", create_erd_diagram),
    ]

    for filename, generator in diagrams:
        try:
            img = generator()
            filepath = os.path.join(OUTPUT_DIR, filename)
            img.save(filepath, 'PNG', quality=95)
            print(f"  Generated: {filename}")
        except Exception as e:
            print(f"  ERROR: {filename} - {e}")
            import traceback
            traceback.print_exc()

    print("=" * 50)
    print(f"All diagrams generated in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
